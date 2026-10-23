"""Spot checks: re-record datasets and compare them with the committed files, and check the live
models' pinned downloads.

Usage, from the repository root:
    scripts/.venv/bin/python -m scripts.record check <module> [args]   # e.g. check traces the-cat-sat
    scripts/.venv/bin/python -m scripts.record check live

`check clip` also redraws its pictures in static/vision/ in place; git shows any change.
"""

from __future__ import annotations

import json
import tempfile
import urllib.request
from pathlib import Path

from . import common

# The files Transformers.js downloads for each kind of live model (8-bit weights).
LIVE_FILES = {
    "next-token": lambda m: ["config.json", "generation_config.json", f"onnx/{m['onnxFile']}_quantized.onnx"],
    "embed": lambda m: ["config.json", "tokenizer.json", "tokenizer_config.json", "onnx/model_quantized.onnx"],
}


def _comparable(path: Path) -> dict:
    """A dataset without its recording dates, which change on every run."""
    envelope = json.loads(path.read_text())
    envelope.pop("generatedAt", None)
    if isinstance(envelope.get("data"), dict):
        envelope["data"].pop("generatedAt", None)
    return envelope


def recordings(run, name: str, args: list[str]) -> None:
    """Re-run one module into a temporary folder and compare each file it writes."""
    with tempfile.TemporaryDirectory() as tmp:
        common.OUTPUT = Path(tmp)
        try:
            run(name, args)
        finally:
            common.OUTPUT = common.DATA
        written = sorted(Path(tmp).rglob("*.json"))
        if not written:
            raise SystemExit(f"{name} wrote no datasets")
        differ = []
        for new in written:
            old = common.DATA / new.relative_to(tmp)
            same = old.exists() and _comparable(old) == _comparable(new)
            print(("same     " if same else "DIFFERS  ") + str(old.relative_to(common.ROOT)))
            if not same:
                differ.append(old)
    if differ:
        raise SystemExit(f"{len(differ)} of {len(written)} datasets differ from the committed files")


def live() -> None:
    """Check that each live model's pinned commit exists and its download matches the stated size."""
    models = [("next-token", common.CANONICAL), ("embed", common.EMBEDDER)]
    failures = []
    for task, model in models:
        url = f"https://huggingface.co/api/models/{model['onnxId']}/revision/{model['onnxRevision']}?blobs=true"
        with urllib.request.urlopen(url, timeout=30) as response:
            sizes = {s["rfilename"]: s["size"] for s in json.load(response)["siblings"]}
        files = LIVE_FILES[task](model)
        missing = [f for f in files if f not in sizes]
        mb = round(sum(sizes.get(f, 0) for f in files) / 1e6)
        ok = not missing and mb == model["onnxMB"]
        print(f"{'ok' if ok else 'WRONG':6} {model['onnxId']}@{model['onnxRevision'][:7]}: {mb} MB, stated {model['onnxMB']}")
        if not ok:
            failures.append(f"{model['onnxId']}: missing {missing}" if missing else model["onnxId"])
    if failures:
        raise SystemExit(f"live models don't match their config: {failures}")
