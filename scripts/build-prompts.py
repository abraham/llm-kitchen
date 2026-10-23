#!/usr/bin/env python3
"""Record how prompts change model behavior, for Part VIII (tier T0).

Usage: scripts/.venv/bin/python scripts/build-prompts.py

Uses only models other scripts already download: GPT-2 small (the canonical model) and
Qwen2.5-1.5B-Instruct (Part VI). Greedy decoding throughout, so reruns match. Writes
static/prompts/:
  wording.json  Ch 28: GPT-2's next-token guesses for prompt variants, and where its last token looks
  fewshot.json  Ch 29: GPT-2 on made-up tasks with 0-4 examples, and its strongest induction head
  system.json   Ch 30: Qwen with different system prompts
  steps.json    Ch 31: Qwen on the Ch 27 puzzles, plain, step by step, and with a fixed format
  fragile.json  Ch 32: example order and format (GPT-2), and a fact's position in a long prompt (Qwen)
"""

from __future__ import annotations

import datetime
import itertools
import json
import re
from pathlib import Path

import torch
from transformers import AutoModelForCausalLM, AutoTokenizer
from transformers.utils import cached_file

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "static" / "prompts"
CANONICAL = json.loads((ROOT / "models" / "canonical.json").read_text())
GPT2 = CANONICAL["huggingFaceId"]
QWEN = "Qwen/Qwen2.5-1.5B-Instruct"
QWEN_NAME = "Qwen2.5-1.5B-Instruct"
DEVICE = "mps" if torch.backends.mps.is_available() else "cpu"


def revision(model_id: str) -> str | None:
    path = Path(cached_file(model_id, "config.json"))
    return path.parent.name if path.parent.parent.name == "snapshots" else None


def write(name: str, data: dict) -> None:
    data["generatedAt"] = datetime.date.today().isoformat()
    data["source"] = {"torch": torch.__version__}
    OUT.mkdir(parents=True, exist_ok=True)
    (OUT / name).write_text(json.dumps(data, ensure_ascii=False, indent="\t") + "\n")
    print("wrote", (OUT / name).relative_to(ROOT))


# --- GPT-2 helpers --------------------------------------------------------------------------------

gpt_tok = AutoTokenizer.from_pretrained(GPT2)
gpt = AutoModelForCausalLM.from_pretrained(GPT2, dtype=torch.float32, attn_implementation="eager").eval()
GPT2_INFO = {"id": GPT2, "displayName": CANONICAL["displayName"], "revision": revision(GPT2)}


def gpt_run(text: str):
    ids = gpt_tok(text, return_tensors="pt").input_ids
    with torch.no_grad():
        out = gpt(ids, output_attentions=True)
    probs = out.logits[0, -1].softmax(-1)
    # attentions: one (1, heads, seq, seq) tensor per layer
    att = torch.stack([a[0] for a in out.attentions])  # layers, heads, seq, seq
    return ids[0].tolist(), probs, att


def gpt_top(probs: torch.Tensor, k: int = 10) -> list[dict]:
    values, ids = probs.topk(k)
    return [{"text": gpt_tok.decode([int(i)]), "id": int(i), "p": round(float(v), 5)} for v, i in zip(values, ids)]


def gpt_tokens(ids: list[int]) -> list[dict]:
    return [{"text": gpt_tok.decode([i]), "id": i} for i in ids]


def p_of(probs: torch.Tensor, text: str) -> float:
    """Probability of the first token of `text`."""
    return float(probs[gpt_tok(text).input_ids[0]])


def answer_prob(model, tok, prompt: str, answer: str) -> float:
    """Probability that the model continues `prompt` with every token of `answer`."""
    p_ids = tok(prompt, return_tensors="pt", add_special_tokens=False).input_ids
    a_ids = tok(answer, return_tensors="pt", add_special_tokens=False).input_ids
    ids = torch.cat([p_ids, a_ids], dim=1).to(model.device)
    with torch.no_grad():
        logp = model(ids).logits[0].float().log_softmax(-1)
    start = p_ids.shape[1]
    return float(sum(logp[start - 1 + j, t] for j, t in enumerate(a_ids[0].tolist())).exp())


# --- Ch 28: wording ----------------------------------------------------------------------------

WORDING = [
    {
        "name": "Set the scene",
        "watch": [" floor", " bed", " table", " sand"],
        "variants": [
            "The cat sat on the",
            "In the kitchen, the cat sat on the",
            "It was bedtime, and the cat sat on the",
            "At the beach, the cat sat on the",
        ],
    },
    {
        "name": "Frame a question",
        "watch": [" Paris"],
        "variants": [
            "France capital",
            "What is the capital of France?",
            "Q: What is the capital of France?\nA:",
            "The capital of France is",
        ],
    },
]


def wording() -> None:
    groups = []
    for group in WORDING:
        variants = []
        for text in group["variants"]:
            ids, probs, att = gpt_run(text)
            # Where the last token looks, averaged over every head in every layer. The first token
            # soaks up most attention in GPT-2 (an "attention sink"), so it is left out and the rest
            # are rescaled to add up to 1.
            row = att[:, :, -1, :].mean(dim=(0, 1))
            first = float(row[0])
            row[0] = 0
            row = row / row.sum()
            variants.append(
                {
                    "text": text,
                    "tokens": gpt_tokens(ids),
                    "firstTokenShare": round(first, 4),
                    "attention": [round(float(a), 4) for a in row],
                    "top": gpt_top(probs),
                    "watch": {w: round(p_of(probs, w), 5) for w in group["watch"]},
                }
            )
            print(f"{text!r:45}", [(c["text"], c["p"]) for c in variants[-1]["top"][:4]], variants[-1]["watch"])
        groups.append({"name": group["name"], "watch": group["watch"], "variants": variants})
    write("wording.json", {"version": 1, "model": GPT2_INFO, "groups": groups})


# --- Ch 29: few-shot ------------------------------------------------------------------------------

FEWSHOT = [
    {
        "name": "Opposites",
        "examples": [("hot", "cold"), ("big", "small"), ("up", "down"), ("fast", "slow")],
        "tests": [("happy", "sad"), ("light", "dark"), ("open", "closed"), ("old", "young")],
    },
    {
        # A rule no one could know without the examples: fruits are "blip", animals are "zork".
        "name": "Made-up labels",
        "examples": [("apple", "blip"), ("dog", "zork"), ("banana", "blip"), ("cat", "zork")],
        "tests": [("pear", "blip"), ("horse", "zork"), ("cherry", "blip"), ("mouse", "zork")],
    },
]
SHOTS = [0, 1, 2, 4]


def fewshot_prompt(examples, query: str) -> str:
    return "".join(f"{a} -> {b}\n" for a, b in examples) + f"{query} ->"


def induction_head(ids: list[int], att: torch.Tensor) -> tuple[int, int, float]:
    """The head whose last token looks most at the tokens right after earlier arrows."""
    arrow = gpt_tok(" ->").input_ids[0]
    after = [i + 1 for i, t in enumerate(ids[:-1]) if t == arrow and i + 1 < len(ids) - 1]
    score = att[:, :, -1, after].sum(-1)  # layers, heads
    layer, head = divmod(int(score.argmax()), score.shape[1])
    return layer, head, float(score[layer, head])


def fewshot() -> None:
    tasks = []
    for task in FEWSHOT:
        tests = []
        for query, answer in task["tests"]:
            runs = []
            for k in SHOTS:
                text = fewshot_prompt(task["examples"][:k], query)
                _, probs, _ = gpt_run(text)
                runs.append(
                    {
                        "shots": k,
                        "text": text,
                        "gpt2": round(answer_prob(gpt, gpt_tok, text, " " + answer), 5),
                        "qwen": round(answer_prob(qwen, qwen_tok, text, " " + answer), 5),
                        "gpt2Top": gpt_top(probs, 5),
                    }
                )
            tests.append({"query": query, "answer": answer, "runs": runs})
            print(task["name"], query, [(r["shots"], r["gpt2"], r["qwen"]) for r in runs])
        # The strongest induction-like head on the full prompt for the first test word.
        text = fewshot_prompt(task["examples"], task["tests"][0][0])
        ids, _, att = gpt_run(text)
        layer, head, score = induction_head(ids, att)
        print(task["name"], "induction head", f"{layer}.{head}", round(score, 3))
        tasks.append(
            {
                "name": task["name"],
                "examples": [list(e) for e in task["examples"]],
                "tests": tests,
                "head": {
                    "layer": layer,
                    "head": head,
                    "text": text,
                    "tokens": gpt_tokens(ids),
                    "attention": [round(float(a), 4) for a in att[layer, head, -1]],
                    "score": round(score, 4),
                },
            }
        )
    write(
        "fewshot.json",
        {"version": 1, "models": {"gpt2": GPT2_INFO, "qwen": QWEN_INFO}, "shots": SHOTS, "tasks": tasks},
    )


# --- Qwen helpers ------------------------------------------------------------------------------

qwen_tok = AutoTokenizer.from_pretrained(QWEN)
qwen = AutoModelForCausalLM.from_pretrained(QWEN, dtype=torch.float32).to(DEVICE).eval()
QWEN_INFO = {"id": QWEN, "displayName": QWEN_NAME, "revision": revision(QWEN)}


def chat(user: str, system: str | None = None) -> str:
    messages = ([{"role": "system", "content": system}] if system else []) + [{"role": "user", "content": user}]
    return qwen_tok.apply_chat_template(messages, tokenize=False, add_generation_prompt=True)


def qwen_reply(prompt: str, max_new_tokens: int = 400) -> dict:
    ids = qwen_tok(prompt, return_tensors="pt").input_ids.to(DEVICE)
    with torch.no_grad():
        out = qwen.generate(ids, max_new_tokens=max_new_tokens, do_sample=False, pad_token_id=qwen_tok.eos_token_id)
    new = out[0, ids.shape[1] :].tolist()
    stopped = bool(new) and new[-1] in {qwen_tok.eos_token_id, qwen_tok.convert_tokens_to_ids("<|im_end|>")}
    if stopped:
        new = new[:-1]
    return {"text": qwen_tok.decode(new).strip(), "tokens": len(new), "stopped": stopped}


def qwen_answer_prob(prompt: str, answer: str) -> float:
    """Probability of the reply starting with `answer` (every one of its tokens)."""
    return answer_prob(qwen, qwen_tok, prompt, answer)


# --- Ch 30: system prompts ------------------------------------------------------------------------

QWEN_DEFAULT = "You are Qwen, created by Alibaba Cloud. You are a helpful assistant."
SYSTEMS = [
    {"name": "Default", "system": None},
    {"name": "A persona", "system": "You are a world-famous physicist."},
    {
        "name": "Specific instructions",
        "system": "Answer in two short sentences that a ten-year-old can follow, then give one everyday example.",
    },
]
QUESTION = "Why is the sky blue?"
PERSONA = "You are a brilliant mathematician who never makes mistakes."
MATH = [(47, 38), (63, 29), (84, 57), (125, 16), (238, 47), (19, 99), (356, 24), (73, 73)]


def numbers(text: str) -> list[str]:
    return re.findall(r"-?\d[\d,]*", text.replace(",", ""))


def system() -> None:
    replies = []
    for s in SYSTEMS:
        prompt = chat(QUESTION, s["system"])
        reply = qwen_reply(prompt, 250)
        replies.append({"name": s["name"], "system": s["system"] or QWEN_DEFAULT, "prompt": prompt, **reply})
        print(s["name"], reply["tokens"], repr(reply["text"][:120]))
    math = []
    for a, b in MATH:
        q = f"What is {a} × {b}? Reply with only the number."
        row = {"question": q, "expected": a * b}
        for key, sys in [("default", None), ("persona", PERSONA)]:
            reply = qwen_reply(chat(q, sys), 30)
            found = numbers(reply["text"])
            row[key] = {"text": reply["text"], "correct": bool(found) and found[-1] == str(a * b)}
        math.append(row)
        print(q, row["default"]["text"], row["persona"]["text"])
    write(
        "system.json",
        {
            "version": 1,
            "model": QWEN_INFO,
            "question": QUESTION,
            "replies": replies,
            "persona": PERSONA,
            "math": math,
        },
    )


# --- Ch 31: steps and format ----------------------------------------------------------------------

PUZZLES = json.loads((ROOT / "static" / "reasoning" / "thinking.json").read_text())["puzzles"]
CONDITIONS = [
    {"name": "Just the answer", "suffix": " Reply with only the final answer, nothing else."},
    {"name": "Step by step", "suffix": " Let's think step by step."},
    {
        "name": "Steps, then a fixed format",
        "suffix": " Think step by step, then write the final answer on its own last line as: Answer: <answer>",
    },
]


# Graded by hand: the replies don't share a format, so no rule reads them all fairly. Each grade
# names a phrase from the reply it was given for, and the script stops if a rerun changes the reply.
GRADES = [
    [(False, "0.10"), (False, "$0.10 for the bat"), (True, "**$0.05**")],
    [(True, "5 minutes"), (False, "0.2 minutes"), (True, "the answer is: 5 minutes")],
    [(True, "3"), (True, "appears 3 times"), (True, "Answer: 3")],
    [(True, "408"), (True, "= 408"), (False, "= 368.")],
    [(True, "1"), (True, "**one sister**"), (False, "2 sisters")],
    [(False, "2"), (True, "end up with 3 apples"), (True, "**3**")],
]


def follows_format(condition: int, text: str) -> bool:
    """Could a program read the answer without guessing?"""
    if condition == 0:
        return len(text) <= 30
    if condition == 2:
        return bool(re.search(r"^\**answer:?\**:?\s*\S", text.splitlines()[-1], re.IGNORECASE))
    return False


def steps() -> None:
    puzzles = []
    for q, p in enumerate(PUZZLES):
        entry = {"question": p["question"], "expected": p["expected"], "runs": []}
        for i, c in enumerate(CONDITIONS):
            reply = qwen_reply(chat(p["question"] + c["suffix"]), 500)
            correct, phrase = GRADES[q][i]
            assert phrase in reply["text"], f"reply changed for puzzle {q}, {c['name']}: {reply['text'][-200:]!r}"
            entry["runs"].append(
                {"condition": c["name"], **reply, "correct": correct, "formatted": follows_format(i, reply["text"])}
            )
            print(f"{c['name']:28} {p['expected']:>9} correct={correct} formatted={entry['runs'][-1]['formatted']} tokens={reply['tokens']}")
        puzzles.append(entry)
    write("steps.json", {"version": 1, "model": QWEN_INFO, "conditions": CONDITIONS, "puzzles": puzzles})


# --- Ch 32: where prompts break ------------------------------------------------------------------

SENTIMENT_EXAMPLES = [
    ("A delight from start to finish.", "positive"),
    ("I want my two hours back.", "negative"),
    ("The best meal I've had all year.", "positive"),
    ("Cold food and a rude waiter.", "negative"),
]
SENTIMENT_TESTS = [
    ("Wonderful acting and a clever story.", "positive"),
    ("The battery died after a day.", "negative"),
    ("I would happily go back again.", "positive"),
    ("Boring, slow, and far too long.", "negative"),
    ("Friendly staff and great coffee.", "positive"),
    ("It broke the first time I used it.", "negative"),
    ("A charming little book.", "positive"),
    ("Never buying from them again.", "negative"),
]
FORMATS = [
    {"name": "Review: … Sentiment: …", "line": "Review: {x}\nSentiment: {y}\n", "query": "Review: {x}\nSentiment:"},
    {"name": "… → …", "line": "{x} -> {y}\n", "query": "{x} ->"},
    {"name": "input: … output: …", "line": "input: {x} output: {y}\n", "query": "input: {x} output:"},
    {"name": "Text / label in brackets", "line": "[{x}] [{y}]\n", "query": "[{x}] ["},
]


def classify(examples, fmt) -> list[bool]:
    results = []
    for x, y in SENTIMENT_TESTS:
        text = "".join(fmt["line"].format(x=a, y=b) for a, b in examples) + fmt["query"].format(x=x)
        _, probs, _ = gpt_run(text)
        sep = "" if fmt["query"].endswith("[") else " "
        guess = "positive" if p_of(probs, sep + "positive") > p_of(probs, sep + "negative") else "negative"
        results.append(guess == y)
    return results


NAMES = [
    "Ava", "Ben", "Cleo", "Dev", "Eli", "Fay", "Gus", "Hana", "Ivan", "Jo", "Kai", "Lena", "Max", "Nia",
    "Omar", "Pia", "Quin", "Rosa", "Sam", "Tara", "Uma", "Vic", "Wes", "Xena", "Yuri", "Zoe",
    "Abe", "Bea", "Cy", "Dot",
]


def lockers() -> list[tuple[str, int]]:
    g = torch.Generator().manual_seed(7)
    nums = torch.randperm(900, generator=g)[: len(NAMES)] + 100
    return list(zip(NAMES, [int(n) for n in nums]))


def fragile() -> None:
    orders = []
    fmt = FORMATS[0]
    for perm in itertools.permutations(range(len(SENTIMENT_EXAMPLES))):
        examples = [SENTIMENT_EXAMPLES[i] for i in perm]
        ok = classify(examples, fmt)
        orders.append({"order": list(perm), "correct": sum(ok)})
    print("orders: correct counts", sorted(o["correct"] for o in orders))
    formats = []
    for f in FORMATS:
        ok = classify(SENTIMENT_EXAMPLES, f)
        formats.append({"name": f["name"], "example": f["line"].format(x=SENTIMENT_EXAMPLES[0][0], y=SENTIMENT_EXAMPLES[0][1]), "correct": sum(ok)})
        print("format", f["name"], sum(ok))

    facts = lockers()
    targets = ["Lena", "Gus", "Tara", "Bea", "Omar", "Cleo", "Yuri", "Hana"]
    positions = list(range(0, len(facts), 3)) + [len(facts) - 1]
    position_runs = []
    for name in targets:
        number = dict(facts)[name]
        others = [f for f in facts if f[0] != name]
        row = {"name": name, "number": number, "points": []}
        for pos in positions:
            listing = others[:pos] + [(name, number)] + others[pos:]
            text = "\n".join(f"{n}'s locker number is {num}." for n, num in listing)
            prompt = chat(f"{text}\n\nWhat is {name}'s locker number? Reply with only the number.")
            row["points"].append({"position": pos, "p": round(qwen_answer_prob(prompt, str(number)), 4)})
        position_runs.append(row)
        print("position", name, [(pt["position"], pt["p"]) for pt in row["points"]])
    write(
        "fragile.json",
        {
            "version": 1,
            "models": {"gpt2": GPT2_INFO, "qwen": QWEN_INFO},
            "sentiment": {
                "examples": [list(e) for e in SENTIMENT_EXAMPLES],
                "tests": [list(t) for t in SENTIMENT_TESTS],
                "orders": orders,
                "formats": formats,
            },
            "position": {"facts": len(facts), "positions": positions, "runs": position_runs},
        },
    )


if __name__ == "__main__":
    import sys

    jobs = {"wording": wording, "fewshot": fewshot, "system": system, "steps": steps, "fragile": fragile}
    for name in sys.argv[1:] or jobs:
        jobs[name]()
