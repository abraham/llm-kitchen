"""Spot checks: re-record datasets and compare them with the committed files, and check the live
models' pinned downloads.

Usage, from the repository root:
    scripts/.venv/bin/python -m scripts.record check <job|module> [names]   # e.g. check traces the-cat-sat
    scripts/.venv/bin/python -m scripts.record check live

`check clip` also redraws its pictures in static/vision/ in place; git shows any change.
"""

from __future__ import annotations

import hashlib
import json
import tempfile
import urllib.request
from pathlib import Path
from typing import Any, Callable

from . import common


def _comparable(path: Path) -> dict:
    """A dataset without what changes from run to run or machine to machine: the recording date,
    the job's name, package versions, and the device and dtype each model ran with."""
    envelope = json.loads(path.read_text())
    for key in ("generatedAt", "job", "source"):
        envelope.pop(key, None)
    for m in envelope.get("models", []):
        m.pop("device", None)
        m.pop("dtype", None)
    if isinstance(envelope.get("data"), dict):
        envelope["data"].pop("generatedAt", None)
        envelope["data"].pop("source", None)
    return envelope


def _differences(old: Any, new: Any, path: str = "", found: list[str] | None = None, limit: int = 5) -> list[str]:
    """The first few paths where two JSON values differ, with both values."""
    found = [] if found is None else found
    if len(found) >= limit:
        return found
    if isinstance(old, dict) and isinstance(new, dict):
        for key in [*old, *(k for k in new if k not in old)]:
            if key not in new or key not in old:
                found.append(f"{path}.{key}: {'only in the committed file' if key in old else 'only in the new one'}")
            else:
                _differences(old[key], new[key], f"{path}.{key}", found, limit)
            if len(found) >= limit:
                break
    elif isinstance(old, list) and isinstance(new, list) and len(old) == len(new):
        for i, (a, b) in enumerate(zip(old, new)):
            _differences(a, b, f"{path}[{i}]", found, limit)
            if len(found) >= limit:
                break
    elif old != new:
        found.append(f"{path}: {json.dumps(old, ensure_ascii=False)[:120]} → {json.dumps(new, ensure_ascii=False)[:120]}")
    return found


def _provenance(path: Path) -> dict:
    envelope = json.loads(path.read_text())
    devices = {m["id"]: (m.get("device"), m.get("dtype")) for m in envelope.get("models", []) if "device" in m}
    return {"source": envelope.get("source"), "devices": devices}


def recordings(record: Callable[[], None], label: str) -> None:
    """Re-record into a temporary folder and compare each file written with the committed one."""
    with tempfile.TemporaryDirectory() as tmp:
        common.OUTPUT = Path(tmp)
        try:
            record()
        finally:
            common.OUTPUT = common.DATA
        written = sorted(Path(tmp).rglob("*.json"))
        if not written:
            raise SystemExit(f"{label} wrote no datasets")
        differ = []
        for new in written:
            old = common.DATA / new.relative_to(tmp)
            same = old.exists() and _comparable(old) == _comparable(new)
            print(("same     " if same else "DIFFERS  ") + str(old.relative_to(common.ROOT)), flush=True)
            if not same:
                differ.append(old)
            if old.exists() and not same:
                for line in _differences(_comparable(old), _comparable(new)):
                    print("         " + line, flush=True)
                was, now = _provenance(old), _provenance(new)
                if was["source"] and was != now:
                    print(f"         recorded with {was}, now {now}", flush=True)
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
