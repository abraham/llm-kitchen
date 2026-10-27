# Recording pipeline

Plan for reworking `scripts/record/`, the Python package that runs real models offline and writes
the datasets the widgets show (tier T0, [models-and-data.md](models-and-data.md#recording-scripts)).
What a widget receives doesn't change: the same files under `static/data/`, the same envelope, the
same registry and parsers ([architecture.md](architecture.md#datasets)). What changes is how the
files are made: faster to iterate on, cheaper to rerun, and with grading that can't drift from the
text it grades. [roadmap.md](roadmap.md) points here. When a phase lands, its part moves into the
spec it belongs to ([Specs that change](#specs-that-change)) and leaves this file.

Phases 1 to 3 are built: jobs, lazily loaded models, devices, offline mode with the disk check,
progress and logs, `status`, the job manifest, the envelope's `job` and `source`, `check` showing
where files differ, the generation cache, `try` with options, `cache prune`, verdicts computed by
the site, and hand grades with `grade`, with every module that runs a Qwen model ported.
[models-and-data.md](models-and-data.md#recording-scripts) describes them. What follows is the
rest.

## Goals

- **Widgets don't notice.** Every dataset keeps its id, file, shape, and parser. Porting a module
  must leave its files identical apart from `generatedAt`; `check` proves it.
- **Never generate the same reply twice.** Model calls are cached by exactly what the model was
  given and how it decoded, so rerunning a job after changing its grading, its output shape, or one
  of twenty prompts generates only what changed, and a crashed run resumes where it stopped.
- **Explore with the real code.** Trying an idea runs the job's own code on a few items, into a
  scratch folder, through the same cache. When the idea works, the real recording reuses every reply
  the trial made.
- **One source for each verdict.** A verdict code can compute is written once, in TypeScript, next
  to the widget that shows it. A verdict a person makes is stored once, tied to the exact text it
  judged, and is asked for again when that text changes.
- **Load only what a job needs.** Running one job loads only its models, once, however many jobs
  share them.
- **Show progress.** Long runs say what they are doing, how far along they are, and how much came
  from the cache, even when their output is piped.
- **Still reproducible by anyone.** Greedy decoding or fixed seeds, pinned packages, and pinned
  model commits stay; the cache only skips work, and `check` always runs without it.

## Jobs for the other modules

The modules that run GPT-2, MiniLM, BERT, and CLIP move to jobs in phase 4. They need more than the
causal models and the MiniLM encoder the runtime loads now:

- `ModelSpec`'s `kind` gains a masked LM (BERT) and CLIP, each loaded with the right Transformers
  class.
- `run.forward` (logits, attention, or hidden states for one input, not cached: its tensors are
  large and the models it serves are fast) and a cached `run.embed_image` join `generate`, `score`,
  and `embed`. A module that needs something else, like the quantizer or the Decision
  Transformer's training loop, keeps using the loaded model directly through `run.model(spec)`.
- `traces` writes one dataset per trace, so its job declares them all and writes each with
  `run.write(id, data)`; `run traces/the-cat-sat` keeps rerunning one.
- `search` reads the context run, so it declares `needs=["agent/chat"]`, as `grading` and `memory`
  do.

## Status

`status` gains a column: whether a run now would be fully cached (nothing the job depends on has
changed).

## Grading

`reasoning/thinking` still stores `final` and `correct` from Python; it moves to the TypeScript
graders with the phase 4 ports. A grader shared by one chapter's widgets only can live in that
chapter as `grade.ts` instead of `src/lib/grading/`.

## Output

The envelope's `job` and `source`, and each model's `device` and `dtype`, are optional in the
parser in `registry.ts` until every module is ported, then required.

## Checks

- `check` runs without the cache, so it always proves the files can be made again from the models.
  For a hand-graded dataset it needs the replies to come out the same, or it stops for grading.
- **Python tests in CI.** `scripts/tests/` runs with `pytest` in a CI job that downloads no model:
  the cache key (every field changes it; key order doesn't), cache hits and `--fresh`, grade hashes
  and stale grades, dependency order, `try` writing only to the scratch folder, and the envelope.
  The tests use a tiny stand-in model built in the test, so they run in seconds. `pytest` is pinned
  in `scripts/requirements-dev.txt`.

## Phases

One pull request per phase; each passes every check in [quality.md](quality.md), and `check` shows
each ported module's files unchanged.

1. **Runtime.** Built.
2. **Cache and trying.** Built.
3. **Grading.** Built.
4. **The rest.** `traces`, `attention`, `embeddings`, `quantize`, `speculative`, `caching`,
   `search`, `encoder`, `clip`, and `decisions`; then the old command form and
   `main()` are removed, and the envelope's new fields become required.

## Specs that change

- [models-and-data.md](models-and-data.md): the table of modules gains the jobs.
- [quality.md](quality.md): the Python test job.
- The README's recording steps, and [roadmap.md](roadmap.md).

## Open questions

- **Sharing the cache.** A cache committed or stored as a release artifact would let a second
  machine rerun every job without a GPU. Proposal: no; it would hold several hundred MB of replies
  nobody reviews, and `check` must regenerate anyway. Revisit if recording moves to CI.
- **A model as grader.** Hand grades could be drafted by a strong model and confirmed by a person.
  Proposal: not yet; [Did it work?](chapters/testing-agents.md) shows why a model's grades need
  checking, and the datasets are small enough to grade by hand.
