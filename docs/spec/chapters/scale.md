# Scale

**Question:** GPT-2 writes fluent text that often makes no sense. What happens when the same recipe
is made much bigger?

**Key idea:** Large models use the same recipe as GPT-2, scaled up thousands of times. Loss falls
along a smooth curve as size, training text, and compute grow: a scaling law. For a fixed budget,
more training text and fewer weights can beat a giant model.

## Widgets

- `ScaleExplorer`: a log-scale comparison of weights, training tokens, and compute, from the site's
  toy models through the GPT-2 sizes to large models that published their numbers (GPT-3, Chinchilla,
  Gopher, Llama 3 405B).
- `ScalingLawChart`: Kaplan et al.'s fitted loss curve for model size, with the GPT-2 sizes placed on
  it.

## Data

Published figures in `src/lib/chapters/scale/data.ts`, each cited; compute for the toy models uses the
standard estimate of 6 × weights × tokens.

## Decisions

- The chart draws the paper's fitted formula, not measured losses, and says so.
