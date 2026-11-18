# Remembering without attention

**Question:** Attention keeps every earlier token around, and that gets expensive for long texts.
Could a model keep just a short summary instead?

**Key idea:** A recurrent model reads one token at a time and carries a fixed-size memory forward.
Its memory doesn't grow with the text, so long texts are cheap, but it has to decide what to forget.
Attention keeps every earlier token around, which costs more but lets the model look anything up
again. State-space models such as Mamba bring the idea back, and hybrids such as Qwen3.5 and
Qwen3-Next mix both: three of every four layers keep a fixed-size memory (Gated DeltaNet) and the
fourth is full attention.

## Widgets

- `RecurrentMemory`: a tiny character-level recurrent model trains in the browser on the rhymes
  from [Predicting by counting](predicting-by-counting.md) (`LossCurve`). The visitor steps through
  a sentence and watches its 32-number memory update one character at a time (`VectorStrip`), with
  its next-character guesses (`ProbBars`).
- `MemoryGrowth`: memory use as the text grows: GPT-2's KV cache from
  [Caching](caching.md) grows with every token, while the recurrent model's stays the same.

## Data

Computed in the browser (`src/lib/math/rnn.ts`); the KV cache size comes from
`models/canonical.json`. Qwen3.5-2B's layer mix and sizes, from its config.json, are in
`src/lib/chapters/recurrent-models/data.ts`.

## Decisions

- The memory comparison is its own small widget next to the trainer.
- Hybrids are prose, citing the Qwen model cards for the layer layout and the Gated DeltaNet paper
  for the update and for hybrids beating its layers alone (its hybrids used windowed attention,
  and the text says so).
- [Levels](../levels.md): Simple keeps the index-card picture and the history in one line each. In
  depth writes out the tiny model's update, explains why plain recurrent networks forget, and
  compares memory sizes, including Qwen3.5-2B's fixed memory against its per-token attention cache.
