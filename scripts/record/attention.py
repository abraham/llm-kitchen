"""Record GPT-2's attention scores before the mask and softmax, for `attention` (tier T0).

Usage:
    scripts/.venv/bin/python -m scripts.record run attention

For the name-mover sentence the attention viewer starts on, writes every head's raw scores
(query · key / √64, for every pair of tokens, later ones included) to
static/data/attention/gpt2/ioi-scores.json. The browser masks them and applies softmax; the script
checks that this gives back the weights GPT-2 itself computes.
"""

from __future__ import annotations

import datetime
import math

import torch

from .common import CANONICAL, check_canonical, revision
from .runtime import ModelSpec, Run, job

GPT2 = ModelSpec(CANONICAL["huggingFaceId"], CANONICAL["displayName"], attention="eager")
PROMPT = "When Mary and John went to the store, John gave a drink to"


@job("attention/ioi-scores", models=[GPT2], compact=True)
def ioi_scores(run: Run) -> dict:
    loaded = run.model(GPT2)
    model, tokenizer = loaded.model, loaded.tokenizer
    check_canonical(model)
    heads = model.config.n_head
    head_size = model.config.n_embd // heads

    # Each block's c_attn produces queries, keys, and values side by side.
    qkv: list[torch.Tensor] = []
    hooks = [
        block.attn.c_attn.register_forward_hook(lambda _m, _i, out: qkv.append(out[0]))
        for block in model.transformer.h
    ]
    ids = tokenizer(PROMPT, return_tensors="pt").input_ids
    with torch.no_grad():
        out = model(ids, output_attentions=True)
    for h in hooks:
        h.remove()

    n = ids.shape[1]
    scores = []
    worst = 0.0
    for layer, x in enumerate(qkv):
        q, k, _ = x.split(model.config.n_embd, dim=-1)
        q = q.view(n, heads, head_size).transpose(0, 1)
        k = k.view(n, heads, head_size).transpose(0, 1)
        s = q @ k.transpose(-1, -2) / math.sqrt(head_size)
        mask = torch.triu(torch.ones(n, n, dtype=torch.bool), diagonal=1)
        weights = torch.softmax(s.masked_fill(mask, float("-inf")), dim=-1)
        worst = max(worst, float((weights - out.attentions[layer][0]).abs().max()))
        scores.append([[[round(float(v), 2) for v in row] for row in head] for head in s])
    if worst > 1e-4:
        raise SystemExit(f"recomputed weights differ from GPT-2's by {worst}")
    run.log(f"max difference from GPT-2's own weights: {worst}")

    return {
        "model": CANONICAL["id"],
        "modelDisplayName": CANONICAL["displayName"],
        "prompt": PROMPT,
        "tokens": [{"id": i, "text": tokenizer.decode([i])} for i in ids[0].tolist()],
        "headSize": head_size,
        "scores": scores,
        "generatedAt": datetime.date.today().isoformat(),
        "source": {"huggingFaceId": CANONICAL["huggingFaceId"], "revision": revision(CANONICAL["huggingFaceId"])},
    }
