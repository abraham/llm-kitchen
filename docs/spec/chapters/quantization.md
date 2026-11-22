# Fewer bits per number

**Question:** A model with 405 billion weights has to keep every one of them in memory. How much space
does each weight need, and could it be less?

**Key idea:** Memory for the weights is about weights × bits per weight ÷ 8 bytes. Quantization
rounds each weight to one of a few allowed values, with one scale per block. Quality holds until the
rounding gets too coarse: GPT-2 small is unchanged at 8 bits, drifts at 6 and 5, and breaks at 4
with plain rounding. Quantization-aware training trains with the rounding in place, so a model keeps
its quality at 4 bits. Taken to the extreme, models made for it work with three values or one bit
per weight, where rounding a finished model destroys it.

## Widgets

- `QuantizeLab`: slide GPT-2 small from 32 bits per weight down to 2 and see the weights' size, one
  block of weights snapping to the allowed values, an annotated bit-field inspector for a chosen
  weight from the block (highlighting dropped bits, the stored integer code, shared block scale, and
  exact rounding error), the top guesses for the running example (`ProbBars`), a short continuation,
  and the loss on a test passage.

## Data

Recorded by `scripts/record/quantize.py` (`static/data/quantize/gpt2/precisions.json`) at 32, 16, 8, 6, 5, 4, 3, and
2 bits.

## Decisions

- Rounding is plain round-to-nearest in blocks of 32 weights sharing one 16-bit scale, like GGUF's
  Q4_0 and Q8_0, with no quantization-aware training or calibration. Every weight matrix is rounded,
  including the token and position tables; biases and layer-norm numbers are not.
- 6 and 5 bits are included to show the drift between "holds" and "breaks".
- The live GPT-2 on the site already runs 8-bit weights (a different rounding method). The chapter
  points this out and quotes how its percentages differ, rather than comparing side by side.
- One bit per weight is prose, not a widget: the demo's GPT-2 has no trained low-bit version.
  smolmaxxing (a hobby project, cited with an accessed date) gives the measured failure of rounding
  Qwen3.5-2B to 2 and 1 bits after training; BitNet b1.58 (paper) and Bonsai 8B (model card) are the
  models made for it. Bonsai's training method is unpublished, and the text says so.
- Checking a rounded model: the demo's loss on a passage scores each token with the real text
  before it, so it can miss failures that only show when the model writes for itself. smolmaxxing's
  Moon-Beam-8B-A1B is the measured example (perplexity 10.1 → 11.8 from 4 to 2 bits, yet 7 of 7
  long answers looped); Ranzato et al. back the reason. It says "the largest part" rather than
  "experts", since mixtures of experts come later.
- [Levels](../levels.md): Simple keeps the memory rule and what happens at each precision, and
  names QAT without the outlier method. In depth writes block rounding as formulas, works it on the
  widget's block, counts the scale's half bit, says how QAT and the outlier method work, and writes
  out BitNet b1.58's three-value rounding and Bonsai's 1.125 bits per weight.
