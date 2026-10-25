# Roadmap

Work that isn't built yet. When something here is built, move its description into the spec it
belongs to and remove it here.

## Quality

- **Accessibility checks** for every page in the states a visitor sees (phone width, open
  disclosures, stepped figures), plus the keyboard, reflow, and text spacing. The plan is in
  [accessibility-checks.md](accessibility-checks.md).

## Live models

- **Live attention.** The standard GPT-2 ONNX export used by Transformers.js has no attention
  outputs, so [Attention](chapters/attention.md) shows attention recorded for 5 sentences. A custom
  ONNX export with attention outputs would let visitors type their own sentence.
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

- **Localization:** the site is English only. Translating means deciding whether to also swap the
  example corpora and re-record the data per language.
- **Expert review:** pending; see [sources.md](sources.md).

## Open questions

- None right now.
