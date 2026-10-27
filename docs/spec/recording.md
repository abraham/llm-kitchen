# Recording pipeline

Plan for reworking `scripts/record/`, the Python package that runs real models offline and writes
the datasets the widgets show (tier T0, [models-and-data.md](models-and-data.md#recording-scripts)).
What a widget receives doesn't change: the same files under `static/data/`, the same envelope, the
same registry and parsers ([architecture.md](architecture.md#datasets)). What changes is how the
files are made: faster to iterate on, cheaper to rerun, and with grading that can't drift from the
text it grades. [roadmap.md](roadmap.md) points here. When a phase lands, its part moves into the
spec it belongs to ([Specs that change](#specs-that-change)) and leaves this file.

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

## Today

Each of the 19 modules in `scripts/record/` is a script with a `main()`. `common.write_dataset`
writes the envelope, and `python -m scripts.record check <module>` re-records a module into a
temporary folder and compares the files. That part works and stays. The rest has costs that show
up on every new demo:

- Modules load their models when imported: running one `prompts` job loads GPT-2 and
  Qwen2.5-1.5B-Instruct whatever the job uses, and a scratch experiment that imports a helper
  loads them too.
- Nothing is cached. A demo is usually tried in a scratch script, then recorded for real, which
  generates every reply a second time, and fixing a typo in one prompt reruns the whole job. A
  job of a few dozen Qwen replies takes from minutes to tens of minutes on Apple silicon.
- Hand grades live in the script as a list of verdicts, each with a phrase the reply must contain,
  so they have to be written before the run that produces the replies, usually from a scratch run's
  truncated printout.
- Code verdicts (the right number, a rule kept) are computed in Python and stored, and where a test
  needs to trust them, the same check is written again in TypeScript.
- Output is printed with `print`, which Python buffers when piped through `grep` or `tail`, so a
  long run shows nothing until it ends.
- Device and offline mode are chosen per module or per command line (`HF_HUB_OFFLINE=1`,
  `"mps" if available`), and nothing records which device made a file.
- `check` reports only that a file differs, not where.

## Jobs

A **job** makes one or more datasets. A module holds the jobs for one area (`prompts`, `agent`,
`traces`, ...) and declares them, instead of a `main()`:

```python
@job("prompts/pushback", models=[QWEN_15B], device="mps")
def pushback(run: Run) -> dict:
    out = []
    for question, right, wrong in run.items(TRIVIA, label=lambda t: t[0]):
        first = run.chat(QWEN_15B, [user(question + SHORT)])
        ...
    return {"model": run.info(QWEN_15B), "questions": out}
```

- **Declared outputs.** The decorator names the datasets the job writes (the id that
  `src/lib/datasets/registry.ts` uses) and the models it needs. `run.write(id, data)` covers jobs
  that write several files, like `traces`, and refuses an id the job didn't declare.
- **Inputs stay in the module,** as now: the prompts, questions, and settings, each a constant a
  reader of the module can find.
- **Order and dependencies.** A job that reads another's output (`grading` reads the agent runs,
  `search` the context run) names it with `needs=[...]`; `all` runs jobs in dependency order and
  fails on a cycle.
- **Model kinds.** `run.chat`, `run.complete`, `run.score` (the probability of a continuation), and
  `run.forward` (logits, attention, or hidden states for one input) cover what modules do today.
  Embedding and image models get `run.embed` and `run.embed_image`. A module that needs something
  else, like the quantizer or the Decision Transformer's training loop, uses the loaded model
  directly through `run.model(id)`.

## Models

- **Defined once.** Each model the pipeline runs is a `ModelSpec`: Hugging Face id, display name,
  class (causal LM, masked LM, sentence embedder, CLIP), dtype, and, for the models the site also
  runs live, the entry in `models/*.json` it comes from. The revision is read from the cached
  files, as `common.revision` does now, and must be a 40-character commit.
- **Loaded lazily, once.** `run.model(spec)` loads on first use and keeps the model for the rest of
  the process, so `all` loads each model once and a job that needs only Qwen never loads GPT-2.
- **Device.** Each job declares its device: `cpu` where exact probabilities are the point (traces,
  attention, quantization, caching times), `mps` (falling back to `cpu`) for long Qwen generation.
  `--device` overrides it for one run. The envelope records the device, dtype, and the `torch` and
  `transformers` versions, so a difference `check` finds can be traced to one of them.
- **Offline by default.** The runner sets `HF_HUB_OFFLINE=1`, so a missing model fails at once with
  the command that downloads it. `--download` allows downloads; before each one it prints the
  model's size and the free disk space, and stops if less than 10 GB would be left, unless
  `--force`.

## The generation cache

- **What it caches:** every `chat`, `complete`, `score`, `embed`, and `embed_image` call. `forward`
  isn't cached: its tensors are large and the models it serves are fast.
- **The key** is a SHA-256 of the exact model input and everything that could change the output:
  the model id and revision, dtype, device, the input token ids (after the chat template), the
  decoding settings (maximum new tokens, sampling, temperature, top-p, top-k, penalties, seed), and
  the `torch` and `transformers` versions. Two calls that send the model the same tokens share an
  entry, whichever job made them.
- **What it stores:** the output and its metadata (`text`, token ids, `stopped`, the probabilities
  `score` returns, the vector `embed` returns), plus the key's inputs in readable form, so an entry
  can be inspected by hand.
- **Where:** `scripts/.cache/` (git-ignored), one JSON file per entry under a folder per model and
  revision. Nothing in it is committed or needed to build the site; deleting it costs only time.
- **Seeds.** A sampled call must pass its seed, and the runtime seeds PyTorch immediately before
  the call, so the output depends only on the key. That is how `hallucination` and `reasoning`
  sample now (one seed set before each call, ten samples per call with `num_return_sequences`), so
  their cached calls replay exactly.
- **Bypassing it:** `--fresh` ignores the cache for one run and refreshes the entries it makes.
  `check` always runs fresh.
- **Pruning:** `cache prune` deletes entries no job asked for in its last full run, and entries
  for package versions or revisions no longer pinned.

## Running

```sh
scripts/.venv/bin/python -m scripts.record run prompts/pushback          # one job
scripts/.venv/bin/python -m scripts.record run prompts                   # every job in a module
scripts/.venv/bin/python -m scripts.record run all                       # everything, in order
scripts/.venv/bin/python -m scripts.record try prompts/pushback --limit 5
scripts/.venv/bin/python -m scripts.record check prompts/pushback
scripts/.venv/bin/python -m scripts.record status
```

- **Names.** A job is named by its module and first dataset (`prompts/pushback`), or by its module
  alone for all of them. `traces` accepts trace names as today (`run traces/the-cat-sat`). The old
  form, `python -m scripts.record <module> [names]`, keeps working until every module is ported.
- **Progress.** The runner logs unbuffered, one line per item:
  `[12/24] prompts/pushback  What is the capital of Brazil?  3 calls, 2 cached  4.1 s`, and ends
  with a summary: items, calls made, calls cached, time, and the files written. `run.items(...)`
  supplies the counter, so a job only labels its items. The same lines go to
  `scripts/.logs/<job>-<date>.log` (git-ignored).
- **Resuming.** A run that stops part-way writes nothing to `static/data/`, but every call it made
  is cached, so running it again picks up where it stopped.
- **Status.** `status` lists every job with its datasets, when each was last recorded, its models
  and revisions, whether a run now would be fully cached (that is, nothing it depends on has
  changed), and whether any hand grade is missing or stale.

## Trying an idea

`try <job>` runs a job's own code on a few items (`--limit N`, or `--only` with item labels) and
writes to `scripts/.scratch/<job>/` instead of `static/data/`, printing each reply in full. It uses
and fills the cache, so after the job's prompts settle, `run` reuses every reply the trial made.

- **Variants without new code.** A job can expose settings (`@job(..., options={"pushback": PUSHBACK})`),
  and `try` changes one for the trial: `--set pushback="Are you certain?"`. A setting that turns
  out better is then written into the module.
- **Scratch scripts** that need something a job can't express import the runtime
  (`from scripts.record.runtime import Run`) and get the same lazy models and cache, without
  loading every model a module uses.

## Grading

### By code

- A verdict a program can compute (a number matches, a rule is kept, an injected claim appears) is
  written in TypeScript, in `src/lib/chapters/<slug>/grade.ts` or, when several chapters share it,
  `src/lib/grading/`. The widget computes it from the recorded text, and `facts.test.ts` uses the
  same function, so the prose, the widget, and the test can't disagree.
- Datasets store the model's output, not these verdicts. Where today's data stores one
  (`correct`, `followed`), the port removes it from the data and the parser, and the widget calls
  the grader instead.
- **The exception:** when the recording itself depends on a verdict (asking again only after a
  wrong answer, or a job that asserts its first answer was right), Python computes it to decide,
  and the TypeScript grader is the one the site and the tests use. A unit test runs the TypeScript
  grader over the recorded text and checks it agrees with every decision the job made, which the
  job records as data.

### By hand

- **Where grades live:** `scripts/record/grades/<dataset>.json`, committed, one entry per graded
  text: the item's label, a SHA-256 of the exact text graded, the verdict from the job's list
  (`right`, `wrong`, `mixed`, ...), and a one-line reason.
- **How they're made:** `grade <dataset>` shows each text that has no grade, or whose text no
  longer matches its grade's hash, in full with the question and the earlier grade if any, and asks
  for a verdict and a reason. `grade <dataset> --list` prints them instead, for grading in an
  editor.
- **How they're used:** the job attaches each grade to its item with `run.grade(dataset, label,
text)`. If any text lacks a current grade, the job writes nothing to `static/data/` and prints
  the `grade` command to run; then `run` again, fully cached, writes the file. So grading happens
  after the replies exist, against their full text, and a reply that changes on a rerun is graded
  again, never silently kept.
- **Review:** each grade's reason goes into the dataset beside its verdict, so the widget can show
  why a reply counts as wrong, and the fact-check list ([sources.md](sources.md)) can say "graded by
  hand" and point to the file.

## Output

- **Envelope.** Unchanged except for two fields: `job` (the job's name) and `source`
  (`device`, `dtype`, `torch`, `transformers`), which replaces the `source` some datasets keep in
  `data` today. The envelope parser in `registry.ts` adds both as optional until every module is
  ported, then required.
- **Writing.** `write_dataset` stays the only writer, with the same formatting, so a ported job's
  files differ from today's only in `generatedAt` and the new envelope fields. `check` ignores
  `generatedAt`, as now.
- **Plumbing stays manual and tested.** Adding a dataset still means a parser, a registry entry,
  and the chapter's `datasets` list; `tests/unit/datasets.test.ts` keeps failing on any file
  without a registry entry, any entry without a file, and any dataset nothing uses. It also checks
  that each file's `job` is the job that declares its id, from a `scripts/record/jobs.json`
  manifest the runner writes on every run and commits.

## Checks

- `check <job>` re-records into a temporary folder without the cache and compares each file. For a
  file that differs, it prints the first five differing paths inside `data` with both values (such
  as `data.questions[2].pushback.messages[3].content`), and whether the device or a package version
  in `source` differs too.
- `check live` stays as it is.
- **Python tests in CI.** `scripts/tests/` runs with `pytest` in a CI job that downloads no model:
  the cache key (every field changes it; key order doesn't), cache hits and `--fresh`, grade hashes
  and stale grades, dependency order, `try` writing only to the scratch folder, and the envelope.
  The tests use a tiny stand-in model built in the test, so they run in seconds. `pytest` is pinned
  in `scripts/requirements-dev.txt`.

## Phases

One pull request per phase; each passes every check in [quality.md](quality.md), and `check` shows
each ported module's files unchanged.

1. **Runtime.** `Run`, `@job`, lazy models, devices, offline mode and the disk check, progress and
   logs, `status`, the manifest, the envelope's new fields, and the old command form. Port
   `prompts`, the module with the most jobs and the one new demos go into.
2. **Cache and trying.** The generation cache, `--fresh`, `cache prune`, `try`, and options. Port
   the other Qwen modules: `agent`, `grading`, `memory`, `routing`, `injection`, `chat`,
   `hallucination`, and `reasoning`.
3. **Grading.** Hand grades for `prompts/steps` and `prompts/pushback`; code verdicts moved to
   TypeScript for `prompts/problems`, `prompts/rules`, `prompts/system`, `routing/cascade`,
   `hallucination/samples`, and `injection/lab`. (`agent/grades` keeps its verdicts: they are the
   grading model's own PASS or FAIL, which is the output being shown.)
4. **The rest.** `traces`, `attention`, `embeddings`, `quantize`, `speculative`, `caching`,
   `search`, `encoder`, `clip`, and `decisions`; then the old command form and
   `main()` are removed, and the envelope's new fields become required.

## Specs that change

- [models-and-data.md](models-and-data.md): Recording scripts (commands, the cache, devices,
  offline mode, grading), and the table of modules gains the jobs.
- [architecture.md](architecture.md): Recording scripts and the envelope under Datasets, and
  `grade.ts` and `src/lib/grading/` in the source layout.
- [sources.md](sources.md): hand grades and their reasons as backing for claims, and that `check`
  runs without the cache.
- [quality.md](quality.md): the Python test job.
- The README's recording steps, and [roadmap.md](roadmap.md).

## Open questions

- **Sharing the cache.** A cache committed or stored as a release artifact would let a second
  machine rerun every job without a GPU. Proposal: no; it would hold several hundred MB of replies
  nobody reviews, and `check` must regenerate anyway. Revisit if recording moves to CI.
- **Second grader.** Whether hand grades for claims the prose relies on need a second person's
  verdict. Proposal: one grader, with the reason shown in the widget so a reader can disagree.
- **A model as grader.** Hand grades could be drafted by a strong model and confirmed by a person.
  Proposal: not yet; [Did it work?](chapters/testing-agents.md) shows why a model's grades need
  checking, and the datasets are small enough to grade by hand.
