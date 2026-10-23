# Learning from mistakes

**Question:** GPT-2 small has about 124 million numbers. Nobody set them by hand, so how were they
chosen?

**Key idea:** A network starts with random weights and learns from examples. The loss measures how
wrong it is; for a language model, how surprised it was by the real next token. Gradient descent
nudges every weight downhill on the loss, and backpropagation works out which way that is for every
weight at once.

## Widgets

- `CurveFitter`: a 16-neuron network with 49 numbers, all listed, learns to follow a wavy line.
  "Take 1 step" nudges every number once; "Train" runs on, with a falling `LossCurve`.
- `LossLandscape`: a ball rolls down a loss landscape (gradient descent).
- `TinyTrainer`: trains a tiny character-level model on the rhymes from
  [Predicting by counting](predicting-by-counting.md), with its loss curve next to sample text that
  improves as it trains. It reads 3 characters to predict the next (a scaled-down Bengio et al.
  design) and has 3,790 weights.

## Data

Computed in the browser. The MLP, backpropagation, and Adam optimizer are hand-written in
`src/lib/math/mlp.ts` (no ML library), and the tiny model trains in `workers/trainer.worker.ts`.
