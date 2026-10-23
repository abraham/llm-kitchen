# Roadmap

Work that isn't built yet. When something here is built, move its description into the spec it
belongs to and remove it here.

## Live models

- **Live attention.** The standard GPT-2 ONNX export used by Transformers.js has no attention
  outputs, so [Attention](chapters/attention.md) shows attention recorded for 5 sentences. A custom
  ONNX export with attention outputs would let visitors type their own sentence.
- **More live GPT-2 options:** the top guesses for the visitor's own sentence in
  [The guessing game](chapters/guessing-game.md), temperatures side by side in
  [Probability and sampling](chapters/probability-and-sampling.md), and timing generation with and
  without the KV cache in [Caching](chapters/caching.md) (if Transformers.js exposes the switch).
- **Live models for other kinds of models:** a small fill-mask encoder for
  [Reading both ways](chapters/encoders.md), and CLIP's text half for
  [Seeing pictures](chapters/seeing-pictures.md), so visitors can try their own sentences and
  captions.
- **T3, a chat model in the browser:** WebLLM on WebGPU with a ~0.5–1.5B instruct model (0.5–1 GB).
  It would give a live base vs. instruct comparison in
  [From predictor to assistant](chapters/predictor-to-assistant.md), a real chat in
  [The model is not the product](chapters/the-model-is-not-the-product.md), and live tool calling
  in the Harnesses chapters, limited to the same in-browser toy tools.
- **T4, bring your own API key:** frontier output with top logprobs and tool calling, through the
  same `ModelProvider` interface. Rules when it's built:
  - keep the key in memory or `sessionStorage` only, never `localStorage`;
  - call the provider directly from the browser and never send the key anywhere else;
  - extend the CSP `connect-src` allowlist only for the providers supported;
  - warn clearly that the visitor's prompt goes to the provider;
  - never ship a key in the site.
- T3 and T4 both need WebGPU or provider test setups that CI's and local headless browsers don't
  have. A rate-limited serverless proxy for a hosted demo would leave the static scope and is a
  separate decision.

## Content

- **Math sidebar:** an optional panel per chapter with the equations behind the idea.
- **Localization:** the site is English only. Translating means deciding whether to also swap the
  example corpora and re-record the data per language.
- **Expert review:** pending; see [sources.md](sources.md).

## Open questions

- None right now.
