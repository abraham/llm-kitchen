"""The recording runtime: jobs, lazily loaded models, devices, offline mode, the generation cache,
trial runs, progress, and the job manifest.

A module declares its recordings with `@job`; the runner (`__main__.py`) picks the jobs to run, gives
each a `Run`, and writes the datasets it returns through `common.write_dataset`, only once the whole
job has finished. Every model call made through `generate`, `score`, or `embed` is cached in
scripts/.cache/ by exactly what the model was given and how it decoded, so a rerun only computes
what changed.
"""

from __future__ import annotations

import datetime
import hashlib
import json
import os
import shutil
import sys
import time
from dataclasses import dataclass, field
from functools import cache
from pathlib import Path
from typing import Any, Callable, Iterable, Iterator, TypeVar

from . import common

T = TypeVar("T")

# Modules whose recordings are jobs; the others still have a main().
JOB_MODULES = ("chat", "reasoning", "prompts", "agent", "grading", "memory", "routing", "hallucination", "injection")
MANIFEST = Path(__file__).with_name("jobs.json")
LOGS = common.ROOT / "scripts" / ".logs"
CACHE = common.ROOT / "scripts" / ".cache"
USED = CACHE / "used"
SCRATCH = common.ROOT / "scripts" / ".scratch"
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
    # "causal" for text generators, "encoder" for models whose hidden states are pooled into vectors.
    kind: str = "causal"


@dataclass(frozen=True)
class Job:
    name: str
    module: str
    outputs: tuple[str, ...]
    models: tuple[ModelSpec, ...]
    device: str | None
    needs: tuple[str, ...]
    options: dict[str, Any]
    fn: Callable[[Run], dict | None]


JOBS: dict[str, Job] = {}


def job(
    *outputs: str,
    models: Iterable[ModelSpec] = (),
    device: str | None = None,
    needs: Iterable[str] = (),
    options: dict[str, Any] | None = None,
) -> Callable[[Callable[[Run], dict | None]], Callable[[Run], dict | None]]:
    """Declare a job that writes the datasets `outputs`; it's named after the first one. `options` are
    settings `try` can change for a trial with --set name=value."""
    if not outputs:
        raise ValueError("a job writes at least one dataset")

    def register(fn: Callable[[Run], dict | None]) -> Callable[[Run], dict | None]:
        module = fn.__module__.rsplit(".", 1)[-1]
        declared = Job(outputs[0], module, outputs, tuple(models), device, tuple(needs), dict(options or {}), fn)
        JOBS[declared.name] = declared
        return fn

    return register


@dataclass
class Settings:
    device: str | None = None
    download: bool = False
    force: bool = False
    fresh: bool = False
    trial: bool = False
    limit: int | None = None
    only: list[str] = field(default_factory=list)
    sets: dict[str, Any] = field(default_factory=dict)


SETTINGS = Settings()


def _value(text: str) -> Any:
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        return text


def configure(argv: list[str]) -> list[str]:
    """Read the runner's flags and return the other arguments: --device X, --download, --force,
    --fresh, and for `try`, --limit N, --only LABEL, and --set NAME=VALUE. Sets offline mode, so it
    must run before transformers is imported."""
    rest: list[str] = []
    args = iter(argv)
    for arg in args:
        flag, has_value, inline = arg.partition("=")
        if arg in ("--download", "--force", "--fresh"):
            setattr(SETTINGS, arg[2:], True)
        elif flag in ("--device", "--limit", "--only", "--set"):
            value = inline if has_value else next(args, None)
            if value is None:
                raise SystemExit(f"{flag} needs a value")
            if flag == "--device":
                if value not in ("cpu", "mps"):
                    raise SystemExit("--device takes cpu or mps")
                SETTINGS.device = value
            elif flag == "--limit":
                SETTINGS.limit = int(value)
            elif flag == "--only":
                SETTINGS.only.append(value)
            else:
                name, eq, setting = value.partition("=")
                if not eq:
                    raise SystemExit("--set takes NAME=VALUE")
                SETTINGS.sets[name] = _value(setting)
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


# Keyed by what changes the loaded weights, so specs that differ only in `stop` or name share one.
_LOADED: dict[tuple, Loaded] = {}
_TOKENIZERS: dict[str, Any] = {}
_CURRENT: Run | None = None


def _device(spec: ModelSpec) -> str:
    wanted = SETTINGS.device or (_CURRENT.job.device if _CURRENT else None) or spec.device
    if wanted == "mps":
        import torch

        if not torch.backends.mps.is_available():
            return "cpu"
    return wanted


@cache
def _revision(model_id: str) -> str:
    found = common.revision(model_id)
    if not found or len(found) != 40:
        raise SystemExit(f"{model_id}: can't tell which commit the cached files come from")
    return found


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
    hub = Path(constants.HF_HUB_CACHE)
    hub.mkdir(parents=True, exist_ok=True)
    free = shutil.disk_usage(hub).free
    log(f"downloading {spec.id}: {missing / 1e9:.1f} GB, {free / 1e9:.0f} GB free")
    if free - missing < MIN_FREE_BYTES and not SETTINGS.force:
        raise SystemExit(
            f"downloading {spec.id} would leave {(free - missing) / 1e9:.1f} GB free, under "
            f"{MIN_FREE_BYTES / 1e9:.0f} GB; free some space or add --force"
        )


def _not_downloaded(spec: ModelSpec, error: Exception) -> SystemExit:
    return SystemExit(f"{spec.id} isn't downloaded ({error}); run again with --download")


def tokenizer(spec: ModelSpec) -> Any:
    """The model's tokenizer, without loading the model, so fully cached runs never load it."""
    if spec.id not in _TOKENIZERS:
        _check_download(spec)
        from transformers import AutoTokenizer

        try:
            _TOKENIZERS[spec.id] = AutoTokenizer.from_pretrained(spec.id)
        except OSError as error:
            if SETTINGS.download:
                raise
            raise _not_downloaded(spec, error) from None
    return _TOKENIZERS[spec.id]


def loaded(spec: ModelSpec) -> Loaded:
    """The model and tokenizer, loaded on first use and kept for the rest of the process."""
    device = _device(spec)
    key = (spec.id, device, spec.dtype, spec.attention, spec.kind)
    if key not in _LOADED:
        tok = tokenizer(spec)
        import torch
        from transformers import AutoModel, AutoModelForCausalLM

        started = time.time()
        options: dict[str, Any] = {"dtype": getattr(torch, spec.dtype)}
        if spec.attention:
            options["attn_implementation"] = spec.attention
        cls = AutoModel if spec.kind == "encoder" else AutoModelForCausalLM
        try:
            model = cls.from_pretrained(spec.id, **options).to(device).eval()
        except OSError as error:
            if SETTINGS.download:
                raise
            raise _not_downloaded(spec, error) from None
        _LOADED[key] = Loaded(spec, model, tok, device)
        log(f"loaded {spec.name} on {device} in {time.time() - started:.1f} s")
    found = _LOADED[key]
    if _CURRENT:
        _CURRENT.used[spec.id] = found
    return found


def info(spec: ModelSpec) -> dict:
    """How a dataset names a model: its id, display name, and the commit its files come from."""
    return {"id": spec.id, "displayName": spec.name, "revision": common.revision(spec.id)}


# --- The generation cache ---------------------------------------------------------------------


@cache
def _versions() -> dict[str, str]:
    import torch
    import transformers

    return {"torch": torch.__version__, "transformers": transformers.__version__}


def _cached(call: str, spec: ModelSpec, inputs: dict, compute: Callable[[], Any], readable: dict | None = None) -> Any:
    """`compute()`'s result for this model, call, and input, from the cache when it's there."""
    device = _device(spec)
    key = {
        "call": call,
        "model": spec.id,
        "revision": _revision(spec.id),
        "dtype": spec.dtype,
        "device": device,
        **({"attention": spec.attention} if spec.attention else {}),
        "inputs": inputs,
        **_versions(),
    }
    digest = hashlib.sha256(json.dumps(key, sort_keys=True, ensure_ascii=False).encode()).hexdigest()
    path = CACHE / f"{spec.id.replace('/', '--')}@{key['revision'][:12]}" / f"{digest}.json"
    if _CURRENT:
        _CURRENT.calls += 1
        _CURRENT.keys.add(digest)
        # A model the job reads through the cache still ran on this device, as far as the data goes.
        _CURRENT.devices[spec.id] = {"device": device, "dtype": spec.dtype}
    if path.exists() and not SETTINGS.fresh:
        if _CURRENT:
            _CURRENT.cached += 1
        return json.loads(path.read_text())["output"]
    output = compute()
    path.parent.mkdir(parents=True, exist_ok=True)
    entry = {"key": key, "readable": readable or {}, "output": output}
    tmp = path.with_suffix(".tmp")
    tmp.write_text(json.dumps(entry, ensure_ascii=False))
    tmp.replace(path)
    return output


def prune_cache() -> None:
    """Delete entries no job asked for in its last full run, and entries made with other package
    versions or model commits than the ones in use now."""
    used: set[str] = set()
    for path in USED.glob("*.json"):
        used.update(json.loads(path.read_text()))
    kept = removed = 0
    for path in CACHE.glob("*@*/*.json"):
        key = json.loads(path.read_text())["key"]
        try:
            current = common.revision(key["model"])
        except Exception:
            current = None
        stale = any(key.get(k) != v for k, v in _versions().items()) or key["revision"] != current
        if path.stem in used and not stale:
            kept += 1
        else:
            path.unlink()
            removed += 1
    for folder in CACHE.glob("*@*"):
        if folder.is_dir() and not any(folder.iterdir()):
            folder.rmdir()
    log(f"cache: kept {kept} entries, removed {removed}")


# --- Model calls ------------------------------------------------------------------------------


def generate(
    spec: ModelSpec,
    prompt: str,
    *,
    max_new_tokens: int,
    do_sample: bool = False,
    seed: int | None = None,
    scores: bool = False,
    **settings: Any,
) -> dict:
    """The new token ids of each sequence the model generates after `prompt` (`sequences`), and with
    `scores`, the log-probability it gave each token it chose in the first one (`logprobs`). Other
    settings (temperature, top_p, top_k, repetition_penalty, num_return_sequences, pad_token_id,
    stop_strings) go to `model.generate`. A sampled call seeds PyTorch right before it runs."""
    tok = tokenizer(spec)
    ids = tok(prompt, return_tensors="pt").input_ids
    inputs = {
        "ids": ids[0].tolist(),
        "max_new_tokens": max_new_tokens,
        "do_sample": do_sample,
        "seed": seed,
        "scores": scores,
        **settings,
    }

    def compute() -> dict:
        import torch

        m = loaded(spec)
        extra = {"tokenizer": tok} if "stop_strings" in settings else {}
        if seed is not None:
            torch.manual_seed(seed)
        with torch.no_grad():
            out = m.model.generate(
                ids.to(m.device),
                max_new_tokens=max_new_tokens,
                do_sample=do_sample,
                output_scores=scores,
                return_dict_in_generate=True,
                **settings,
                **extra,
            )
        sequences = out.sequences[:, ids.shape[1] :].tolist()
        result: dict = {"sequences": sequences}
        if scores:
            result["logprobs"] = [
                torch.log_softmax(s[0].float(), dim=-1)[t].item() for s, t in zip(out.scores, sequences[0])
            ]
        return result

    result = _cached("generate", spec, inputs, compute, {"prompt": prompt})
    if SETTINGS.trial:
        for sequence in result["sequences"]:
            log("    reply: " + tok.decode(sequence, skip_special_tokens=True).strip())
    return result


def complete(spec: ModelSpec, prompt: str, max_new_tokens: int = 400) -> dict:
    """Greedy continuation of `prompt`, as text, with how many tokens it took and whether it ended."""
    tok = tokenizer(spec)
    new = generate(spec, prompt, max_new_tokens=max_new_tokens, pad_token_id=tok.eos_token_id)["sequences"][0]
    stops = {tok.eos_token_id, *(tok.convert_tokens_to_ids(s) for s in spec.stop)}
    stopped = bool(new) and new[-1] in stops
    if stopped:
        new = new[:-1]
    return {"text": tok.decode(new).strip(), "tokens": len(new), "stopped": stopped}


def template(spec: ModelSpec, messages: list[dict], **options: Any) -> str:
    """The text the model reads for a chat, ending where the assistant's reply starts. Options such
    as `tools` or `enable_thinking` go to the chat template."""
    return tokenizer(spec).apply_chat_template(messages, tokenize=False, add_generation_prompt=True, **options)


def chat(spec: ModelSpec, messages: list[dict], max_new_tokens: int = 400) -> dict:
    """The assistant's greedy reply to a chat."""
    return complete(spec, template(spec, messages), max_new_tokens)


def score(spec: ModelSpec, prompt: str, answer: str) -> float:
    """Probability that the model continues `prompt` with every token of `answer`."""
    tok = tokenizer(spec)
    p_ids = tok(prompt, return_tensors="pt", add_special_tokens=False).input_ids
    a_ids = tok(answer, return_tensors="pt", add_special_tokens=False).input_ids

    def compute() -> float:
        import torch

        m = loaded(spec)
        ids = torch.cat([p_ids, a_ids], dim=1).to(m.model.device)
        with torch.no_grad():
            logp = m.model(ids).logits[0].float().log_softmax(-1)
        start = p_ids.shape[1]
        return float(sum(logp[start - 1 + j, t] for j, t in enumerate(a_ids[0].tolist())).exp())

    inputs = {"prompt": p_ids[0].tolist(), "answer": a_ids[0].tolist()}
    return _cached("score", spec, inputs, compute, {"prompt": prompt, "answer": answer})


def embed(spec: ModelSpec, texts: list[str]) -> list[list[float]]:
    """Mean-pooled, normalized vectors for `texts`, embedded together in one padded batch."""

    def compute() -> list[list[float]]:
        import torch

        m = loaded(spec)
        batch = m.tokenizer(texts, padding=True, truncation=True, return_tensors="pt").to(m.device)
        with torch.no_grad():
            hidden = m.model(**batch).last_hidden_state
        mask = batch.attention_mask.unsqueeze(-1).float()
        return torch.nn.functional.normalize((hidden * mask).sum(1) / mask.sum(1), dim=-1).tolist()

    return _cached("embed", spec, {"texts": texts}, compute)


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
    devices: dict[str, dict] = field(default_factory=dict)
    calls: int = 0
    cached: int = 0
    keys: set[str] = field(default_factory=set)
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

    @property
    def trial(self) -> bool:
        """Whether this is a `try` run, writing to scratch; checks against recorded text can't hold."""
        return SETTINGS.trial

    def option(self, name: str) -> Any:
        """A setting the job declared, or the value `try --set` gave it."""
        if name not in self.job.options:
            raise SystemExit(f"{self.job.name} has no option {name}")
        return SETTINGS.sets.get(name, self.job.options[name])

    def log(self, message: str) -> None:
        log(message)

    def items(self, items: Iterable[T], label: Callable[[T], str] = str) -> Iterator[T]:
        """Yield each item, logging a progress line when the job is done with it. In a trial, only
        the items --only names (by part of their label), and at most --limit of them."""
        items = list(items)
        if SETTINGS.trial and SETTINGS.only:
            items = [x for x in items if any(o.lower() in label(x).lower() for o in SETTINGS.only)]
        if SETTINGS.trial and SETTINGS.limit is not None:
            items = items[: SETTINGS.limit]
        for i, item in enumerate(items, 1):
            started, calls, cached = time.time(), self.calls, self.cached
            yield item
            took = time.time() - started
            text = " ".join(label(item).split())
            counts = f"{self.calls - calls} calls, {self.cached - cached} cached"
            log(f"[{i}/{len(items)}] {self.job.name}  {text}  {counts}  {took:.1f} s")

    def write(self, dataset_id: str, data: dict) -> None:
        """Keep a dataset to write when the job finishes; only the job's own outputs are allowed."""
        if dataset_id not in self.job.outputs:
            raise SystemExit(f"{self.job.name} doesn't declare {dataset_id}")
        self.pending.append((dataset_id, data))


def run_job(declared: Job) -> list[Path]:
    """Run one job and, if it finishes, write its datasets."""
    global _CURRENT, _LOG_FILE
    unknown = set(SETTINGS.sets) - set(declared.options)
    if unknown:
        raise SystemExit(f"{declared.name} has no option {', '.join(sorted(unknown))}")
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
        devices = {**run.devices, **{i: {"device": m.device, "dtype": m.spec.dtype} for i, m in run.used.items()}}
        written = [
            common.write_dataset(i, d, declared.module, job=declared.name, source=_versions(), devices=devices)
            for i, d in run.pending
        ]
        if not SETTINGS.trial:
            USED.mkdir(parents=True, exist_ok=True)
            (USED / f"{declared.name.replace('/', '-')}.json").write_text(json.dumps(sorted(run.keys)))
    finally:
        _CURRENT = None
    took = time.time() - started
    log(f"{declared.name}: {run.calls} model calls, {run.cached} cached, {len(written)} files, {took:.0f} s")
    _LOG_FILE = None
    return written


def try_job(declared: Job) -> None:
    """Run a job's own code as a trial, writing to scripts/.scratch/<job>/ and printing every reply."""
    SETTINGS.trial = True
    common.OUTPUT = SCRATCH / declared.name.replace("/", "-")
    try:
        run_job(declared)
    finally:
        common.OUTPUT = common.DATA


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
    """jobs.json: every job, the datasets it writes, its models, what it needs, and its options."""
    manifest = {
        name: {
            "module": j.module,
            "outputs": list(j.outputs),
            "models": list(dict.fromkeys(m.id for m in j.models)),
            "needs": list(j.needs),
            "options": sorted(j.options),
        }
        for name, j in sorted(JOBS.items())
    }
    text = json.dumps(manifest, indent="\t") + "\n"
    if not MANIFEST.exists() or MANIFEST.read_text() != text:
        MANIFEST.write_text(text)
