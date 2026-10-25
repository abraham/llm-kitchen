# Workers

Three Web Workers run the site's heavy work off the main thread, so scrolling, typing, and
hydration never wait on it. Each is a module in `src/lib/workers/`, created in the browser only and
only when a widget needs it.

| Worker                | Runs                                                                | Created by                                         | Lives                     |
| --------------------- | ------------------------------------------------------------------- | -------------------------------------------------- | ------------------------- |
| `tokenizer.worker.ts` | `gpt-tokenizer`'s GPT-2, GPT-4, and GPT-4o encodings                | `models/tokenizers.ts`, on the first tokenize call | Until the page closes     |
| `inference.worker.ts` | Transformers.js: GPT-2 small for next tokens and MiniLM for vectors | `models/inference-client.ts`, on the first request | Until the page closes     |
| `trainer.worker.ts`   | Training the tiny character model from `math/mlp.ts`                | The training widget on mount                       | Until the widget unmounts |

## Why each is a worker

- **Tokenizer.** Parsing one vocabulary (about 0.5 MB of JavaScript for GPT-2, more for the others)
  takes up to a few hundred milliseconds on a throttled CPU. On the main thread that would add
  Total Blocking Time to [Tokens](chapters/tokens.md) and [Quirks and limits](chapters/quirks-and-limits.md),
  whose widgets tokenize as soon as they mount, enough to push their Lighthouse performance scores
  below the budget in [quality.md](quality.md) on CI.
- **Inference.** Model downloads, ONNX Runtime, and every forward pass are slow, and the worker is
  where model files may come from Hugging Face (see [Security](#security)).
- **Trainer.** Training runs thousands of steps; in a worker the page stays responsive and the loss
  curve updates as steps finish.

## Messages

- Each worker file exports its request and response types as discriminated unions, and the code
  that talks to it imports them with `import type`, so the two sides can't drift. Pages send only
  these typed messages; a worker never reads from the page any other way.
- **Request–reply workers** (tokenizer, inference) number every request. The client keeps a map
  from id to the waiting promise, the worker echoes the id on its reply, and the client resolves
  or rejects that promise. Several widgets can share one worker with requests in flight at once.
- **Errors** come back as messages: the tokenizer worker replies `{ id, error }`, the inference
  worker `{ id, type: 'error', message }`, and the client rejects the matching promise, so the
  widget can show the error. If the tokenizer worker itself fails, every waiting request is
  rejected.
- **Progress.** The inference worker sends `progress` messages with the request's id while it
  downloads model files; `BrowserModel` turns them into the fraction its consent card shows.
- **The trainer** is a stream rather than request–reply: the widget sends `start`, `pause`, or
  `reset`. The worker sends `info` (the model's size) when it starts and after each reset, and
  `progress` (step, loss, and now and then a sample) after every 25 steps until the step limit or a
  pause.

## The tokenizer worker

- `models/tokenizer-encodings.ts` holds the tokenizer list (`TOKENIZERS`: label, encoding, and a
  dynamic import of its vocabulary) and `runTokenizer`, which encodes text, or turns ids back into
  text one token at a time. It loads each vocabulary once and keeps it.
- `tokenizer.worker.ts` only answers messages with `runTokenizer`; it has no other state.
- `models/tokenizers.ts` is what widgets and providers import. `tokenize(name, text)` and
  `tokensFor(name, ids)` return promises of tokens. In a browser they post to the shared worker,
  which is created (and its module loaded) on the first call. Where `Worker` doesn't exist, as in
  Node for unit tests and fact checks, they call `runTokenizer` in place, so tests get the same
  tokens without a browser.
- Server-side rendering never tokenizes: widgets tokenize only in effects, event handlers, or
  behind a `window` check, so the prerendered page shows their loading state.

## The inference worker

- Loads each model once per id and forgets a failed load so it can be retried. A load names the
  task, the model id and pinned revision, the device, and optionally an ONNX file; later `embed`
  and `next-token` requests use the loaded model.
- Uses WebGPU when `inference-client.ts` finds an adapter and WebAssembly otherwise, with 8-bit
  weights either way. ONNX Runtime's WebAssembly files are bundled as the site's own hashed
  assets, not fetched from a CDN.
- `next-token` returns the top `k` probabilities and the total of the rest, computed from the last
  position's logits in the worker, so only a few numbers cross back to the page.
- It loads only after consent: `BrowserModel.load` is the only caller of a `load` request, and one
  `BrowserModel` per model is shared by every widget on a page. [models-and-data.md](models-and-data.md#live-model-rules)
  has the rules for live models.

## The trainer worker

- Builds the training examples from the nursery rhymes once, then trains in batches of 25 steps,
  yielding with `setTimeout` between batches so `pause` and `reset` messages get through.
- Seeded: `reset` takes a seed, so a reset run is repeatable.
- The widget terminates it on unmount; a new visit starts a fresh model.

## Build and hosting

- Workers are imported with Vite's `?worker` suffix and built as ES modules (`worker.format: 'es'`
  in `vite.config.ts`). ES workers keep dynamic imports as separate chunks, so the tokenizer worker
  downloads only the vocabulary it's asked for; the default classic format would inline all three
  into one 3.5 MB file.
- Workers and their chunks land under `/_app/immutable/workers/`, with hashed names and the
  year-long immutable cache like the rest of `/_app/immutable/`.

## Security

- A worker gets only its own response's header policy, not the page's. `firebase.json` gives
  everything under `/_app/immutable/workers/` a complete policy of its own; [security.md](security.md#in-the-browser)
  has the details.
- Only the inference worker fetches from Hugging Face, and every file it downloads is checked
  against the pinned model's list and SHA-256 by `workers/verified-fetch.ts`
  ([security.md](security.md#models)).
- Workers never import Svelte, UI components, or `$app`: the tokenizer and trainer workers import
  only `models/tokenizer-encodings.ts`, `math/`, and `data/`, and the inference worker only
  Transformers.js, ONNX Runtime's files, the pinned model files `models/canonical.json` and
  `models/embedder.json` at the repository root, and `verified-fetch.ts`.

## Tests

- `src/lib/models/tokenizers.test.ts` and the fact checks tokenize in Node through the same
  `runTokenizer` the worker uses.
- The [Tokens](chapters/tokens.md) e2e test types into the widget and checks the tokens the worker
  sends back; the [Learning from mistakes](chapters/learning-from-mistakes.md) e2e test trains
  through the trainer worker.
- `tests/e2e/hosting.e2e.ts` and `scripts/check-live-headers.ts` check the inference worker's
  header policy and caching, locally and on the live site.
- `src/lib/workers/verified-fetch.test.ts` checks that model downloads must be listed files with
  matching hashes.
- The Lighthouse suite (`tests/lighthouse/`) catches main-thread work that should move into a
  worker.
