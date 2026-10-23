"""Record base vs. instruct outputs for `predictor-to-assistant` (tier T0).

Usage:
    scripts/.venv/bin/python -m scripts.record chat

Writes static/data/chat/base-vs-instruct.json: the same prompts given to a base model and to the
instruction-tuned version of it (with and without the chat template), plus GPT-2 for comparison.
Greedy decoding, so a rerun gives the same text.
"""

from __future__ import annotations

import datetime

import torch
from transformers import AutoModelForCausalLM, AutoTokenizer

from .common import CANONICAL, revision, write_dataset

BASE = "Qwen/Qwen2.5-0.5B"
INSTRUCT = "Qwen/Qwen2.5-0.5B-Instruct"
MAX_NEW_TOKENS = 48
PROMPTS = [
    "How do I boil an egg?",
    "What is the capital of France?",
    "Write a haiku about a cat.",
    "The cat sat on the",
]


def complete(model, tokenizer, text: str) -> dict:
    ids = tokenizer(text, return_tensors="pt").input_ids
    with torch.no_grad():
        out = model.generate(
            ids,
            max_new_tokens=MAX_NEW_TOKENS,
            do_sample=False,
            pad_token_id=tokenizer.pad_token_id or tokenizer.eos_token_id,
        )
    new = out[0, ids.shape[1] :].tolist()
    # Stop markers are kept out of the text; `stopped` says whether the model ended on its own.
    stops = {tokenizer.eos_token_id, *tokenizer.convert_tokens_to_ids(["<|im_end|>", "<|endoftext|>"])}
    stopped = bool(new) and new[-1] in stops
    if stopped:
        new = new[:-1]
    return {"text": tokenizer.decode(new), "stopped": stopped}


def main() -> None:
    results: dict[str, dict] = {}

    def load(model_id: str):
        tokenizer = AutoTokenizer.from_pretrained(model_id)
        model = AutoModelForCausalLM.from_pretrained(model_id, dtype=torch.float32).eval()
        return model, tokenizer

    model, tokenizer = load(CANONICAL["huggingFaceId"])
    results["gpt2"] = {p: complete(model, tokenizer, p) for p in PROMPTS}

    model, tokenizer = load(BASE)
    results["base"] = {p: complete(model, tokenizer, p) for p in PROMPTS}

    model, tokenizer = load(INSTRUCT)
    results["instructNoTemplate"] = {p: complete(model, tokenizer, p) for p in PROMPTS}
    templates = {
        p: tokenizer.apply_chat_template(
            [{"role": "user", "content": p}], tokenize=False, add_generation_prompt=True
        )
        for p in PROMPTS
    }
    results["instruct"] = {p: complete(model, tokenizer, templates[p]) for p in PROMPTS}

    data = {
        "version": 1,
        "maxNewTokens": MAX_NEW_TOKENS,
        "models": {
            "gpt2": {
                "id": CANONICAL["huggingFaceId"],
                "displayName": CANONICAL["displayName"],
                "revision": revision(CANONICAL["huggingFaceId"]),
            },
            "base": {"id": BASE, "displayName": "Qwen2.5-0.5B", "revision": revision(BASE)},
            "instruct": {
                "id": INSTRUCT,
                "displayName": "Qwen2.5-0.5B-Instruct",
                "revision": revision(INSTRUCT),
            },
        },
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
        "generatedAt": datetime.date.today().isoformat(),
        "source": {"torch": torch.__version__},
    }
    write_dataset("chat/base-vs-instruct", data, "chat")
    for p in data["prompts"]:
        print(repr(p["prompt"]), {k: p[k] for k in ["base", "instruct"]})


if __name__ == "__main__":
    main()
