"""`grade <dataset>`: give a verdict and a reason for each reply a job couldn't find a hand grade for.

The job that met the replies lists them in scripts/.cache/grading/; grades are saved, with a SHA-256
of the exact text graded, in scripts/record/grades/<dataset>.json, which is committed. `--list`
prints the replies instead, for grading in an editor.
"""

from __future__ import annotations

import json

from . import runtime


def _show(item: dict) -> None:
    print(f"\n=== {item['label']}")
    for key, value in item["context"].items():
        print(f"--- {key}:\n{value}")
    print(f"--- reply:\n{item['text']}")
    if item["earlier"]:
        e = item["earlier"]
        print(f"--- graded before (a different text): {e['verdict']}: {e['reason']}")


def grade(dataset: str, listing: bool = False) -> None:
    path = runtime.pending_file(dataset)
    items = json.loads(path.read_text()) if path.exists() else []
    if not items:
        print(f"{dataset}: nothing to grade")
        return
    if listing:
        for item in items:
            _show(item)
            print(f"--- add to {runtime.grades_file(dataset).relative_to(runtime.common.ROOT)}:")
            entry = {"label": item["label"], "hash": item["hash"], "verdict": "/".join(item["verdicts"]), "reason": ""}
            print(json.dumps(entry, ensure_ascii=False))
        return
    grades = runtime.load_grades(dataset)
    left = list(items)
    for item in items:
        _show(item)
        verdict = ""
        while verdict not in item["verdicts"] and verdict != "skip":
            verdict = input(f"verdict ({', '.join(item['verdicts'])}, or skip): ").strip()
        if verdict == "skip":
            continue
        reason = ""
        while not reason:
            reason = input("reason, in one line: ").strip()
        entry = {"label": item["label"], "hash": item["hash"], "verdict": verdict, "reason": reason}
        at = next((i for i, g in enumerate(grades) if g["label"] == item["label"]), None)
        if at is None:
            grades.append(entry)
        else:
            grades[at] = entry
        runtime.save_grades(dataset, grades)
        left.remove(item)
        path.write_text(json.dumps(left, ensure_ascii=False, indent="\t"))
    if not left:
        path.unlink()
    print(f"\n{dataset}: {len(items) - len(left)} graded, {len(left)} left. Run the job again to write the dataset.")
