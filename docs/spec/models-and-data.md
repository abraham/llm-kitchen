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
`scripts/.venv/bin/python -m scripts.record <module>`, decodes greedily or with a fixed seed so
reruns match, and writes its datasets to `static/data/` in the envelope the site checks. Every
dataset names each model's Hugging Face commit. The README has setup steps.

| Script                  | Models                                            | Output                                                  | Used by                                                                                                                                                                                                                 |
| ----------------------- | ------------------------------------------------- | ------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `record/traces.py`      | GPT-2 small                                       | `static/data/traces/gpt2/`, `static/data/vectors/gpt2/` | Generation, sampling, attention, residual stream, and quirk traces across Parts I–V and [From message to reply](chapters/end-to-end.md)                                                                                 |
| `record/embeddings.py`  | all-MiniLM-L6-v2                                  | `static/data/embeddings/`                               | [Meaning as position](chapters/embeddings.md), [Managing the context](chapters/managing-the-context.md)                                                                                                                 |
| `record/quantize.py`    | GPT-2 small                                       | `static/data/quantize/gpt2/`                            | [Fewer bits per number](chapters/quantization.md)                                                                                                                                                                       |
| `record/speculative.py` | GPT-2 small drafting for GPT-2 medium             | `static/data/speculative/gpt2/`                         | [Guessing ahead](chapters/speculative-decoding.md)                                                                                                                                                                      |
| `record/chat.py`        | Qwen2.5-0.5B, Qwen2.5-0.5B-Instruct, GPT-2 small  | `static/data/chat/`                                     | [From predictor to assistant](chapters/predictor-to-assistant.md)                                                                                                                                                       |
| `record/reasoning.py`   | Qwen3-0.6B (thinking off and on)                  | `static/data/reasoning/`                                | [Thinking before answering](chapters/reasoning-models.md)                                                                                                                                                               |
| `record/prompts.py`     | GPT-2 small, Qwen2.5-1.5B-Instruct                | `static/data/prompts/`                                  | Every Prompt engineering chapter                                                                                                                                                                                        |
| `record/agent.py`       | Qwen2.5-1.5B-Instruct in a Python harness         | `static/data/agent/`                                    | Every Harnesses chapter except [Which model answers?](chapters/routing.md), every Tools and agents chapter except [Prompt injection](chapters/prompt-injection.md), and [From message to reply](chapters/end-to-end.md) |
| `record/caching.py`     | GPT-2 small, with and without its KV cache        | `static/data/caching/`                                  | [Caching](chapters/caching.md)                                                                                                                                                                                          |
| `record/routing.py`     | Qwen2.5-0.5B-Instruct, Qwen2.5-1.5B-Instruct      | `static/data/routing/`                                  | [Which model answers?](chapters/routing.md)                                                                                                                                                                             |
| `record/injection.py`   | Qwen2.5-1.5B-Instruct                             | `static/data/injection/`                                | [Prompt injection](chapters/prompt-injection.md)                                                                                                                                                                        |
| `record/encoder.py`     | BERT base (uncased), GPT-2 small                  | `static/data/encoders/`                                 | [Reading both ways](chapters/encoders.md)                                                                                                                                                                               |
| `record/clip.py`        | CLIP ViT-B/32                                     | `static/data/vision/`, pictures in `static/vision/`     | [Seeing pictures](chapters/seeing-pictures.md)                                                                                                                                                                          |
| `record/decisions.py`   | A toy Decision Transformer, trained by the script | `static/data/decisions/`                                | [Choosing actions](chapters/decision-models.md)                                                                                                                                                                         |

- The agent harness's tools mirror the browser's (`src/lib/harness/tools.ts`); tests check they give
  identical results.
- Recorded traces are also validated by `parseTrace` (`src/lib/models/trace.ts`): probabilities,
  contexts, and causal attention.
- **Spot checks:** `scripts/.venv/bin/python -m scripts.record check <module> [args]` re-records
  into a temporary folder and compares every file with the committed one, ignoring only the
  recording date. Run it for a few modules when the Python packages or a model revision change.
- Generated data is excluded from Prettier (`.prettierignore`).
