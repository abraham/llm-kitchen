# Learning from mistakes

**Question:** GPT-2 small has about 124 million numbers. Nobody set them by hand, so how were they
chosen?

**Key idea:** Training is a loop: predict on examples, measure the mistake, nudge every weight,
repeat. For a language model, any text is examples (the words so far, and the word that came next).
The loss measures how wrong it is; for a language model, how surprised it was by the real next
token. Gradient descent nudges every weight downhill on the loss, and backpropagation works out
which way that is for every weight at once. Token vectors are weights too, learned the same way,
and every later model in the course is trained by this loop.

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

## Decisions

- The chapter opens with the three-step loop and contrasts it with counting in
  [Predicting by counting](predicting-by-counting.md): same kind of examples, but weights can't be
  filled in like a table. The curve fitter comes next as the smallest case where every weight is
  visible, and its sections (the loss, then the step) take the loop apart.
- The tiny language model is described as the whole path from [A neuron](a-neuron.md) in miniature
  (character vectors, 64 neurons, a chance per character), so it answers where the vectors of
  [Meaning as position](embeddings.md) come from.
- A closing section, "What comes next is built on this", links the later chapters that keep the
  recipe: attention and the block (arranged differently), Scale and Fewer bits per number (more
  weights), From predictor to assistant (other examples), and Quirks and limits (what the loss
  doesn't reward).
- [Levels](../levels.md): Simple keeps the loss, the downhill picture, and backpropagation's job,
  without the network sizes or the guessing line. In depth gives mean squared error, cross-entropy,
  and perplexity, the gradient descent step, backpropagation's chain rule for one neuron, and what
  Adam does with its usual settings, and dropout: what it is, GPT-2's chance of 0.1, and that it's
  only used in training.
