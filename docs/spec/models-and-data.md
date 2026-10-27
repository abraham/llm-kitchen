# Models and data

The site always works without downloading a model. Every widget shows real data recorded offline
by default; visitors opt in to live models by choosing a tier of them on the Models page
([downloads.md](downloads.md#tiers)).

## Tiers

| Tier                                | What it is                                                                                                                          | Size                                                                                                                  | Used in                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| ----------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **T0 — Recorded** (default)         | JSON from real model runs, made offline by the scripts below                                                                        | KBs, instant                                                                                                          | Every chapter                                                                                                                                                                                                                                                                                                                                                                                                                           |
| **T1 — Tokenizer only**             | `gpt-tokenizer` in a Web Worker                                                                                                     | ~1–2 MB                                                                                                               | [Tokens](chapters/tokens.md), [Quirks and limits](chapters/quirks-and-limits.md), and the live model widgets                                                                                                                                                                                                                                                                                                                            |
| **T2 — Small model in the browser** | Transformers.js running GPT-2 small, `all-MiniLM-L6-v2`, BERT base (8-bit ONNX), and CLIP's text half (4-bit), the Small model tier | GPT-2 128 MB, MiniLM 24 MB, BERT 112 MB, and CLIP text 128 MB, plus 27 MB of runtime, cached after the first download | [The guessing game](chapters/guessing-game.md), [Probability and sampling](chapters/probability-and-sampling.md), [Meaning as position](chapters/embeddings.md), [Generating text](chapters/generating-text.md), [Quirks and limits](chapters/quirks-and-limits.md), [A prompt is the start of a document](chapters/prompts-as-documents.md), [Reading both ways](chapters/encoders.md), [Seeing pictures](chapters/seeing-pictures.md) |

Some widgets compute their data in the browser instead (bigram counts, BPE merges, the tiny trainers,
the toy router and diffusion model, and the toy Decision Transformer, which runs weights trained by
`record/decisions.py`). Their badge says so.

The Large tier adds Qwen2.5-0.5B-Instruct (4-bit, 793 MB) for the chat widgets, in [From predictor to assistant](chapters/predictor-to-assistant.md),
[Instructions, roles, and the system prompt](chapters/instructions-and-roles.md),
[Learning from examples in the prompt](chapters/few-shot.md), and [Tools](chapters/tools.md)
([downloads.md](downloads.md#tiers)). Bring-your-own-key APIs aren't built; see
[roadmap.md](roadmap.md).

## The canonical small model

- **GPT-2 small**, defined once in `models/canonical.json`: Hugging Face and ONNX IDs, the pinned
  ONNX commit and its download size, tokenizer, parameter, layer, head, embedding, MLP, vocabulary,
  and context sizes, and the bigger model it drafts for (GPT-2 medium). The embedding model,
  all-MiniLM-L6-v2, is defined the same way in `models/embedder.json`.
- The recording scripts, the live worker, and the widgets all read those files. No widget hard-codes a
  model name, vocabulary size, or layer or head count. `record/traces.py` checks the file against the
  model's own config before writing anything, and `tests/unit/consistency.test.ts` ties every GPT-2
  number in the prose to it.
- Datasets recorded from the canonical model (traces, vectors, the rounding demo, and the
  speculative decoding run) live in a folder per model, such as `static/data/traces/<model-id>/`, so
  switching models (for example to SmolLM2-135M) is a config change plus re-running the scripts,
  with old and new data side by side. Other recordings compare GPT-2 with other models on purpose,
  and name GPT-2 in their data keys.
- Tokens shown for the canonical model use its own tokenizer, so token IDs match the logits and
  attention.
- The live GPT-2 is an 8-bit export, so the live demos have always used a quantized model;
  [Fewer bits per number](chapters/quantization.md) points this out.

## Providers

`src/lib/models/provider.ts` defines one `ModelProvider` interface (`tokenize`,
`nextTokenDistribution`, `generate`, and optional `attention` and `embed`), with a `DataSource` the
widget shows in its badge. Implementations:

- `RecordedProvider` (T0): answers from recorded traces, and throws `NotAvailableError` for prompts
  it has no data for.
- `BrowserProvider` (T2): wraps a `BrowserModel` that runs in `workers/inference.worker.ts` through
  `inference-client.ts`.

`GlassBoxGenerator` switches between the two, keeping the same UI; only which provider it asks
changes. The other live widgets read their recorded datasets directly and use a `BrowserProvider`
only when live. Each gets its live provider from
`useProvider(capability)` ([downloads.md](downloads.md#widgets)). See [architecture.md](architecture.md) for how recorded
data is registered, checked, and loaded.

## Live model rules

- A model downloads only when the visitor chooses a tier on the Models page, whose label gives the
  tier's size: its models plus the 27 MB ONNX Runtime build (a unit test checks it against the
  bundled file). [downloads.md](downloads.md) has the tiers, the states, the cache, and the page.
- The worker bundles only ONNX Runtime's asyncify build. Every
  [supported browser](quality.md#browser-support) can run it; the smaller build Transformers.js
  would pick for Safari without WebGPU is only needed before Safari 26.
- Live models download a pinned Hugging Face commit (`onnxRevision`), and each file must match the
  SHA-256 its config lists (`onnxFiles`; see [security.md](security.md#models)), so the files, and
  their size, can't change under the site. `scripts/.venv/bin/python -m scripts.record check live`
  checks that each commit has those files, with those hashes and the stated total size.
- The worker uses WebGPU when available and falls back to WASM, and the widget shows load progress.
- ONNX Runtime's WebAssembly files are bundled with the site (hashed, long-cached) instead of loaded
  from a CDN, so scripts stay `'self'`. Model files download from Hugging Face, the only outside
  origin `connect-src` allows (see [deployment.md](deployment.md)).
- Harness demos only expose in-browser toy tools (a calculator, a lookup over a bundled corpus, and a
  fake file system in `src/lib/harness/tools.ts`). No model ever gets network, real file system, or
  `eval` access.

## Recording scripts

Each module in `scripts/record/` runs offline in `scripts/.venv` (`scripts/requirements.txt`, with
exact versions, since a new PyTorch or Transformers can change the numbers) with
`scripts/.venv/bin/python -m scripts.record run <module>`, decodes greedily or with a fixed seed so
reruns match, and writes its datasets to `static/data/` in the envelope the site checks. Every
dataset names each model's Hugging Face commit. The README has setup steps.

- **Jobs.** Every module declares each recording as a job with
  `@job("prompts/pushback", models=[QWEN])`, named after the first dataset it writes; `agent` is one
  job that writes all eight of its datasets, and each GPT-2 trace is its own job
  (`run traces/the-cat-sat`). The job receives a `Run` and returns its data, or writes several
  datasets with `run.write(id, data)`; the runner writes them only when the whole job has
  finished, so a run that stops part-way leaves `static/data/` as it was. `needs=[...]` names jobs
  that must run first (`grading`, `memory`, and `search` need `agent/chat`; `prompts/steps` needs
  `reasoning/thinking`). `compact=True` writes a job's large datasets without indentation.
- **Models** are `ModelSpec`s (Hugging Face id, display name, dtype, default device, attention
  implementation, end-of-reply tokens, and kind: a causal model, an encoder whose vectors are
  pooled, a masked LM like BERT, or CLIP), loaded on first use and kept for the rest of the
  process, so a job that uses only GPT-2 never loads Qwen. Tokenizers load on their own, so a run
  that's fully cached never loads a model. `runtime.generate` (token ids, and optionally each
  chosen token's log-probability), `complete`, `chat`, `score` (the probability of a
  continuation), and `embed` are the shared ways to call a model. Jobs that need more (logits at
  every step, attention, hidden states, rewritten weights, CLIP's image half) use the loaded model
  through `run.model(spec)`, uncached: those models are small and fast, and their outputs large. A
  job that changes a shared model's weights (`quantize`) puts them back when it ends.
- **The generation cache.** Every `generate`, `score`, and `embed` call is cached in
  `scripts/.cache/` (git-ignored), one JSON file per call in a folder per model and commit, keyed
  by a SHA-256 of the input token ids (or texts, for `embed`), the decoding settings and seed, the
  model's commit, dtype, device, and attention implementation, and the `torch` and `transformers`
  versions. Two calls that send the same model the same input share an entry, whichever job made
  them. A rerun after changing one prompt or the shape of a job's output computes only what
  changed, and a run that stopped part-way resumes. A sampled call passes its seed, and the runtime
  seeds PyTorch right before it, so the output depends only on the key. `--fresh` ignores the
  cache for one run (and refreshes the entries it makes), `check` always runs fresh, and
  `cache prune` deletes entries no job asked for in its last full run, or made with other package
  versions or model commits. Calls that return whole tensors (a forward pass for attention or
  logits) aren't cached; their models are fast.
- **Trying an idea.** `try <job>` runs the job's own code as a trial: only the first `--limit N`
  items, or those whose labels contain `--only` text, written to `scripts/.scratch/<job>/`
  (git-ignored) instead of `static/data/`, with every reply printed in full. It uses and fills the
  cache, so once the prompts settle, `run` reuses every reply the trial made. A job can declare
  `options={...}` (`prompts/pushback` has its follow-up message), which `try` changes with
  `--set NAME=VALUE`. A trial carries on when a reply has no hand grade, marking it ungraded,
  where a real run stops.
- **Verdicts by code.** A verdict a program can work out from the recorded text (a number
  matches, a rule is kept, an injected claim appears, an answer declines) isn't stored: the
  dataset holds the model's output, and the parser adds the verdict with `derive`, calling a grader
  in `src/lib/grading/` (`answers.ts` for answers, `checks.ts` for rules, formats, and injections).
  So the widget, the live widget grading a reply in the browser, and `facts.test.ts` use one
  function and can't disagree. Where the job's input must match the grader's (`prompts/rules`
  lists its rules' wording), the parser checks it and throws when they differ.
- **Verdicts by hand.** Replies that don't share a format, so no rule reads them all fairly
  (`prompts/steps`, and the reply to the pushback in `prompts/pushback`), are graded by a person.
  Grades live in `scripts/record/grades/<dataset>.json`, committed: per reply, its label, a
  SHA-256 of the exact text graded, the verdict, and a one-line reason. The job looks each reply
  up with `run.grade(dataset, label, text, verdicts)` and stores the verdict and the reason beside
  it, so the widget can say why a reply counts as wrong. A reply with no grade, or whose text no
  longer matches its grade's hash, stops the run before it writes anything and is listed in
  `scripts/.cache/grading/`; `grade <dataset>` shows each in full, with its question and any
  earlier grade, and asks for a verdict and a reason (`--list` prints them for grading in an
  editor). Then `run` again, fully cached, writes the file. One person grades; the reason is shown
  so a reader can disagree. `tests/unit/datasets.test.ts` checks that every grade's hash and reason
  are in its dataset.
- **Devices.** Each model has a default device: `cpu` for GPT-2, BERT, CLIP, and MiniLM, whose
  exact numbers are the point, and for the modules that recorded on it (`chat`, `agent`,
  `grading`, `memory`, `routing`), and `mps` (Apple silicon, falling back to `cpu`) for the long
  generations in `prompts`, `injection`, `hallucination`, and `reasoning`. A job's `device=` or
  `--device` overrides it. The envelope records the job, each model's device and dtype (the toy
  Decision Transformer trains on the CPU in float32), and in `source` the `torch` and
  `transformers` versions; the site's parser requires them.
- **Offline by default.** The runner sets `HF_HUB_OFFLINE=1`, so a model that isn't downloaded
  fails at once and says to add `--download`. With `--download`, it prints each download's size
  and the free disk space, and refuses one that would leave less than 10 GB free unless `--force`.
- **Progress** is printed unbuffered, so it shows even through `grep` or `tail`: one line per item
  (`[12/24] prompts/pushback  What is the capital of Brazil?  3 calls, 2 cached  4.1 s`), then a
  summary per job. The same lines go to `scripts/.logs/<job>-<date>.log` (git-ignored).
- **Status.** `python -m scripts.record status` lists every module's datasets with when each was
  recorded and from which model commits, flags a model whose downloaded commit differs or that
  isn't downloaded, and counts replies waiting for a hand grade. For each job it says whether a run
  now would be fully cached: it runs the job with every model call read from the cache, loading no
  model and writing nothing, and stops at the first call the cache doesn't hold ("not cached"),
  or when the job loads its model directly or computes everything itself. That takes a few
  seconds for every job together.
- **Tests.** `npm run test:python` runs `scripts/tests/` with `pytest` against a tiny GPT-2 built
  in the test; CI runs it too ([quality.md](quality.md#ci)).
- **Manifest.** Every run writes `scripts/record/jobs.json`: each job, its module, the datasets it
  writes, its models, what it needs, and its options. It's committed, and `tests/unit/datasets.test.ts` checks
  that each file a job wrote names that job and that the job declares it.

| Script                  | Models                                            | Output                                                  | Used by                                                                                                                                                                                                                                                                                                                                                |
| ----------------------- | ------------------------------------------------- | ------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `record/traces.py`      | GPT-2 small                                       | `static/data/traces/gpt2/`, `static/data/vectors/gpt2/` | Generation, sampling, attention, residual stream, and quirk traces across Parts I–V and [From message to reply](chapters/end-to-end.md)                                                                                                                                                                                                                |
| `record/attention.py`   | GPT-2 small                                       | `static/data/attention/gpt2/`                           | [Attention](chapters/attention.md)                                                                                                                                                                                                                                                                                                                     |
| `record/embeddings.py`  | all-MiniLM-L6-v2                                  | `static/data/embeddings/`                               | [Meaning as position](chapters/embeddings.md), [Managing the context](chapters/managing-the-context.md)                                                                                                                                                                                                                                                |
| `record/quantize.py`    | GPT-2 small                                       | `static/data/quantize/gpt2/`                            | [Fewer bits per number](chapters/quantization.md)                                                                                                                                                                                                                                                                                                      |
| `record/speculative.py` | GPT-2 small drafting for GPT-2 medium             | `static/data/speculative/gpt2/`                         | [Guessing ahead](chapters/speculative-decoding.md)                                                                                                                                                                                                                                                                                                     |
| `record/chat.py`        | Qwen2.5-0.5B, Qwen2.5-0.5B-Instruct, GPT-2 small  | `static/data/chat/`                                     | [From predictor to assistant](chapters/predictor-to-assistant.md)                                                                                                                                                                                                                                                                                      |
| `record/reasoning.py`   | Qwen3-0.6B (thinking off and on)                  | `static/data/reasoning/`                                | [Thinking before answering](chapters/reasoning-models.md)                                                                                                                                                                                                                                                                                              |
| `record/prompts.py`     | GPT-2 small, Qwen2.5-1.5B-Instruct                | `static/data/prompts/`                                  | Every Prompt engineering chapter                                                                                                                                                                                                                                                                                                                       |
| `record/agent.py`       | Qwen2.5-1.5B-Instruct in a Python harness         | `static/data/agent/`                                    | Every Harnesses chapter except [Which model answers?](chapters/routing.md), every Agents chapter except [Designing an agent](chapters/designing-agents.md) and [Splitting the work](chapters/splitting-the-work.md), every Safety chapter except [Prompt injection](chapters/prompt-injection.md), and [From message to reply](chapters/end-to-end.md) |
| `record/grading.py`     | Qwen2.5-1.5B-Instruct grading the agent runs      | `static/data/agent/grades.json`                         | [Did it work?](chapters/testing-agents.md)                                                                                                                                                                                                                                                                                                             |
| `record/search.py`      | all-MiniLM-L6-v2                                  | `static/data/agent/search.json`                         | [Search and memory](chapters/search-and-memory.md)                                                                                                                                                                                                                                                                                                     |
| `record/memory.py`      | Qwen2.5-1.5B-Instruct                             | `static/data/agent/memory.json`                         | [Search and memory](chapters/search-and-memory.md)                                                                                                                                                                                                                                                                                                     |
| `record/caching.py`     | GPT-2 small, with and without its KV cache        | `static/data/caching/`                                  | [Caching](chapters/caching.md)                                                                                                                                                                                                                                                                                                                         |
| `record/routing.py`     | Qwen2.5-0.5B-Instruct, Qwen2.5-1.5B-Instruct      | `static/data/routing/`                                  | [Which model answers?](chapters/routing.md)                                                                                                                                                                                                                                                                                                            |
| `record/injection.py`   | Qwen2.5-1.5B-Instruct                             | `static/data/injection/`                                | [Prompt injection](chapters/prompt-injection.md)                                                                                                                                                                                                                                                                                                       |
| `record/encoder.py`     | BERT base (uncased), GPT-2 small                  | `static/data/encoders/`                                 | [Reading both ways](chapters/encoders.md)                                                                                                                                                                                                                                                                                                              |
| `record/clip.py`        | CLIP ViT-B/32                                     | `static/data/vision/`, pictures in `static/vision/`     | [Seeing pictures](chapters/seeing-pictures.md)                                                                                                                                                                                                                                                                                                         |
| `record/decisions.py`   | A toy Decision Transformer, trained by the script | `static/data/decisions/`                                | [Choosing actions](chapters/decision-models.md)                                                                                                                                                                                                                                                                                                        |

- The agent harness's tools mirror the browser's (`src/lib/harness/tools.ts`); tests check they give
  identical results.
- Recorded traces are also validated by `parseTrace` (`src/lib/models/trace.ts`): probabilities,
  contexts, and causal attention.
- **Spot checks:** `scripts/.venv/bin/python -m scripts.record check <job|module> [names]`
  re-records into a temporary folder, without the generation cache, and compares every file with the committed one, ignoring the
  recording date, the job's name, the package versions, and each model's device and dtype. For a
  file that differs it prints the first five places inside it that differ, with both values, and
  the device or package versions if those changed too. Run it for a few modules when the Python
  packages or a model revision change.
- Generated data and hand grades are excluded from Prettier (`.prettierignore`).
