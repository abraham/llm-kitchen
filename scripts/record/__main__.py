"""Record the site's datasets from real models (tier T0).

Usage, from the repository root:
    scripts/.venv/bin/python -m scripts.record <module> [args]   # one module, e.g. traces
    scripts/.venv/bin/python -m scripts.record all               # every module, in order
    scripts/.venv/bin/python -m scripts.record check <module>    # re-record and compare (see check.py)

Each module writes its datasets to static/data/ through common.write_dataset.
"""

import importlib
import sys

MODULES = [
    "traces",
    "embeddings",
    "quantize",
    "speculative",
    "chat",
    "reasoning",
    "prompts",
    "agent",
    "grading",
    "search",
    "routing",
    "caching",
    "injection",
    "encoder",
    "clip",
    "decisions",
]


# Modules whose main() takes names (traces: trace names; prompts: job names) to rerun only some.
TAKES_NAMES = {"traces", "prompts"}


def run(name: str, args: list[str]) -> None:
    module = importlib.import_module(f"{__package__}.{name}")
    module.main(args) if name in TAKES_NAMES else module.main()


if __name__ == "__main__":
    if sys.argv[1:2] == ["check"]:
        from . import check

        target = sys.argv[2] if len(sys.argv) > 2 else ""
        if target == "live":
            check.live()
        elif target in MODULES:
            check.recordings(run, target, sys.argv[3:])
        else:
            raise SystemExit(f"usage: python -m scripts.record check <{'|'.join(MODULES)}|live> [args]")
    elif len(sys.argv) < 2 or sys.argv[1] not in [*MODULES, "all"]:
        raise SystemExit(f"usage: python -m scripts.record <{'|'.join(MODULES)}|all|check> [args]")
    elif sys.argv[1] == "all":
        for name in MODULES:
            run(name, [])
    else:
        run(sys.argv[1], sys.argv[2:])
