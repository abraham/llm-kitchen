# Generating text

**Question:** The model gives probabilities for one next token. How does that become a whole
paragraph?

**Key idea:** A model only predicts the next token. Generating text is a loop: predict, pick, append,
repeat. Each token costs one full run of the model, and once picked it is never revised. Always
taking the top token can loop; sampling with a temperature mostly avoids that. Generation stops at a
special end token or a length limit.

## Widgets

- `GlassBoxGenerator`: steps through generation one token at a time, showing the tokens, the
  probability bars, the sampled token, and the token appended to the input (via
  `GenerationStepper`: `TokenChip`, `ProbBars`, `SamplerWheel`). A compact strip of pipeline stages
  (tokens → vectors → blocks → probabilities → pick) lights up on each step. The visitor can override
  the chosen token to follow a recorded branch, or switch to live GPT-2 and type any prompt.

## Data

- Recorded GPT-2 small traces for the running example and its branches (`the-cat-sat-*`).
- Live (T2): GPT-2 small, 8-bit ONNX, once the visitor chooses the Small model tier. It keeps only the last 1,024 tokens.

## Decisions

- The pipeline is a compact strip of stages rather than a full left-to-right replay of every earlier
  visual.
- [Levels](../levels.md): Simple keeps the loop and the stuck example without the end token's
  number. In depth writes greedy and sampling as formulas, shows on the recorded branches that
  greedy isn't the likeliest text, and counts the operations per token, pointing to caching.
