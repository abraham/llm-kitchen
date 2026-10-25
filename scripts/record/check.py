"""Spot checks: re-record datasets and compare them with the committed files, and check the live
models' pinned downloads.

Usage, from the repository root:
    scripts/.venv/bin/python -m scripts.record check <module> [args]   # e.g. check traces the-cat-sat
    scripts/.venv/bin/python -m scripts.record check live

`check clip` also redraws its pictures in static/vision/ in place; git shows any change.
"""

from __future__ import annotations

import hashlib
import json
import tempfile
import urllib.request
from pathlib import Path

from . import common


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


def _sha256(url: str) -> str:
    digest = hashlib.sha256()
    with urllib.request.urlopen(url, timeout=60) as response:
        for chunk in iter(lambda: response.read(1 << 20), b""):
            digest.update(chunk)
    return digest.hexdigest()


def live() -> None:
    """Check that each live model's pinned commit has the files its config lists (`onnxFiles`, the
    files Transformers.js downloads), with the stated total size and each file's SHA-256."""
    failures = []
    for model in common.LIVE:
        repo, revision = model["onnxId"], model["onnxRevision"]
        url = f"https://huggingface.co/api/models/{repo}/revision/{revision}?blobs=true"
        with urllib.request.urlopen(url, timeout=30) as response:
            sizes = {s["rfilename"]: s["size"] for s in json.load(response)["siblings"]}
        files: dict[str, str] = model["onnxFiles"]
        missing = [f for f in files if f not in sizes]
        mb = round(sum(sizes.get(f, 0) for f in files) / 1e6)
        ok = not missing and mb == model["onnxMB"]
        print(f"{'ok' if ok else 'WRONG':6} {repo}@{revision[:7]}: {mb} MB, stated {model['onnxMB']}")
        if not ok:
            failures.append(f"{repo}: missing {missing}" if missing else f"{repo}: size")
        for name, want in files.items():
            if name in missing:
                continue
            got = _sha256(f"https://huggingface.co/{repo}/resolve/{revision}/{name}")
            print(f"{'ok' if got == want else 'WRONG':6}   {name} {got}")
            if got != want:
                failures.append(f"{repo}: {name}")
    if failures:
        raise SystemExit(f"live models don't match their config: {failures}")
