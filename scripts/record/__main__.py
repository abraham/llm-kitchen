"""Record the site's datasets from real models (tier T0).

Usage, from the repository root:
    scripts/.venv/bin/python -m scripts.record run prompts/pushback      # one job
    scripts/.venv/bin/python -m scripts.record run prompts               # a module's jobs
    scripts/.venv/bin/python -m scripts.record run traces the-cat-sat    # some of a module's recordings
    scripts/.venv/bin/python -m scripts.record run all                   # everything, in order
    scripts/.venv/bin/python -m scripts.record status                    # what's recorded, from what
    scripts/.venv/bin/python -m scripts.record check prompts/pushback    # re-record and compare (check.py)
    scripts/.venv/bin/python -m scripts.record check live

Flags, anywhere: --device cpu|mps for every model, --download to allow downloads (the runner is
offline otherwise), --force to download even when the disk is nearly full. The old form,
`python -m scripts.record <module> [names]`, still works.

Modules in runtime.JOB_MODULES declare jobs (runtime.py); the others still have a main(). Either way
datasets are written to static/data/ through common.write_dataset.
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

# Modules not yet ported to jobs whose main() takes names (traces: trace names) to rerun only some.
TAKES_NAMES = {"traces"}
USAGE = (
    "usage: python -m scripts.record run <job|module|all> [names] [--device cpu|mps] [--download] [--force]\n"
    "       python -m scripts.record status\n"
    "       python -m scripts.record check <job|module|live> [names]\n"
    f"modules: {', '.join(MODULES)}"
)


def load_jobs() -> None:
    for name in runtime.JOB_MODULES:
        importlib.import_module(f"{__package__}.{name}")


def targets(first: str, rest: list[str]) -> list[str]:
    """`traces the-cat-sat` names the same recording as `traces/the-cat-sat`."""
    if first == "all" or "/" in first or not rest:
        return [first, *rest]
    return [f"{first}/{name}" for name in rest]


def record(names: list[str]) -> None:
    """Run each target in order: a job, a module (all its jobs), a module/name, or `all`."""
    load_jobs()
    runtime.write_manifest()
    steps: list[tuple[str, list[str]]] = []  # ("jobs", job names) or (module, main() args)
    for target in names:
        module, _, name = target.partition("/")
        if target == "all":
            for m in MODULES:
                steps.append(_step(m, ""))
        elif module not in MODULES:
            raise SystemExit(f"no module {module}\n{USAGE}")
        else:
            steps.append(_step(module, name))
    pending: list[str] = []
    for kind, args in [*steps, ("end", [])]:
        if kind == "jobs":
            pending += args
            continue
        for j in runtime.ordered(pending):
            runtime.run_job(j)
        pending = []
        if kind != "end":
            main = importlib.import_module(f"{__package__}.{kind}").main
            main(args) if kind in TAKES_NAMES else main()


def _step(module: str, name: str) -> tuple[str, list[str]]:
    if module in runtime.JOB_MODULES:
        if name:
            return ("jobs", [f"{module}/{name}"])
        return ("jobs", [j.name for j in runtime.JOBS.values() if j.module == module])
    if name and module not in TAKES_NAMES:
        raise SystemExit(f"{module} records everything at once; run it without a name")
    return (module, [name] if name else [])


def main(argv: list[str]) -> None:
    args = runtime.configure(argv)
    if not args:
        raise SystemExit(USAGE)
    command, rest = args[0], args[1:]
    if command == "run" and rest:
        record(targets(rest[0], rest[1:]))
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
            check.recordings(lambda: record(names), " ".join(names))
    elif command in MODULES or command == "all":
        record(targets(command, rest))
    else:
        raise SystemExit(USAGE)


if __name__ == "__main__":
    main(sys.argv[1:])
