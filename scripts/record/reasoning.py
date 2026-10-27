"""Record a small reasoning model with its thinking switched off and on, for `reasoning-models` (tier T0).

Usage: scripts/.venv/bin/python -m scripts.record run reasoning

Writes static/data/reasoning/thinking.json: for each puzzle, the model's reply with thinking off, and its
thinking plus reply with thinking on. Sampled with Qwen's recommended settings and a fixed seed. The
site reads each boxed answer and grades it (src/lib/grading/answers.ts).
"""

from __future__ import annotations

from . import runtime
from .runtime import ModelSpec, Run, job

MODEL = ModelSpec("Qwen/Qwen3-0.6B", "Qwen3-0.6B", device="mps")
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
    },
    {
        "question": "If it takes 5 machines 5 minutes to make 5 widgets, how long would it take 100 machines to make 100 widgets?",
        "answer": "5 minutes",
    },
    {
        "question": "How many times does the letter r appear in the word strawberry?",
        "answer": "3",
    },
    {
        "question": "What is 17 × 24?",
        "answer": "408",
    },
    {
        "question": "Sally has 3 brothers. Each of her brothers has 2 sisters. How many sisters does Sally have?",
        "answer": "1",
    },
    {
        "question": "I have 3 apples. I eat one, then buy 4 more, then give half of my apples to a friend. How many apples do I have now?",
        "answer": "3",
    },
]


@job("reasoning/thinking", models=[MODEL])
def record_thinking(run: Run) -> dict:
    tokenizer = runtime.tokenizer(MODEL)
    end_think = tokenizer.convert_tokens_to_ids("</think>")

    def answer(question: str, thinking: bool) -> dict:
        prompt = runtime.template(MODEL, [{"role": "user", "content": question + SUFFIX}], enable_thinking=thinking)
        settings = SETTINGS[thinking]
        new = runtime.generate(
            MODEL, prompt, do_sample=True, seed=SEED, pad_token_id=tokenizer.eos_token_id, **settings
        )["sequences"][0]
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
            "stopped": stopped,
        }

    puzzles = []
    for puzzle in run.items(PUZZLES, label=lambda p: p["question"][:60]):
        entry = {"question": puzzle["question"], "expected": puzzle["answer"]}
        for key, thinking in [("off", False), ("on", True)]:
            result = answer(puzzle["question"], thinking)
            entry[key] = result
            run.log(
                f"{key:3} {puzzle['answer']:>9} answer ends {result['answer'][-40:]!r}"
                f" think={result['thinkingTokens']} answer={result['answerTokens']} stopped={result['stopped']}"
            )
        puzzles.append(entry)

    return {
        "version": 1,
        "model": run.info(MODEL),
        "settings": {"off": SETTINGS[False], "on": SETTINGS[True], "seed": SEED, "suffix": SUFFIX},
        "puzzles": puzzles,
    }
