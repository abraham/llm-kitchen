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

- **Tools as code.** The model writes a short program that calls several tools, instead of one
  JSON call per step. A section in [Tools](chapters/tools.md) or
  [The agent loop](chapters/the-agent-loop.md).
- **Several agents.** A manager hands subtasks to specialist agents, each with its own context, so
  the manager's context stays small. A new chapter after [The agent loop](chapters/the-agent-loop.md)
  that builds on [Managing the context](chapters/managing-the-context.md).
- **Testing and watching agents.** Traces of every model and tool call in a run, cost and time per
  step, fixed test sets versus watching real use, a model grading answers, and agent benchmarks
  such as GAIA. A new chapter in the Tools and agents part; today only model benchmarks appear, in
  [Picking a model](chapters/picking-a-model.md).
- **The agent decides what to look up.** It chooses when and what to search, and searches again
  with what it found; and keyword search versus search by meaning, and combining them. In
  [Managing the context](chapters/managing-the-context.md), which covers picking by similarity
  only.
- **Planning.** Making a plan first and then carrying it out, versus deciding step by step. A
  section in [The agent loop](chapters/the-agent-loop.md).
- **Memory across sessions.** An agent writing notes it reads next time. A section in
  [Managing the context](chapters/managing-the-context.md).
- **Agents that use a screen.** A model that sees screenshots and clicks, bridging
  [Seeing pictures](chapters/seeing-pictures.md) and [The agent loop](chapters/the-agent-loop.md).
- **Attention views.** One attention grid switching between raw scores, masked scores, and
  softmax, and paging through all 144 heads, in [Attention](chapters/attention.md) once it's live.
- **Localization:** the site is English only. Translating means deciding whether to also swap the
  example corpora and re-record the data per language.
- **Expert review:** pending; see [sources.md](sources.md).

## Open questions

- None right now.
