"""Record base vs. instruct outputs for `predictor-to-assistant` (tier T0).

Usage:
    scripts/.venv/bin/python -m scripts.record run chat

Writes static/data/chat/base-vs-instruct.json: the same prompts given to a base model and to the
instruction-tuned version of it (with and without the chat template), plus GPT-2 for comparison.
Greedy decoding, so a rerun gives the same text.
"""

from __future__ import annotations

from . import runtime
from .common import CANONICAL
from .runtime import ModelSpec, Run, job

GPT2 = ModelSpec(CANONICAL["huggingFaceId"], CANONICAL["displayName"])
BASE = ModelSpec("Qwen/Qwen2.5-0.5B", "Qwen2.5-0.5B")
INSTRUCT = ModelSpec("Qwen/Qwen2.5-0.5B-Instruct", "Qwen2.5-0.5B-Instruct")
MAX_NEW_TOKENS = 48
PROMPTS = [
    "How do I boil an egg?",
    "What is the capital of France?",
    "Write a haiku about a cat.",
    "The cat sat on the",
]


def complete(spec: ModelSpec, text: str) -> dict:
    tokenizer = runtime.tokenizer(spec)
    pad = tokenizer.pad_token_id or tokenizer.eos_token_id
    new = runtime.generate(spec, text, max_new_tokens=MAX_NEW_TOKENS, pad_token_id=pad)["sequences"][0]
    # Stop markers are kept out of the text; `stopped` says whether the model ended on its own.
    stops = {tokenizer.eos_token_id, *tokenizer.convert_tokens_to_ids(["<|im_end|>", "<|endoftext|>"])}
    stopped = bool(new) and new[-1] in stops
    if stopped:
        new = new[:-1]
    return {"text": tokenizer.decode(new), "stopped": stopped}


@job("chat/base-vs-instruct", models=[GPT2, BASE, INSTRUCT])
def base_vs_instruct(run: Run) -> dict:
    results: dict[str, dict] = {}
    results["gpt2"] = {p: complete(GPT2, p) for p in PROMPTS}
    results["base"] = {p: complete(BASE, p) for p in PROMPTS}
    results["instructNoTemplate"] = {p: complete(INSTRUCT, p) for p in PROMPTS}
    templates = {p: runtime.template(INSTRUCT, [{"role": "user", "content": p}]) for p in PROMPTS}
    results["instruct"] = {p: complete(INSTRUCT, templates[p]) for p in PROMPTS}

    data = {
        "version": 1,
        "maxNewTokens": MAX_NEW_TOKENS,
        "models": {"gpt2": run.info(GPT2), "base": run.info(BASE), "instruct": run.info(INSTRUCT)},
        "prompts": [
            {
                "prompt": p,
                "template": templates[p],
                "gpt2": results["gpt2"][p],
                "base": results["base"][p],
                "instructNoTemplate": results["instructNoTemplate"][p],
                "instruct": results["instruct"][p],
            }
            for p in PROMPTS
        ],
    }
    for p in data["prompts"]:
        run.log(f"{p['prompt']!r} {({k: p[k] for k in ['base', 'instruct']})}")
    return data
