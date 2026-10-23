# Models and data

The site always works without downloading a model. Every widget shows real data recorded offline
by default; visitors opt in to heavier live features.

## Tiers

| Tier                                | What it is                                                             | Size                                                                             | Used in                                                                                                                                                                                                                    |
| ----------------------------------- | ---------------------------------------------------------------------- | -------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **T0 — Recorded** (default)         | JSON from real model runs, made offline by the scripts below           | KBs, instant                                                                     | Every chapter                                                                                                                                                                                                              |
| **T1 — Tokenizer only**             | `gpt-tokenizer` in the browser                                         | ~1–2 MB                                                                          | [Tokens](chapters/tokens.md), [Quirks and limits](chapters/quirks-and-limits.md), and the live model widgets                                                                                                               |
| **T2 — Small model in the browser** | Transformers.js running GPT-2 small (8-bit ONNX) or `all-MiniLM-L6-v2` | GPT-2 128 MB or MiniLM 23 MB, plus 27 MB of runtime, cached after the first load | [Meaning as position](chapters/embeddings.md), [Generating text](chapters/generating-text.md), [Quirks and limits](chapters/quirks-and-limits.md), [A prompt is the start of a document](chapters/prompts-as-documents.md) |

Some widgets compute their data in the browser instead (bigram counts, BPE merges, the tiny trainers,
the toy router and diffusion model). Their badge says so.

Larger live tiers (a WebGPU chat model and bring-your-own-key APIs) aren't built; see
[roadmap.md](roadmap.md).

## The canonical small model

- **GPT-2 small**, defined once in `models/canonical.json`: Hugging Face and ONNX IDs, tokenizer,
  parameter, layer, head, embedding, MLP, vocabulary, and context sizes, and the ONNX download size.
- The trace builder, the live worker, and the widgets all read that file. No widget hard-codes a
  model name, vocabulary size, or layer or head count. `record/traces.py` checks the file against the
  model's own config before writing anything, and `tests/unit/consistency.test.ts` ties every GPT-2
  number in the prose to it.
- Recorded traces live per model under `static/data/traces/<model-id>/` (and vectors under
  `static/data/vectors/<model-id>/`), so switching models (for example to SmolLM2-135M) is a config
  change plus re-running the scripts, with old and new traces side by side.
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

A live widget keeps the same UI as its recorded version; only which provider it asks changes. See
[architecture.md](architecture.md) for how recorded data is registered, checked, and loaded.

## Live model rules

- Before any download, `ModelConsent` asks, showing the download size (model plus runtime).
- The worker uses WebGPU when available and falls back to WASM, and the widget shows load progress.
- ONNX Runtime's WebAssembly files are bundled with the site (hashed, long-cached) instead of loaded
  from a CDN, so scripts stay `'self'`. Model files download from Hugging Face, the only outside
  origin `connect-src` allows (see [deployment.md](deployment.md)).
- Harness demos only expose in-browser toy tools (a calculator, a lookup over a bundled corpus, and a
  fake file system in `src/lib/harness/tools.ts`). No model ever gets network, real file system, or
  `eval` access.

## Recording scripts

Each module in `scripts/record/` runs offline in `scripts/.venv` (`scripts/requirements.txt`) with
`scripts/.venv/bin/python -m scripts.record <module>`, decodes greedily or with a fixed seed so
reruns match, and writes its datasets to `static/data/` in the envelope the site checks. The README
has setup steps.

| Script                  | Models                                           | Output                                                  | Used by                                                                                                                                 |
| ----------------------- | ------------------------------------------------ | ------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| `record/traces.py`      | GPT-2 small                                      | `static/data/traces/gpt2/`, `static/data/vectors/gpt2/` | Generation, sampling, attention, residual stream, and quirk traces across Parts I–V and [From message to reply](chapters/end-to-end.md) |
| `record/embeddings.py`  | all-MiniLM-L6-v2                                 | `static/data/embeddings/`                               | [Meaning as position](chapters/embeddings.md), [Managing the context](chapters/managing-the-context.md)                                 |
| `record/quantize.py`    | GPT-2 small                                      | `static/data/quantize/`                                 | [Fewer bits per number](chapters/quantization.md)                                                                                       |
| `record/speculative.py` | GPT-2 small drafting for GPT-2 medium            | `static/data/speculative/`                              | [Guessing ahead](chapters/speculative-decoding.md)                                                                                      |
| `record/chat.py`        | Qwen2.5-0.5B, Qwen2.5-0.5B-Instruct, GPT-2 small | `static/data/chat/`                                     | [From predictor to assistant](chapters/predictor-to-assistant.md)                                                                       |
| `record/reasoning.py`   | Qwen3-0.6B (thinking off and on)                 | `static/data/reasoning/`                                | [Thinking before answering](chapters/reasoning-models.md)                                                                               |
| `record/prompts.py`     | GPT-2 small, Qwen2.5-1.5B-Instruct               | `static/data/prompts/`                                  | Every Prompt engineering chapter                                                                                                        |
| `record/agent.py`       | Qwen2.5-1.5B-Instruct in a Python harness        | `static/data/agent/`                                    | Every Harnesses chapter except [Prompt injection](chapters/prompt-injection.md), and [From message to reply](chapters/end-to-end.md)    |
| `record/caching.py`     | GPT-2 small, with and without its KV cache       | `static/data/caching/`                                  | [Caching](chapters/caching.md)                                                                                                          |
| `record/injection.py`   | Qwen2.5-1.5B-Instruct                            | `static/data/injection/`                                | [Prompt injection](chapters/prompt-injection.md)                                                                                        |
| `record/encoder.py`     | BERT base (uncased), GPT-2 small                 | `static/data/encoders/`                                 | [Reading both ways](chapters/encoders.md)                                                                                               |
| `record/clip.py`        | CLIP ViT-B/32                                    | `static/vision/`                                        | [Seeing pictures](chapters/seeing-pictures.md)                                                                                          |

- The agent harness's tools mirror the browser's (`src/lib/harness/tools.ts`); tests check they give
  identical results.
- Recorded traces are also validated by `parseTrace` (`src/lib/models/trace.ts`): probabilities,
  contexts, and causal attention. Spot checks regenerate a few traces and compare them byte for
  byte.
- Generated data is excluded from Prettier (`.prettierignore`).
