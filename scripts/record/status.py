"""`status`: every module's datasets, when each was recorded, whether a run now would be fully
cached, from which model commits, and any replies waiting for a hand grade."""

from __future__ import annotations

import json
from functools import cache

from . import common, runtime


@cache
def _cached_revision(model_id: str) -> str | None:
    try:
        return common.revision(model_id)
    except Exception:
        return None


def _envelopes() -> dict[str, dict]:
    found = {}
    for path in sorted(common.DATA.rglob("*.json")):
        envelope = json.loads(path.read_text())
        found[envelope["dataset"]] = envelope
    return found


def _models(envelope: dict) -> str:
    downloaded = {s.id for j in runtime.JOBS.values() for s in j.models}
    parts = []
    for m in envelope.get("models", []):
        recorded = m.get("revision")
        note = ""
        # Only Hugging Face models are downloaded; the toy Decision Transformer is trained by its job.
        if m["id"] in downloaded:
            cached = _cached_revision(m["id"])
            if cached is None:
                note = " (not downloaded)"
            elif recorded != cached:
                note = f" (downloaded: {cached[:7]})"
        parts.append(f"{m['id'].split('/')[-1]}@{(recorded or '?')[:7]}{note}")
    return ", ".join(parts)


def _waiting(dataset: str) -> str:
    path = runtime.pending_file(dataset)
    count = len(json.loads(path.read_text())) if path.exists() else 0
    return f"  {count} to grade: grade {dataset}" if count else ""


def show(modules: list[str]) -> None:
    envelopes = _envelopes()
    for module in modules:
        print(module)
        for job in [j for j in runtime.JOBS.values() if j.module == module]:
            cached = runtime.probe(job)
            for dataset in job.outputs:
                envelope = envelopes.get(dataset)
                label = dataset if job.name == dataset else f"{dataset} ({job.name})"
                recorded = (envelope.get("generatedAt") or "?")[:10] if envelope else "not recorded"
                models = f"  {_models(envelope)}" if envelope else ""
                print(f"  {label:34} {recorded:12} [{cached}]{models}{_waiting(dataset)}")
