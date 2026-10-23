# Fewer bits per number

**Question:** A model with 405 billion weights has to keep every one of them in memory. How much space
does each weight need, and could it be less?

**Key idea:** Memory for the weights is about weights × bits per weight ÷ 8 bytes. Quantization
rounds each weight to one of a few allowed values, with one scale per block. Quality holds until the
rounding gets too coarse: GPT-2 small is unchanged at 8 bits, drifts at 6 and 5, and breaks at 4
with plain rounding. Quantization-aware training trains with the rounding in place, so a model keeps
its quality at 4 bits.

## Widgets

- `QuantizeLab`: slide GPT-2 small from 32 bits per weight down to 2 and see the weights' size, one
  block of weights snapping to the allowed values, the top guesses for the running example
  (`ProbBars`), a short continuation, and the loss on a test passage.

## Data

Recorded by `scripts/build-quantize.py` (`static/quantize/gpt2.json`) at 32, 16, 8, 6, 5, 4, 3, and
2 bits.

## Decisions

- Rounding is plain round-to-nearest in blocks of 32 weights sharing one 16-bit scale, like GGUF's
  Q4_0 and Q8_0, with no quantization-aware training or calibration. Every weight matrix is rounded,
  including the token and position tables; biases and layer-norm numbers are not.
- 6 and 5 bits are included to show the drift between "holds" and "breaks".
- The live GPT-2 on the site already runs 8-bit weights (a different rounding method). The chapter
  points this out and quotes how its percentages differ, rather than comparing side by side.
