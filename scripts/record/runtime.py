"""The recording runtime: jobs, lazily loaded models, devices, offline mode, progress, and the
job manifest.

A module declares its recordings with `@job`; the runner (`__main__.py`) picks the jobs to run, gives
each a `Run`, and writes the datasets it returns through `common.write_dataset`, only once the whole
job has finished.
"""

from __future__ import annotations

import datetime
import json
import os
import shutil
import sys
import time
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Callable, Iterable, Iterator, TypeVar

from . import common

T = TypeVar("T")

# Modules whose recordings are jobs; the others still have a main().
JOB_MODULES = ("prompts",)
MANIFEST = Path(__file__).with_name("jobs.json")
LOGS = common.ROOT / "scripts" / ".logs"
# A download may not leave less than this much free disk, unless --force.
MIN_FREE_BYTES = 10 * 1000**3


@dataclass(frozen=True)
class ModelSpec:
    """A model a job runs. Its revision is read from the cached files when it's recorded."""

    id: str
    name: str
    dtype: str = "float32"
    # Where it runs unless the job or --device says otherwise; "mps" falls back to "cpu".
    device: str = "cpu"
    attention: str | None = None
    # Tokens besides the tokenizer's end-of-sequence token that mean the reply ended.
    stop: tuple[str, ...] = ()


@dataclass(frozen=True)
class Job:
    name: str
    module: str
    outputs: tuple[str, ...]
    models: tuple[ModelSpec, ...]
    device: str | None
    needs: tuple[str, ...]
    fn: Callable[[Run], dict | None]


JOBS: dict[str, Job] = {}


def job(
    *outputs: str,
    models: Iterable[ModelSpec] = (),
    device: str | None = None,
    needs: Iterable[str] = (),
) -> Callable[[Callable[[Run], dict | None]], Callable[[Run], dict | None]]:
    """Declare a job that writes the datasets `outputs`; it's named after the first one."""
    if not outputs:
        raise ValueError("a job writes at least one dataset")

    def register(fn: Callable[[Run], dict | None]) -> Callable[[Run], dict | None]:
        declared = Job(
            outputs[0], fn.__module__.rsplit(".", 1)[-1], outputs, tuple(models), device, tuple(needs), fn
        )
        JOBS[declared.name] = declared
        return fn

    return register


@dataclass
class Settings:
    device: str | None = None
    download: bool = False
    force: bool = False


SETTINGS = Settings()


def configure(argv: list[str]) -> list[str]:
    """Read the runner's flags (--device X, --download, --force) and return the other arguments.
    Sets offline mode, so it must run before transformers is imported."""
    rest: list[str] = []
    args = iter(argv)
    for arg in args:
        if arg == "--download":
            SETTINGS.download = True
        elif arg == "--force":
            SETTINGS.force = True
        elif arg == "--device":
            SETTINGS.device = next(args, None)
            if SETTINGS.device not in ("cpu", "mps"):
                raise SystemExit("--device takes cpu or mps")
        elif arg.startswith("--device="):
            SETTINGS.device = arg.partition("=")[2]
        else:
            rest.append(arg)
    if not SETTINGS.download:
        os.environ["HF_HUB_OFFLINE"] = "1"
    try:
        sys.stdout.reconfigure(line_buffering=True)  # type: ignore[union-attr]
    except AttributeError:
        pass
    return rest


# --- Models -----------------------------------------------------------------------------------


@dataclass
class Loaded:
    spec: ModelSpec
    model: Any
    tokenizer: Any
    device: str


_LOADED: dict[tuple[str, str], Loaded] = {}
_CURRENT: Run | None = None


def _device(spec: ModelSpec) -> str:
    wanted = SETTINGS.device or (_CURRENT.job.device if _CURRENT else None) or spec.device
    if wanted == "mps":
        import torch

        if not torch.backends.mps.is_available():
            return "cpu"
    return wanted


def _missing_bytes(model_id: str) -> int:
    """How much of the model's repository isn't in the Hugging Face cache yet."""
    from huggingface_hub import HfApi, try_to_load_from_cache

    info = HfApi().model_info(model_id, files_metadata=True)
    skip = (".bin", ".h5", ".msgpack", ".onnx", ".gguf", ".ot", ".tflite", ".mlmodel")
    missing = 0
    for f in info.siblings or []:
        if f.rfilename.endswith(skip) or "/" in f.rfilename:
            continue
        if not isinstance(try_to_load_from_cache(model_id, f.rfilename, revision=info.sha), str):
            missing += f.size or 0
    return missing


def _check_download(spec: ModelSpec) -> None:
    """With --download, say how big the download is and refuse one that would fill the disk."""
    if not SETTINGS.download:
        return
    from huggingface_hub import constants

    missing = _missing_bytes(spec.id)
    if not missing:
        return
    cache = Path(constants.HF_HUB_CACHE)
    cache.mkdir(parents=True, exist_ok=True)
    free = shutil.disk_usage(cache).free
    log(f"downloading {spec.id}: {missing / 1e9:.1f} GB, {free / 1e9:.0f} GB free")
    if free - missing < MIN_FREE_BYTES and not SETTINGS.force:
        raise SystemExit(
            f"downloading {spec.id} would leave {(free - missing) / 1e9:.1f} GB free, under "
            f"{MIN_FREE_BYTES / 1e9:.0f} GB; free some space or add --force"
        )


def loaded(spec: ModelSpec) -> Loaded:
    """The model and tokenizer, loaded on first use and kept for the rest of the process."""
    device = _device(spec)
    key = (spec.id, device)
    if key not in _LOADED:
        _check_download(spec)
        import torch
        from transformers import AutoModelForCausalLM, AutoTokenizer

        started = time.time()
        options: dict[str, Any] = {"dtype": getattr(torch, spec.dtype)}
        if spec.attention:
            options["attn_implementation"] = spec.attention
        try:
            tokenizer = AutoTokenizer.from_pretrained(spec.id)
            model = AutoModelForCausalLM.from_pretrained(spec.id, **options).to(device).eval()
        except OSError as error:
            if SETTINGS.download:
                raise
            raise SystemExit(f"{spec.id} isn't downloaded ({error}); run again with --download") from None
        _LOADED[key] = Loaded(spec, model, tokenizer, device)
        log(f"loaded {spec.name} on {device} in {time.time() - started:.1f} s")
    found = _LOADED[key]
    if _CURRENT:
        _CURRENT.used[spec.id] = found
    return found


def info(spec: ModelSpec) -> dict:
    """How a dataset names a model: its id, display name, and the commit its files come from."""
    return {"id": spec.id, "displayName": spec.name, "revision": common.revision(spec.id)}


def _count_call() -> None:
    if _CURRENT:
        _CURRENT.calls += 1


def complete(spec: ModelSpec, prompt: str, max_new_tokens: int = 400) -> dict:
    """Greedy continuation of `prompt`, as text, with how many tokens it took and whether it ended."""
    import torch

    _count_call()
    m = loaded(spec)
    tok = m.tokenizer
    ids = tok(prompt, return_tensors="pt").input_ids.to(m.device)
    with torch.no_grad():
        out = m.model.generate(ids, max_new_tokens=max_new_tokens, do_sample=False, pad_token_id=tok.eos_token_id)
    new = out[0, ids.shape[1] :].tolist()
    stops = {tok.eos_token_id, *(tok.convert_tokens_to_ids(s) for s in spec.stop)}
    stopped = bool(new) and new[-1] in stops
    if stopped:
        new = new[:-1]
    return {"text": tok.decode(new).strip(), "tokens": len(new), "stopped": stopped}


def template(spec: ModelSpec, messages: list[dict]) -> str:
    """The text the model reads for a chat, ending where the assistant's reply starts."""
    return loaded(spec).tokenizer.apply_chat_template(messages, tokenize=False, add_generation_prompt=True)


def chat(spec: ModelSpec, messages: list[dict], max_new_tokens: int = 400) -> dict:
    """The assistant's greedy reply to a chat."""
    return complete(spec, template(spec, messages), max_new_tokens)


def score(spec: ModelSpec, prompt: str, answer: str) -> float:
    """Probability that the model continues `prompt` with every token of `answer`."""
    import torch

    _count_call()
    m = loaded(spec)
    p_ids = m.tokenizer(prompt, return_tensors="pt", add_special_tokens=False).input_ids
    a_ids = m.tokenizer(answer, return_tensors="pt", add_special_tokens=False).input_ids
    ids = torch.cat([p_ids, a_ids], dim=1).to(m.model.device)
    with torch.no_grad():
        logp = m.model(ids).logits[0].float().log_softmax(-1)
    start = p_ids.shape[1]
    return float(sum(logp[start - 1 + j, t] for j, t in enumerate(a_ids[0].tolist())).exp())


# --- Runs -------------------------------------------------------------------------------------


_LOG_FILE: Path | None = None


def log(message: str) -> None:
    """Print a line at once, even when piped, and add it to the current job's log file."""
    print(message, flush=True)
    if _LOG_FILE:
        with _LOG_FILE.open("a") as f:
            f.write(message + "\n")


@dataclass
class Run:
    job: Job
    used: dict[str, Loaded] = field(default_factory=dict)
    calls: int = 0
    pending: list[tuple[str, dict]] = field(default_factory=list)

    def model(self, spec: ModelSpec) -> Loaded:
        return loaded(spec)

    def info(self, spec: ModelSpec) -> dict:
        return info(spec)

    def chat(self, spec: ModelSpec, messages: list[dict], max_new_tokens: int = 400) -> dict:
        return chat(spec, messages, max_new_tokens)

    def complete(self, spec: ModelSpec, prompt: str, max_new_tokens: int = 400) -> dict:
        return complete(spec, prompt, max_new_tokens)

    def score(self, spec: ModelSpec, prompt: str, answer: str) -> float:
        return score(spec, prompt, answer)

    def log(self, message: str) -> None:
        log(message)

    def items(self, items: Iterable[T], label: Callable[[T], str] = str) -> Iterator[T]:
        """Yield each item, logging a progress line when the job is done with it."""
        items = list(items)
        for i, item in enumerate(items, 1):
            started, calls = time.time(), self.calls
            yield item
            took = time.time() - started
            text = " ".join(label(item).split())
            log(f"[{i}/{len(items)}] {self.job.name}  {text}  {self.calls - calls} calls  {took:.1f} s")

    def write(self, dataset_id: str, data: dict) -> None:
        """Keep a dataset to write when the job finishes; only the job's own outputs are allowed."""
        if dataset_id not in self.job.outputs:
            raise SystemExit(f"{self.job.name} doesn't declare {dataset_id}")
        self.pending.append((dataset_id, data))


def _source() -> dict:
    import torch
    import transformers

    return {"torch": torch.__version__, "transformers": transformers.__version__}


def run_job(declared: Job) -> list[Path]:
    """Run one job and, if it finishes, write its datasets."""
    global _CURRENT, _LOG_FILE
    LOGS.mkdir(parents=True, exist_ok=True)
    _LOG_FILE = LOGS / f"{declared.name.replace('/', '-')}-{datetime.date.today().isoformat()}.log"
    started = time.time()
    log(f"{declared.name}: started {datetime.datetime.now().isoformat(timespec='seconds')}")
    run = Run(declared)
    _CURRENT = run
    try:
        data = declared.fn(run)
        if data is not None:
            run.write(declared.outputs[0], data)
        devices = {i: {"device": m.device, "dtype": m.spec.dtype} for i, m in run.used.items()}
        written = [
            common.write_dataset(i, d, declared.module, job=declared.name, source=_source(), devices=devices)
            for i, d in run.pending
        ]
    finally:
        _CURRENT = None
    log(f"{declared.name}: {run.calls} model calls, {len(written)} files, {time.time() - started:.0f} s")
    _LOG_FILE = None
    return written


def ordered(names: Iterable[str]) -> list[Job]:
    """The named jobs, each after the jobs it needs (when those are being run too)."""
    wanted = list(dict.fromkeys(names))
    for name in wanted:
        if name not in JOBS:
            raise SystemExit(f"no job {name}; jobs: {', '.join(sorted(JOBS))}")
    done: list[str] = []
    visiting: set[str] = set()

    def visit(name: str) -> None:
        if name in done:
            return
        if name in visiting:
            raise SystemExit(f"jobs depend on each other in a cycle through {name}")
        visiting.add(name)
        for need in JOBS[name].needs:
            if need in wanted:
                visit(need)
        visiting.discard(name)
        done.append(name)

    for name in wanted:
        visit(name)
    return [JOBS[n] for n in done]


def write_manifest() -> None:
    """jobs.json: every job, the datasets it writes, its models, and what it needs."""
    manifest = {
        name: {
            "module": j.module,
            "outputs": list(j.outputs),
            "models": [m.id for m in j.models],
            "needs": list(j.needs),
        }
        for name, j in sorted(JOBS.items())
    }
    text = json.dumps(manifest, indent="\t") + "\n"
    if not MANIFEST.exists() or MANIFEST.read_text() != text:
        MANIFEST.write_text(text)
