# Live attention

Plan for showing GPT-2's attention for a sentence the visitor types, in
[Attention](chapters/attention.md); [roadmap.md](roadmap.md) points here. When a phase lands, its
part moves into the spec it belongs to ([Specs that change](#specs-that-change)) and leaves this
file.

## Goals

- **Your own sentence.** Under the Small tier, `AttentionViewer` takes a sentence the visitor
  types and shows what each word looks at, in any of GPT-2's 144 heads, from the real model in the
  browser.
- **No extra download.** Small already downloads GPT-2 for next tokens. The same file gives
  attention, so the tier's size doesn't change.
- **Nothing else changes.** Every widget that runs GPT-2 live today keeps working, with the same
  predictions to within quantization.
- **Same checks as every model.** The file comes from Hugging Face at a pinned commit with its
  SHA-256, like every other live model ([security.md](security.md#models)).
- **The text still matches.** The five recorded sentences stay the default, and "Show the
  recording" brings them back, so the heads the chapter names (9.6, 9.9, 9.0) still read as
  described.

## Why a new export

The ONNX file the site runs today, `Xenova/gpt2`'s `decoder_model_merged_quantized.onnx`, returns
logits and the KV cache but no attention weights, so the chapter shows attention recorded in
PyTorch for 5 sentences. Polo Club's Transformer Explainer shows another export can return them
in the browser: its GPT-2 file outputs every head's full attention grid. That file is 626 MB at
full precision, and its repository doesn't include the script that made it.

Transformers.js already passes through any extra output a model file has: `model(inputs)` returns
every output of the ONNX session, not just `logits` (`decoder_forward` in Transformers.js 4.3.1
returns `sessionRun`'s result whole). So the worker can read attention from a new file without
calling ONNX Runtime directly.

## The export

- **What it outputs.** `logits` for every position (as now; `score` needs them all) and
  `last_attention`, shape `[12, 12, n]`: every layer's and head's attention from the last token to
  each of the `n` tokens. Not the full `[12, 12, n, n]` grid: at GPT-2's full 1,024 tokens that
  is 604 MB of floats per forward pass, which every next-token call would pay. The last row is
  590 KB at most.
- **Why the last row is enough.** Attention only looks back, so a token's attention doesn't
  depend on anything after it. The row for token `i` of a sentence is the last row of a forward
  pass over tokens `0…i`. The viewer shows one query token at a time, so it asks for that token's
  row when it's clicked.
- **No KV cache.** Live GPT-2 widgets call one forward pass per token
  (`BrowserProvider.generate` loops `nextTokenDistribution`), so the file has no
  `past_key_values` inputs. Transformers.js adds cache inputs only when the file has them.
- **How it's made.** `scripts/record/export_gpt2.py`, run as
  `scripts/.venv/bin/python -m scripts.record export-gpt2 <dir>`:
  - loads `openai-community/gpt2` at the commit `canonical.json` already records, with eager
    attention so attention weights exist;
  - wraps it to return `logits` and the stacked last attention rows, and exports with
    `torch.onnx.export` (dynamic batch and sequence axes);
  - quantizes the weights to 8 bits with `onnxruntime.quantization.quantize_dynamic`, using the
    settings of Transformers.js's own conversion script for `q8`, so predictions match today's;
  - writes `config.json`, `generation_config.json`, `onnx/model_quantized.onnx`, and a model card
    (license MIT, as GPT-2's; the source commit; the script and library versions).
- **Checked before it's published.** The same command runs the quantized file in ONNX Runtime and
  fails unless:
  - for each of the 5 recorded sentences, every head's attention row matches the recording in
    `static/data/traces/gpt2/attn-*.json` to within 0.05, and the most-attended token of the heads
    the chapter names is the same;
  - on the recorded traces' prompts, the top 10 next tokens match `Xenova/gpt2`'s, with each
    probability within 0.01.
- **Where it's hosted.** On Hugging Face, in a repository the maintainer owns (called
  `<owner>/llm-kitchen-gpt2` here; the name is chosen when it's made). Hugging Face serves model
  files for free from its CDN, and the worker's CSP and `verifiedFetch` already allow only it.
  Serving 128 MB per visitor from the site's own hosting would cost bandwidth and need a second
  path through `verifiedFetch`. Creating the repository and uploading need the maintainer's
  Hugging Face token, so they're manual steps; the export script prints the Hugging Face CLI
  command that uploads the folder.
- ONNX exports aren't byte-for-byte reproducible across library versions, so the file is checked
  by its outputs (above) when it's made, and by its SHA-256 after.

## Code

1. **`models/canonical.json`**: `onnxId`, `onnxRevision`, `onnxFile` (`model`), `onnxFiles`, and
   `onnxMB` point at the new repository. `huggingFaceId` and the recordings don't change.
   `record check live` covers it as before.
2. **The inference worker** gains an `attention` request: `{ ids }` in, `{ weights }` out, where
   `weights[layer][head][key]` is the `last_attention` output of one forward pass over `ids`. The
   `next-token` request reads `logits` from the same call as now and ignores `last_attention`.
3. **`BrowserModel.attention(ids)`** sends it; **`BrowserProvider.attentionFrom(tokens, query)`**
   runs it on `tokens[0…query]` and returns that row for every layer and head.
   `ModelProvider.attention?(text)` (the whole grid, which `RecordedProvider` serves from traces)
   stays for recordings.
4. **Tiers**: Small covers a new capability, `attention`, with `CANONICAL_LIVE`, the same entry as
   `next-token`, so `tierModels` lists GPT-2 once and Small stays about 419 MB.
5. **`AttentionViewer`**: `useProvider('attention', canonical.displayName)`. Live, the sentence
   picker gains "Your own sentence" with a text field, at most 32 tokens so the lines stay
   readable on a phone. The provider tokenizes on the page with the GPT-2 tokenizer it already
   uses for next tokens, asks for the last token's row first, and asks for another token's row when it's clicked,
   keeping rows it has already fetched. The layer and head pickers, the "all (average)" options,
   and the readout work as they do now, from those rows. The five recorded sentences stay in the
   picker and stay recorded, so the prose still matches.
6. **The fake inference worker** answers `attention` with made-up rows that sum to 1 over keys up
   to the query, so end-to-end tests download nothing.

## Phases

1. **Export and check.** `export_gpt2.py` with its checks, `onnx` and `onnxruntime` in
   `scripts/requirements.txt`, and a run in a real browser (Chrome, WebGPU and WebAssembly) that
   loads the file with Transformers.js and times a next-token call against `Xenova/gpt2` at 16,
   128, and 1,024 tokens. The maintainer creates the Hugging Face repository and uploads.
   **Gate:** if a next-token call is more than 10% slower than today's at any length, the export
   instead becomes a second file next to `Xenova/gpt2`, under `attention` only, and Small grows by
   its size.
2. **Switch GPT-2.** The `canonical.json` pin, the worker's `attention` request,
   `BrowserModel.attention`, `BrowserProvider.attentionFrom`, the `attention` capability, and the
   fake worker. Every live GPT-2 widget's e2e test still passes, and a real-browser run checks
   their live output.
3. **Live viewer.** "Your own sentence" in `AttentionViewer`, its tests, and the spec updates
   below.
4. **Later, separately:** live attention in `InductionHead` ([Learning from examples in the
   prompt](chapters/few-shot.md)) for the visitor's own words, and the roadmap's attention views
   (raw scores, masked scores, and softmax), which need the export to also output scores before
   softmax.

## Security

- The file is pinned and hashed like every other model; `verifiedFetch` refuses anything else,
  and the CSP doesn't change.
- The repository is the maintainer's, so the maintainer's Hugging Face account becomes part of the
  supply chain. A changed file at the same commit is impossible (commits are content-addressed),
  and a new commit changes nothing until `canonical.json` pins it.
- The model card says how the file was made, so anyone can run the export and compare outputs.

## Tests

- **Python** (`export-gpt2`'s checks): the attention rows against the recordings, and the
  next-token distribution against `Xenova/gpt2`.
- **Unit:** `attentionFrom` asks for `tokens[0…query]` and returns rows that sum to 1 over keys up
  to the query; Small covers `attention` with the same model as `next-token` and its size is
  unchanged; `canonical.json`'s pin matches `DOWNLOADS` (existing test).
- **End-to-end,** against the fake worker: under Small, `AttentionViewer` shows "Live · Small",
  takes a typed sentence, updates the readout when a word is clicked, refuses more than 32 tokens
  with a message, and "Show the recording" brings back the recorded sentences. Under Recorded it
  shows no text field. axe and the phone checks cover it like every live widget.
- **Real browser,** before phases 2 and 3 land: Chrome with a persistent profile, as for the Large
  tier, here checking that "When Mary and John went to the store, John gave a drink to" gives
  head 9.9's top token ·Mary, as recorded.
- `record check live` hashes the new pin.

## Specs that change

- [chapters/attention.md](chapters/attention.md): Data and Decisions say attention is live under
  Small for the visitor's own sentence, and why only one row is computed at a time.
- [downloads.md](downloads.md): GPT-2's row (repository, file, the `attention` capability, chapters
  it's used in), the Small tier's kinds of task, and the widgets table.
- [workers.md](workers.md): the `attention` request.
- [models-and-data.md](models-and-data.md): GPT-2's live file and where it comes from.
- [roadmap.md](roadmap.md): the Live attention item goes; the attention-views item stays.
