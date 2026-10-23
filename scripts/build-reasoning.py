#!/usr/bin/env python3
"""Record a small reasoning model with its thinking switched off and on, for Ch 25 (tier T0).

Usage: scripts/.venv/bin/python scripts/build-reasoning.py

Writes static/reasoning/thinking.json: for each puzzle, the model's reply with thinking off, and its
thinking plus reply with thinking on. Sampled with Qwen's recommended settings and a fixed seed.
"""

from __future__ import annotations

import datetime
import json
import re
from pathlib import Path

import torch
from transformers import AutoModelForCausalLM, AutoTokenizer
from transformers.utils import cached_file

ROOT = Path(__file__).resolve().parent.parent
MODEL = "Qwen/Qwen3-0.6B"
SEED = 1
# Qwen3 model card: recommended sampling for each mode.
SETTINGS = {
    False: {"temperature": 0.7, "top_p": 0.8, "top_k": 20, "max_new_tokens": 400},
    True: {"temperature": 0.6, "top_p": 0.95, "top_k": 20, "max_new_tokens": 6000},
}
# The model card's suggested way to get a final answer that can be checked automatically.
SUFFIX = " Put your final answer within \\boxed{}."
PUZZLES = [
    {
        "question": "A bat and a ball cost $1.10 in total. The bat costs $1.00 more than the ball. How much does the ball cost?",
        "answer": "5 cents",
        "pattern": r"^\$?0?\.05|^5\s*(cents)?$|^five cents",
    },
    {
        "question": "If it takes 5 machines 5 minutes to make 5 widgets, how long would it take 100 machines to make 100 widgets?",
        "answer": "5 minutes",
        "pattern": r"^5\b(?!0)|^five",
    },
    {
        "question": "How many times does the letter r appear in the word strawberry?",
        "answer": "3",
        "pattern": r"^3\b|^three",
    },
    {
        "question": "What is 17 × 24?",
        "answer": "408",
        "pattern": r"^408\b",
    },
    {
        "question": "Sally has 3 brothers. Each of her brothers has 2 sisters. How many sisters does Sally have?",
        "answer": "1",
        "pattern": r"^1\b|^one",
    },
    {
        "question": "I have 3 apples. I eat one, then buy 4 more, then give half of my apples to a friend. How many apples do I have now?",
        "answer": "3",
        "pattern": r"^3\b|^three",
    },
]


def boxed(text: str) -> str | None:
    """The contents of the last \\boxed{...}, allowing one level of nested braces."""
    found = re.findall(r"\\boxed\{((?:[^{}]|\{[^{}]*\})*)\}", text)
    if not found:
        return None
    return re.sub(r"\\text\{([^}]*)\}|[\\$ ]", lambda m: m.group(1) or "", found[-1]).strip()


def revision(model_id: str) -> str | None:
    path = Path(cached_file(model_id, "config.json"))
    return path.parent.name if path.parent.parent.name == "snapshots" else None


def main() -> None:
    device = "mps" if torch.backends.mps.is_available() else "cpu"
    tokenizer = AutoTokenizer.from_pretrained(MODEL)
    model = AutoModelForCausalLM.from_pretrained(MODEL, dtype=torch.float32).to(device).eval()
    end_think = tokenizer.convert_tokens_to_ids("</think>")

    def run(question: str, thinking: bool) -> dict:
        prompt = tokenizer.apply_chat_template(
            [{"role": "user", "content": question + SUFFIX}],
            tokenize=False,
            add_generation_prompt=True,
            enable_thinking=thinking,
        )
        ids = tokenizer(prompt, return_tensors="pt").input_ids.to(device)
        torch.manual_seed(SEED)
        settings = SETTINGS[thinking]
        with torch.no_grad():
            out = model.generate(ids, do_sample=True, pad_token_id=tokenizer.eos_token_id, **settings)
        new = out[0, ids.shape[1] :].tolist()
        stopped = bool(new) and new[-1] in {tokenizer.eos_token_id, tokenizer.convert_tokens_to_ids("<|im_end|>")}
        if stopped:
            new = new[:-1]
        start_think = tokenizer.convert_tokens_to_ids("<think>")
        if end_think in new:
            split = new.index(end_think) + 1
        else:
            # Ran out of room while still thinking: it never got to an answer.
            split = len(new) if thinking and new[:1] == [start_think] else 0
        think_ids, answer_ids = new[:split], new[split:]
        think = tokenizer.decode(think_ids).replace("<think>", "").replace("</think>", "").strip()
        answer = tokenizer.decode(answer_ids).strip()
        return {
            "thinking": think,
            "thinkingTokens": len(think_ids),
            "answer": answer,
            "answerTokens": len(answer_ids),
            "final": boxed(answer),
            "stopped": stopped,
        }

    puzzles = []
    for puzzle in PUZZLES:
        entry = {"question": puzzle["question"], "expected": puzzle["answer"]}
        for key, thinking in [("off", False), ("on", True)]:
            result = run(puzzle["question"], thinking)
            result["correct"] = bool(
                result["final"] and re.search(puzzle["pattern"], result["final"], re.IGNORECASE)
            )
            entry[key] = result
            print(
                f"{key:3} {puzzle['answer']:>9} final={result['final']!r} correct={result['correct']}"
                f" think={result['thinkingTokens']} answer={result['answerTokens']} stopped={result['stopped']}"
            )
        puzzles.append(entry)

    data = {
        "version": 1,
        "model": {"id": MODEL, "displayName": "Qwen3-0.6B", "revision": revision(MODEL)},
        "settings": {"off": SETTINGS[False], "on": SETTINGS[True], "seed": SEED, "suffix": SUFFIX},
        "puzzles": puzzles,
        "generatedAt": datetime.date.today().isoformat(),
        "source": {"torch": torch.__version__, "device": device},
    }
    out = ROOT / "static" / "reasoning" / "thinking.json"
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps(data, ensure_ascii=False, indent="\t") + "\n")
    print(out.relative_to(ROOT))


if __name__ == "__main__":
    main()
