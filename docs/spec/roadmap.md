# Roadmap

Work that isn't built yet. When something here is built, move its description into the spec it
belongs to and remove it here.

## Live models

- **Live attention.** The standard GPT-2 ONNX export used by Transformers.js has no attention
  outputs, so [Attention](chapters/attention.md) shows attention recorded for 5 sentences. A custom
  ONNX export with attention outputs would let visitors type their own sentence.
- **Model tiers:** a site-wide choice between recordings and two downloadable tiers of models
  (Small, and Large with a chat model on WebGPU), made on the Models page linked from the app bar.
  It brings live options to more GPT-2 widgets ([The guessing game](chapters/guessing-game.md),
  [Probability and sampling](chapters/probability-and-sampling.md)), a fill-mask encoder for
  [Reading both ways](chapters/encoders.md), CLIP's text half for
  [Seeing pictures](chapters/seeing-pictures.md), and a chat model for the prompting and tools
  chapters. The plan is in [model-tiers.md](model-tiers.md).
- **Timing generation live** with and without the KV cache in [Caching](chapters/caching.md), if
  Transformers.js exposes the switch.
- **T4, bring your own API key:** frontier output with top logprobs and tool calling, through the
  same `ModelProvider` interface. Rules when it's built:
  - keep the key in memory or `sessionStorage` only, never `localStorage`;
  - call the provider directly from the browser and never send the key anywhere else;
  - extend the CSP `connect-src` allowlist only for the providers supported;
  - warn clearly that the visitor's prompt goes to the provider;
  - never ship a key in the site.
- The Large tier and T4 both need WebGPU or provider test setups that CI's and local headless
  browsers don't have. A rate-limited serverless proxy for a hosted demo would leave the static
  scope and is a separate decision.

## Content

- **Localization:** the site is English only. Translating means deciding whether to also swap the
  example corpora and re-record the data per language.
- **Expert review:** pending; see [sources.md](sources.md).

## Open questions

- None right now.
