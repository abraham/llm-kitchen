#!/usr/bin/env python3
"""Measure GPT-2 small generating with and without its KV cache, for Ch 25 (tier T0).

Usage: scripts/.venv/bin/python scripts/build-caching.py

Writes static/caching/kv-cache.json: the greedy tokens from each run (they match), the largest
difference between the two runs' next-token scores, and the time each new token took, measured on
this machine's CPU. Without the cache every step reruns the whole text so far; with it, each step
runs only the newest token and reuses the stored keys and values of the earlier ones.
"""

from __future__ import annotations

import datetime
import json
import statistics
import time
from pathlib import Path

import torch
from transformers import AutoModelForCausalLM, AutoTokenizer
from transformers.utils import cached_file

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "static" / "caching" / "kv-cache.json"
CANONICAL = json.loads((ROOT / "models" / "canonical.json").read_text())
PROMPT = "The cat sat on the"
NEW_TOKENS = 500
REPEATS = 3


def revision(model_id: str) -> str | None:
    path = Path(cached_file(model_id, "config.json"))
    return path.parent.name if path.parent.parent.name == "snapshots" else None


@torch.no_grad()
def run(model, prompt_ids: torch.Tensor, cache: bool) -> tuple[list[int], list[float], list[torch.Tensor]]:
    """Greedy generation, timing each step. Returns the new tokens, ms per step, and each step's scores."""
    ids = prompt_ids
    past = None
    tokens: list[int] = []
    times: list[float] = []
    scores: list[torch.Tensor] = []
    for _ in range(NEW_TOKENS):
        start = time.perf_counter()
        if cache:
            out = model(ids if past is None else ids[:, -1:], past_key_values=past, use_cache=True)
            past = out.past_key_values
        else:
            out = model(ids, use_cache=False)
        logits = out.logits[0, -1]
        next_id = int(logits.argmax())
        times.append((time.perf_counter() - start) * 1000)
        scores.append(logits.clone())
        tokens.append(next_id)
        ids = torch.cat([ids, torch.tensor([[next_id]])], dim=1)
    return tokens, times, scores


def main() -> None:
    torch.manual_seed(0)
    model_id = CANONICAL["huggingFaceId"]
    tokenizer = AutoTokenizer.from_pretrained(model_id)
    model = AutoModelForCausalLM.from_pretrained(model_id, dtype=torch.float32).eval()
    config = model.config
    assert (config.n_layer, config.n_head, config.n_embd) == (
        CANONICAL["layers"],
        CANONICAL["heads"],
        CANONICAL["embeddingSize"],
    ), "models/canonical.json doesn't match the model's config"

    prompt_ids = tokenizer(PROMPT, return_tensors="pt").input_ids
    run(model, prompt_ids, cache=True)  # warm up

    timings: dict[bool, list[list[float]]] = {True: [], False: []}
    results = {}
    for _ in range(REPEATS):
        for cache in (True, False):
            tokens, times, scores = run(model, prompt_ids, cache)
            timings[cache].append(times)
            results[cache] = (tokens, scores)

    tokens_on, scores_on = results[True]
    tokens_off, scores_off = results[False]
    assert tokens_on == tokens_off, "the cache changed the greedy tokens"
    max_diff = max(float((a - b).abs().max()) for a, b in zip(scores_on, scores_off))

    def median_per_step(runs: list[list[float]]) -> list[float]:
        return [round(statistics.median(step), 2) for step in zip(*runs)]

    per_step = {cache: median_per_step(timings[cache]) for cache in (True, False)}
    data = {
        "version": 1,
        "model": {
            "id": model_id,
            "displayName": CANONICAL["displayName"],
            "revision": revision(model_id),
        },
        "prompt": PROMPT,
        "promptTokens": [
            {"id": int(t), "text": tokenizer.decode([int(t)])} for t in prompt_ids[0]
        ],
        "generated": [{"id": t, "text": tokenizer.decode([t])} for t in tokens_on],
        "maxScoreDifference": max_diff,
        "device": f"CPU, {torch.get_num_threads()} threads, float32",
        "repeats": REPEATS,
        "msPerToken": {"cache": per_step[True], "noCache": per_step[False]},
        "totalMs": {
            "cache": round(sum(per_step[True])),
            "noCache": round(sum(per_step[False])),
        },
        "generatedAt": datetime.date.today().isoformat(),
    }
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(data, ensure_ascii=False) + "\n")
    print(
        f"Wrote {OUT.relative_to(ROOT)}: {NEW_TOKENS} tokens, "
        f"{data['totalMs']['cache']} ms with the cache, {data['totalMs']['noCache']} ms without, "
        f"max score difference {max_diff:.2e}"
    )


if __name__ == "__main__":
    main()
