"""Round GPT-2 small's weights to fewer bits and record what changes, for `quantization` (tier T0).

Usage: scripts/.venv/bin/python -m scripts.record run quantize

Writes static/data/quantize/<canonical model>/precisions.json. For each precision (32-bit floats as trained, 16-bit floats, and
8, 4, 3, and 2-bit integers) it records the weights' size, the top next-token guesses for "The cat
sat on the", the greedy continuation, and the loss on a short test passage. Integer precisions use
plain round-to-nearest in blocks of 32 numbers that share one 16-bit scale, like llama.cpp's Q4_0
and Q8_0 formats: no quantization-aware training and no calibration. Every weight matrix is
rounded, including the token and position tables; biases and layer-norm numbers stay as they are.
"""

from __future__ import annotations

import datetime

import torch

from .common import CANONICAL, revision
from .runtime import ModelSpec, Run, job

GPT2 = ModelSpec(CANONICAL["huggingFaceId"], CANONICAL["displayName"])
PROMPT = "The cat sat on the"
NEW_TOKENS = 12
TOP_K = 5
BLOCK = 32
SCALE_BITS = 16
# Public-domain text (Lewis Carroll, 1865) the model saw nothing special about.
PASSAGE = (
    "Alice was beginning to get very tired of sitting by her sister on the bank, and of having "
    "nothing to do: once or twice she had peeped into the book her sister was reading, but it had "
    "no pictures or conversations in it, and what is the use of a book, thought Alice, without "
    "pictures or conversations?"
)
INT_BITS = [8, 6, 5, 4, 3, 2]
# The row shown in the widget: the first block of the first attention layer's weights.
SAMPLE_LAYER = "transformer.h.0.attn.c_attn.weight"


def quantize_blocks(w: torch.Tensor, bits: int) -> torch.Tensor:
    """Round each block of BLOCK numbers to `bits`-bit integers times one shared scale."""
    flat = w.reshape(-1, BLOCK)
    top = 2 ** (bits - 1) - 1
    scale = flat.abs().amax(dim=1, keepdim=True) / top
    scale = scale.half().float()  # the scale is stored in 16 bits too
    scale[scale == 0] = 1
    q = torch.clamp(torch.round(flat / scale), -top - 1, top)
    return (q * scale).reshape(w.shape)


def matrices(model) -> list[tuple[str, torch.nn.Parameter]]:
    return [(n, p) for n, p in model.named_parameters() if p.dim() == 2]


@torch.no_grad()
def measure(model, tokenizer) -> dict:
    prompt = tokenizer(PROMPT, return_tensors="pt").input_ids
    logits = model(prompt).logits[0, -1]
    probs = torch.softmax(logits, dim=-1)
    top = torch.topk(probs, TOP_K)
    candidates = [
        {"token": {"id": int(i), "text": tokenizer.decode([int(i)])}, "prob": round(float(p), 6)}
        for p, i in zip(top.values, top.indices)
    ]
    ids = prompt
    generated = []
    for _ in range(NEW_TOKENS):
        next_id = int(model(ids).logits[0, -1].argmax())
        generated.append({"id": next_id, "text": tokenizer.decode([next_id])})
        ids = torch.cat([ids, torch.tensor([[next_id]])], dim=1)
    passage = tokenizer(PASSAGE, return_tensors="pt").input_ids
    loss = float(model(passage, labels=passage).loss)
    return {"candidates": candidates, "generated": generated, "loss": round(loss, 4)}


@job("quantize/precisions", models=[GPT2])
def precisions(run: Run) -> dict:
    loaded = run.model(GPT2)
    model, tokenizer = loaded.model, loaded.tokenizer
    original = {n: p.detach().clone() for n, p in matrices(model)}
    try:
        with torch.no_grad():
            return record_precisions(run, model, tokenizer, original)
    finally:
        # Other jobs in this process share the loaded model.
        with torch.no_grad():
            for name, p in matrices(model):
                p.copy_(original[name])


def record_precisions(run: Run, model, tokenizer, original: dict[str, torch.Tensor]) -> dict:
    model_id = GPT2.id
    config = model.config
    assert (config.n_layer, config.n_embd) == (CANONICAL["layers"], CANONICAL["embeddingSize"])

    # wte and lm_head share one matrix, so count parameters once.
    parameters = sum(p.numel() for p in model.parameters())
    assert parameters == CANONICAL["parameters"], parameters
    in_matrices = sum(t.numel() for t in original.values())
    other = parameters - in_matrices
    assert all(t.numel() % BLOCK == 0 for t in original.values())

    def size_bytes(bits: int | None, float_bits: int) -> int:
        """Matrices at `bits` (plus one scale per block), everything else at `float_bits`."""
        if bits is None:
            return parameters * float_bits // 8
        per_block = BLOCK * bits + SCALE_BITS
        return in_matrices // BLOCK * per_block // 8 + other * 16 // 8

    sample = original[SAMPLE_LAYER].flatten()[:BLOCK]
    precisions = []

    def record(label: str, bits: int, kind: str, size: int, row: torch.Tensor) -> None:
        result = measure(model, tokenizer)
        precisions.append(
            {"label": label, "bits": bits, "kind": kind, "bytes": size, **result,
             "row": [round(float(v), 5) for v in row]}
        )
        run.log(f"{label:>8}: {size / 1e6:6.1f} MB  loss {result['loss']:.3f}  "
                f"top {result['candidates'][0]['token']['text']!r}  "
                f"{''.join(t['text'] for t in result['generated'])!r}")

    record("32-bit", 32, "float", size_bytes(None, 32), sample)

    for name, p in matrices(model):
        p.copy_(original[name].half().float())
    record("16-bit", 16, "float", size_bytes(None, 16), original[SAMPLE_LAYER].flatten()[:BLOCK].half().float())

    for bits in INT_BITS:
        for name, p in matrices(model):
            p.copy_(quantize_blocks(original[name], bits))
        row = quantize_blocks(original[SAMPLE_LAYER], bits).flatten()[:BLOCK]
        record(f"{bits}-bit", bits, "int", size_bytes(bits, 16), row)

    top = sample.abs().max()
    return {
        "version": 1,
        "model": {"id": model_id, "displayName": CANONICAL["displayName"], "revision": revision(model_id)},
        "prompt": PROMPT,
        "passage": PASSAGE,
        "parameters": parameters,
        "block": BLOCK,
        "scaleBits": SCALE_BITS,
        "sample": {"layer": SAMPLE_LAYER, "max": round(float(top), 5)},
        "precisions": precisions,
        "generatedAt": datetime.date.today().isoformat(),
    }
