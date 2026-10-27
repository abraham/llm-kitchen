"""Record the site's datasets from real models (tier T0).

Usage, from the repository root:
    scripts/.venv/bin/python -m scripts.record run prompts/pushback      # one job
    scripts/.venv/bin/python -m scripts.record run prompts               # a module's jobs
    scripts/.venv/bin/python -m scripts.record run traces the-cat-sat    # some of a module's recordings
    scripts/.venv/bin/python -m scripts.record run all                   # everything, in order
    scripts/.venv/bin/python -m scripts.record status                    # what's recorded, from what
    scripts/.venv/bin/python -m scripts.record try prompts/pushback --limit 3   # a trial, into scripts/.scratch/
    scripts/.venv/bin/python -m scripts.record check prompts/pushback    # re-record and compare (check.py)
    scripts/.venv/bin/python -m scripts.record check live
    scripts/.venv/bin/python -m scripts.record cache prune               # drop cache entries no job uses
    scripts/.venv/bin/python -m scripts.record grade prompts/pushback    # hand-grade replies a job listed

Flags, anywhere: --device cpu|mps for every model, --download to allow downloads (the runner is
offline otherwise), --force to download even when the disk is nearly full, --fresh to ignore the
generation cache (scripts/.cache/) for one run. `try` also takes --limit N, --only LABEL (repeatable),
and --set NAME=VALUE for the job's options.

Each module declares its recordings as jobs (runtime.py), which write datasets to static/data/
through common.write_dataset.
"""

import importlib
import sys

from . import runtime

MODULES = [
    "traces",
    "attention",
    "embeddings",
    "quantize",
    "speculative",
    "chat",
    "reasoning",
    "prompts",
    "agent",
    "grading",
    "search",
    "memory",
    "routing",
    "hallucination",
    "caching",
    "injection",
    "encoder",
    "clip",
    "decisions",
]

USAGE = (
    "usage: python -m scripts.record run <job|module|all> [names] [--device cpu|mps] [--download] [--force] [--fresh]\n"
    "       python -m scripts.record try <job> [--limit N] [--only LABEL] [--set NAME=VALUE]\n"
    "       python -m scripts.record status\n"
    "       python -m scripts.record check <job|module|live> [names]\n"
    "       python -m scripts.record cache prune\n"
    "       python -m scripts.record grade <dataset> [--list]\n"
    f"modules: {', '.join(MODULES)}"
)


def load_jobs() -> None:
    for name in MODULES:
        importlib.import_module(f"{__package__}.{name}")


def targets(first: str, rest: list[str]) -> list[str]:
    """`traces the-cat-sat` names the same recording as `traces/the-cat-sat`; `chat agent` names
    two modules."""
    if first == "all" or "/" in first or not rest or all(r in MODULES or "/" in r for r in rest):
        return [first, *rest]
    return [f"{first}/{name}" for name in rest]


def record(names: list[str]) -> None:
    """Run each target's jobs, each after the jobs it needs: a job, a module (all its jobs), or `all`."""
    load_jobs()
    runtime.write_manifest()
    jobs: list[str] = []
    for target in names:
        module = target.partition("/")[0]
        if target == "all":
            jobs += runtime.JOBS
        elif target in runtime.JOBS:
            jobs.append(target)
        elif target in MODULES:
            jobs += [j.name for j in runtime.JOBS.values() if j.module == module]
        else:
            raise SystemExit(f"no job or module {target}\n{USAGE}")
    for j in runtime.ordered(jobs):
        runtime.run_job(j)


def main(argv: list[str]) -> None:
    args = runtime.configure(argv)
    if not args:
        raise SystemExit(USAGE)
    command, rest = args[0], args[1:]
    trial_flags = runtime.SETTINGS.limit is not None or runtime.SETTINGS.only or runtime.SETTINGS.sets
    if trial_flags and command != "try":
        raise SystemExit("--limit, --only, and --set are for try")
    if command == "run" and rest:
        record(targets(rest[0], rest[1:]))
    elif command == "try" and len(rest) == 1:
        load_jobs()
        runtime.write_manifest()
        if rest[0] not in runtime.JOBS:
            raise SystemExit(f"no job {rest[0]}; jobs: {', '.join(sorted(runtime.JOBS))}")
        runtime.try_job(runtime.JOBS[rest[0]])
    elif command == "cache" and rest == ["prune"]:
        runtime.prune_cache()
    elif command == "grade" and rest and set(rest[1:]) <= {"--list"}:
        from .grade import grade

        grade(rest[0], listing="--list" in rest)
    elif command == "status":
        from . import status

        load_jobs()
        runtime.write_manifest()
        status.show(MODULES)
    elif command == "check" and rest:
        from . import check

        if rest[0] == "live":
            check.live()
        else:
            names = targets(rest[0], rest[1:])
            runtime.SETTINGS.fresh = True
            check.recordings(lambda: record(names), " ".join(names))
    else:
        raise SystemExit(USAGE)


if __name__ == "__main__":
    main(sys.argv[1:])
