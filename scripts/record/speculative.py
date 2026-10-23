"""Record speculative decoding: GPT-2 small drafts tokens for GPT-2 medium, for `speculative-decoding` (tier T0).

Usage: scripts/.venv/bin/python -m scripts.record speculative
(downloads GPT-2 medium, about 1.5 GB, on the first run; GPT-2 small is already cached)

Writes static/data/speculative/<canonical model>/drafts.json. For each prompt, the drafter guesses DRAFT tokens greedily,
then the big model reads the text plus all the guesses in one pass. It keeps the guesses that match
its own top token, and at the first mismatch it adds its own token instead (if every guess
matched, it adds one more of its own). Both models share GPT-2's tokenizer. The script checks that
the result is exactly the big model's plain greedy output, and counts the big model's passes.
"""

from __future__ import annotations

import datetime

import torch
from transformers import AutoModelForCausalLM, AutoTokenizer

from .common import CANONICAL, revision, write_dataset

DRAFTER = CANONICAL["huggingFaceId"]
TARGET = CANONICAL["draftTarget"]["huggingFaceId"]
DRAFT = 4
NEW_TOKENS = 30
PROMPTS = [
    "The cat sat on the",
    "One, two, three, four, five,",
    "The capital of France is",
    "Yesterday my neighbor told me a strange story about",
]


def token(tokenizer, i: int) -> dict:
    return {"id": i, "text": tokenizer.decode([i])}


def greedy(model, ids: torch.Tensor, n: int) -> list[int]:
    out = []
    for _ in range(n):
        next_id = int(model(ids).logits[0, -1].argmax())
        out.append(next_id)
        ids = torch.cat([ids, torch.tensor([[next_id]])], dim=1)
    return out


def speculative(drafter, target, ids: torch.Tensor, tokenizer) -> tuple[list[int], list[dict]]:
    written: list[int] = []
    rounds = []
    while len(written) < NEW_TOKENS:
        context = torch.cat([ids, torch.tensor([written], dtype=torch.long)], dim=1) if written else ids
        guesses = greedy(drafter, context, DRAFT)
        checked = torch.cat([context, torch.tensor([guesses])], dim=1)
        # One pass of the big model scores the next token after every position at once.
        logits = target(checked).logits[0, context.shape[1] - 1 :]
        wanted = [int(i) for i in logits.argmax(dim=-1)]
        kept = 0
        while kept < DRAFT and guesses[kept] == wanted[kept]:
            kept += 1
        added = wanted[kept]
        rounds.append(
            {
                "guesses": [token(tokenizer, g) for g in guesses],
                "kept": kept,
                "added": token(tokenizer, added),
            }
        )
        written += guesses[:kept] + [added]
    return written[:NEW_TOKENS], rounds


def main() -> None:
    torch.set_grad_enabled(False)
    torch.manual_seed(0)
    tokenizer = AutoTokenizer.from_pretrained(DRAFTER)
    assert AutoTokenizer.from_pretrained(TARGET).get_vocab() == tokenizer.get_vocab()
    drafter = AutoModelForCausalLM.from_pretrained(DRAFTER, dtype=torch.float32).eval()
    target = AutoModelForCausalLM.from_pretrained(TARGET, dtype=torch.float32).eval()
    sizes = {
        "drafter": sum(p.numel() for p in drafter.parameters()),
        "target": sum(p.numel() for p in target.parameters()),
    }

    runs = []
    for prompt in PROMPTS:
        ids = tokenizer(prompt, return_tensors="pt").input_ids
        plain = greedy(target, ids, NEW_TOKENS)
        written, rounds = speculative(drafter, target, ids, tokenizer)
        assert written == plain, f"speculative output differs for {prompt!r}"
        text = tokenizer.decode(written)
        print(f"{prompt!r}: {len(rounds)} passes instead of {NEW_TOKENS}: {text!r}")
        runs.append(
            {
                "prompt": prompt,
                "tokens": [token(tokenizer, i) for i in ids[0].tolist()],
                "written": [token(tokenizer, i) for i in written],
                "rounds": rounds,
            }
        )

    write_dataset(
        "speculative/drafts",
        {
            "version": 1,
            "drafter": {"id": DRAFTER, "displayName": CANONICAL["displayName"], "revision": revision(DRAFTER),
                        "parameters": sizes["drafter"]},
            "target": {"id": TARGET, "displayName": CANONICAL["draftTarget"]["displayName"],
                       "revision": revision(TARGET), "parameters": sizes["target"]},
            "draft": DRAFT,
            "newTokens": NEW_TOKENS,
            "runs": runs,
            "generatedAt": datetime.date.today().isoformat(),
        },
        "speculative",
    )


if __name__ == "__main__":
    main()
