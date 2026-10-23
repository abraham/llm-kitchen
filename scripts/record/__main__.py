"""Record the site's datasets from real models (tier T0).

Usage, from the repository root:
    scripts/.venv/bin/python -m scripts.record <module> [args]   # one module, e.g. traces
    scripts/.venv/bin/python -m scripts.record all               # every module, in order

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
    "caching",
    "injection",
    "encoder",
    "clip",
]


# Modules whose main() takes names (traces: trace names; prompts: job names) to rerun only some.
TAKES_NAMES = {"traces", "prompts"}


def run(name: str, args: list[str]) -> None:
    module = importlib.import_module(f"{__package__}.{name}")
    module.main(args) if name in TAKES_NAMES else module.main()


if __name__ == "__main__":
    if len(sys.argv) < 2 or sys.argv[1] not in [*MODULES, "all"]:
        raise SystemExit(f"usage: python -m scripts.record <{'|'.join(MODULES)}|all> [args]")
    if sys.argv[1] == "all":
        for name in MODULES:
            run(name, [])
    else:
        run(sys.argv[1], sys.argv[2:])
