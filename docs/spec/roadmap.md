# Roadmap

Work that isn't built yet. When something here is built, move its description into the spec it
belongs to and remove it here.

## Live models

- **Live attention.** The standard GPT-2 ONNX export used by Transformers.js has no attention
  outputs, so [Attention](chapters/attention.md) shows attention recorded for 5 sentences. A custom
  ONNX export with attention outputs would let visitors type their own sentence. Polo Club's
  Transformer Explainer (MIT) shows it works in the browser: its GPT-2 export outputs every head's
  raw scores, masked scores, and softmax weights. Its file is full precision (626 MB) and comes
  without its export script, so this needs an export of our own, 8-bit, in a model tier. The same
  outputs could follow one token through the whole model. The plan is in
  [live-attention.md](live-attention.md).
- **Timing generation live** with and without the KV cache in [Caching](chapters/caching.md), if
  Transformers.js exposes the switch.
- **T4, bring your own API key:** frontier output with top logprobs and tool calling, through the
  same `ModelProvider` interface. Rules when it's built:
  - keep the key in memory or `sessionStorage` only, never `localStorage`;
  - call the provider directly from the browser and never send the key anywhere else;
  - extend the CSP `connect-src` allowlist only for the providers supported;
  - warn clearly that the visitor's prompt goes to the provider;
  - never ship a key in the site.
- T4 needs provider test setups that CI's and local headless
  browsers don't have. A rate-limited serverless proxy for a hosted demo would leave the static
  scope and is a separate decision.

## Content

- **Expert review:** pending; see [sources.md](sources.md).

## Open questions

- None right now.
