#!/usr/bin/env python3
"""Generate recorded (T0) traces from the canonical small model.

Usage:
    python3 -m venv scripts/.venv
    scripts/.venv/bin/pip install -r scripts/requirements.txt
    scripts/.venv/bin/python scripts/build-traces.py            # all traces
    scripts/.venv/bin/python scripts/build-traces.py the-cat-sat  # one trace

Writes static/traces/<model-id>/<name>.json (validated in the browser by parseTrace in
src/lib/models/trace.ts) and an index.json listing them.
"""

from __future__ import annotations

import datetime
import json
import sys
from dataclasses import dataclass, field
from pathlib import Path

import torch
from transformers import AutoModelForCausalLM, AutoTokenizer
from transformers.utils import cached_file

ROOT = Path(__file__).resolve().parent.parent
CANONICAL = json.loads((ROOT / "models" / "canonical.json").read_text())


@dataclass
class Spec:
    name: str
    prompt: str
    max_new_tokens: int
    top_k: int = 10
    temperature: float = 0.0  # 0 = always take the most likely token
    seed: int = 0
    attention: bool = False
    note: str = ""
    stop_at_newline: bool = False
    extra: dict = field(default_factory=dict)


SPECS = [
    Spec(
        "the-cat-sat",
        "The cat sat on the",
        max_new_tokens=12,
        top_k=50,
        note="Ch 0, Ch 3, Ch 11: the running example, greedy.",
    ),
    *[
        Spec(
            f"the-cat-sat-t{str(t).replace('.', '')}",
            "The cat sat on the",
            max_new_tokens=16,
            top_k=10,
            temperature=t,
            seed=seed,
            note=f"Ch 3: sampled at temperature {t}.",
        )
        for t, seed in [(0.0, 0), (0.7, 7), (1.5, 15)]
    ],
]


def check_config(model) -> None:
    """Fail loudly if models/canonical.json disagrees with the model's own config."""
    c = model.config
    actual = {
        "layers": c.n_layer,
        "heads": c.n_head,
        "embeddingSize": c.n_embd,
        "vocabularySize": c.vocab_size,
        "contextLength": c.n_positions,
        "parameters": sum(p.numel() for p in model.parameters()),
    }
    mismatches = {k: (CANONICAL[k], v) for k, v in actual.items() if CANONICAL[k] != v}
    if mismatches:
        raise SystemExit(f"models/canonical.json does not match the model config: {mismatches}")


def token(tokenizer, token_id: int) -> dict:
    return {"id": int(token_id), "text": tokenizer.decode([int(token_id)])}


def model_revision() -> str | None:
    """The Hugging Face commit the weights came from (cache path is .../snapshots/<sha>/...)."""
    path = Path(cached_file(CANONICAL["huggingFaceId"], "config.json"))
    return path.parent.name if path.parent.parent.name == "snapshots" else None


def run(spec: Spec, model, tokenizer) -> dict:
    ids = tokenizer(spec.prompt, return_tensors="pt").input_ids[0].tolist()
    prompt_tokens = [token(tokenizer, i) for i in ids]
    generator = torch.Generator().manual_seed(spec.seed)
    steps = []
    context = list(ids)

    with torch.no_grad():
        for _ in range(spec.max_new_tokens):
            logits = model(torch.tensor([context])).logits[0, -1]
            probs = torch.softmax(logits, dim=-1)
            top = torch.topk(probs, spec.top_k)
            if spec.temperature == 0:
                chosen = int(torch.argmax(logits))
            else:
                tempered = torch.softmax(logits / spec.temperature, dim=-1)
                chosen = int(torch.multinomial(tempered, 1, generator=generator))
            candidates = [
                {"token": token(tokenizer, i), "prob": round(float(p), 6)}
                for p, i in zip(top.values.tolist(), top.indices.tolist())
            ]
            steps.append(
                {
                    "context": [token(tokenizer, i) for i in context],
                    "candidates": candidates,
                    "rest": round(max(0.0, 1 - sum(c["prob"] for c in candidates)), 6),
                    "chosen": token(tokenizer, chosen),
                }
            )
            context.append(chosen)
            if spec.stop_at_newline and "\n" in tokenizer.decode([chosen]):
                break

        trace = {
            "version": 1,
            "kind": "recorded",
            "model": CANONICAL["id"],
            "modelDisplayName": CANONICAL["displayName"],
            "prompt": spec.prompt,
            "tokens": prompt_tokens,
            "steps": steps,
            "settings": {"topK": spec.top_k, "temperature": spec.temperature, "seed": spec.seed},
            "generatedAt": datetime.date.today().isoformat(),
            "source": {
                "huggingFaceId": CANONICAL["huggingFaceId"],
                "revision": model_revision(),
                "torch": torch.__version__,
            },
        }

        if spec.attention:
            out = model(torch.tensor([ids]), output_attentions=True)
            trace["attention"] = {
                "tokens": prompt_tokens,
                "weights": [
                    [[[round(float(w), 4) for w in row] for row in head] for head in layer[0]]
                    for layer in out.attentions
                ],
            }

    if tokenizer.decode(ids) != spec.prompt:
        raise SystemExit(f"{spec.name}: tokens do not round-trip to the prompt")
    return trace


def export_vectors(prompt: str, name: str, model, tokenizer) -> None:
    """Token embeddings, position embeddings, and the last token's vector after every block."""
    ids = tokenizer(prompt, return_tensors="pt").input_ids
    with torch.no_grad():
        out = model(ids, output_hidden_states=True)
    wte = model.transformer.wte.weight[ids[0]]
    wpe = model.transformer.wpe.weight[: ids.shape[1]]
    r = lambda t: [[round(float(x), 4) for x in row] for row in t]  # noqa: E731
    data = {
        "model": CANONICAL["id"],
        "modelDisplayName": CANONICAL["displayName"],
        "prompt": prompt,
        "tokens": [token(tokenizer, i) for i in ids[0].tolist()],
        "dimensions": CANONICAL["embeddingSize"],
        "tokenEmbeddings": r(wte),
        "positionEmbeddings": r(wpe),
        # hidden_states[0] is embeddings + positions; [i] is after block i (the last one is
        # after the final layer norm in Hugging Face's GPT-2).
        "lastTokenByLayer": r(torch.stack([h[0, -1] for h in out.hidden_states])),
        "generatedAt": datetime.date.today().isoformat(),
        "source": {"huggingFaceId": CANONICAL["huggingFaceId"], "revision": model_revision()},
    }
    out_dir = ROOT / "static" / "vectors" / CANONICAL["id"]
    out_dir.mkdir(parents=True, exist_ok=True)
    (out_dir / f"{name}.json").write_text(json.dumps(data, separators=(",", ":")) + "\n")
    print(f"static/vectors/{CANONICAL['id']}/{name}.json")


def main(names: list[str]) -> None:
    out_dir = ROOT / "static" / "traces" / CANONICAL["id"]
    out_dir.mkdir(parents=True, exist_ok=True)

    tokenizer = AutoTokenizer.from_pretrained(CANONICAL["huggingFaceId"])
    model = AutoModelForCausalLM.from_pretrained(
        CANONICAL["huggingFaceId"], attn_implementation="eager"
    ).eval()
    check_config(model)

    specs = [s for s in SPECS if not names or s.name in names]
    if names and len(specs) != len(names):
        raise SystemExit(f"Unknown trace names: {set(names) - {s.name for s in SPECS}}")

    for spec in specs:
        trace = run(spec, model, tokenizer)
        path = out_dir / f"{spec.name}.json"
        path.write_text(json.dumps(trace, ensure_ascii=False, separators=(",", ":")) + "\n")
        text = spec.prompt + "".join(s["chosen"]["text"] for s in trace["steps"])
        print(f"{path.relative_to(ROOT)}: {text!r}")

    index = sorted(p.stem for p in out_dir.glob("*.json") if p.stem != "index")
    (out_dir / "index.json").write_text(json.dumps({"traces": index}, indent="\t") + "\n")

    if not names:
        export_vectors("The cat sat on the", "the-cat-sat", model, tokenizer)


if __name__ == "__main__":
    main(sys.argv[1:])
