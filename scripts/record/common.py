"""Shared helpers for the recording scripts: paths, model revisions, and the dataset envelope."""

from __future__ import annotations

import datetime
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
DATA = ROOT / "static" / "data"
CANONICAL = json.loads((ROOT / "models" / "canonical.json").read_text())
EMBEDDER = json.loads((ROOT / "models" / "embedder.json").read_text())
ENCODER = json.loads((ROOT / "models" / "encoder.json").read_text())
CLIP = json.loads((ROOT / "models" / "clip.json").read_text())
ASSISTANT = json.loads((ROOT / "models" / "assistant.json").read_text())
# Every model the site runs live, each with its pinned ONNX files.
LIVE = (CANONICAL, EMBEDDER, ENCODER, CLIP, ASSISTANT)
# Datasets recorded from the canonical model live in a folder per model, so a switch keeps both.
PER_MODEL = ("traces", "vectors", "quantize", "speculative", "attention")
# Where write_dataset writes; `check` points it at a temporary folder.
OUTPUT = DATA

# Bump when a dataset's shape changes, together with its version in src/lib/datasets/registry.ts.
VERSION = 1


def revision(model_id: str) -> str | None:
    """The Hugging Face commit the cached model files come from, so a run can be reproduced."""
    from transformers.utils import cached_file

    path = Path(cached_file(model_id, "config.json"))
    return path.parent.name if path.parent.parent.name == "snapshots" else None


def dataset_file(dataset_id: str, root: Path = DATA) -> Path:
    """Where a dataset lives under static/data/ (some kinds in a folder per canonical model)."""
    kind, _, name = dataset_id.partition("/")
    if kind in PER_MODEL:
        return root / kind / CANONICAL["id"] / f"{name}.json"
    return root / f"{dataset_id}.json"


def _models(data: dict) -> list[dict]:
    """Every model the data names with a revision: `model`, `models`, drafter, target, embedder."""
    found: dict[str, str | None] = {}

    def visit(value, depth: int) -> None:
        if not isinstance(value, dict) or depth > 2:
            return
        if isinstance(value.get("id"), str) and "revision" in value:
            found.setdefault(value["id"], value["revision"])
        if isinstance(value.get("huggingFaceId"), str):
            found.setdefault(value["huggingFaceId"], value.get("revision"))
        for v in value.values():
            visit(v, depth + 1)

    visit(data, 0)
    if isinstance(data.get("model"), str) and "/" in data["model"]:
        found.setdefault(data["model"], data.get("revision"))
    return [{"id": k, "revision": v} for k, v in found.items()]


def read_dataset(dataset_id: str) -> dict:
    """The data of a dataset another module already recorded."""
    return json.loads(dataset_file(dataset_id).read_text())["data"]


def write_dataset(dataset_id: str, data: dict, script: str, *, compact: bool = False) -> Path:
    """Write `data` in the envelope the site checks (src/lib/datasets/registry.ts)."""
    models = _models(data)
    if not models:
        raise SystemExit(f"{dataset_id}: name the model and its revision in the data")
    envelope = {
        "dataset": dataset_id,
        "version": VERSION,
        "script": f"record/{script}.py",
        "models": models,
        "generatedAt": data.get("generatedAt") or datetime.date.today().isoformat(),
        "data": data,
    }
    path = dataset_file(dataset_id, OUTPUT)
    path.parent.mkdir(parents=True, exist_ok=True)
    layout = {"separators": (",", ":")} if compact else {"indent": "\t"}
    path.write_text(json.dumps(envelope, ensure_ascii=False, **layout) + "\n")
    print(path.relative_to(ROOT) if path.is_relative_to(ROOT) else path)
    return path


def check_canonical(model) -> None:
    """Fail loudly if models/canonical.json disagrees with the GPT-2 model's own config."""
    c = model.config
    actual = {
        "layers": c.n_layer,
        "heads": c.n_head,
        "embeddingSize": c.n_embd,
        "vocabularySize": c.vocab_size,
        "contextLength": c.n_positions,
        "mlpSize": c.n_inner or 4 * c.n_embd,
        "parameters": sum(p.numel() for p in model.parameters()),
    }
    mismatches = {k: (CANONICAL[k], v) for k, v in actual.items() if CANONICAL[k] != v}
    if mismatches:
        raise SystemExit(f"models/canonical.json does not match the model config: {mismatches}")
