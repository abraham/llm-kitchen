"""`status`: every module's datasets, when each was recorded, and from which model commits."""

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
    parts = []
    for m in envelope.get("models", []):
        recorded, cached = m.get("revision"), _cached_revision(m["id"])
        note = ""
        if cached is None:
            note = " (not downloaded)"
        elif recorded != cached:
            note = f" (downloaded: {cached[:7]})"
        parts.append(f"{m['id'].split('/')[-1]}@{(recorded or '?')[:7]}{note}")
    return ", ".join(parts)


def show(modules: list[str]) -> None:
    envelopes = _envelopes()
    by_script: dict[str, list[str]] = {}
    for dataset, envelope in envelopes.items():
        by_script.setdefault(envelope["script"], []).append(dataset)
    for module in modules:
        ported = module in runtime.JOB_MODULES
        print(f"{module}{'' if ported else ' (not a job yet)'}")
        if ported:
            rows = [(j.name, o) for j in runtime.JOBS.values() if j.module == module for o in j.outputs]
        else:
            rows = [(None, d) for d in by_script.get(f"record/{module}.py", [])]
        for name, dataset in rows:
            envelope = envelopes.get(dataset)
            label = dataset if name in (None, dataset) else f"{dataset} ({name})"
            if not envelope:
                print(f"  {label:34} not recorded")
                continue
            print(f"  {label:34} {(envelope.get('generatedAt') or '?')[:10]}  {_models(envelope)}")
