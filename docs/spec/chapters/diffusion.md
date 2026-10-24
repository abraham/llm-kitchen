# Painting from noise

**Question:** These models read pictures. How do image generators make them?

**Key idea:** A diffusion model learns to predict the noise that was added to a training example. To
make something new, it starts from pure noise and removes a little predicted noise at each step.
Unlike GPT-2's one-token-at-a-time writing, it refines the whole picture at every step.

## Widgets

- `DiffusionToy`: a cloud of random 2D points steps back into a shape (a ring, a square, or two
  blobs), denoised by a tiny network trained in the browser with the hand-written MLP from
  [Learning from mistakes](learning-from-mistakes.md) (`LossCurve`). A slider moves through the
  denoising steps.

## Data

Computed in the browser (`src/lib/math/diffusion.ts`), with 50 steps (the original recipe used
1,000).

## Decisions

- Ring, square, and two blobs: a spiral was tried, but the small network only turned it into a blob
  in the training time a page visit allows.
- The Next question leads into [Choosing actions](decision-models.md).
- [Levels](../levels.md): Simple keeps the idea and the toy. In depth writes out the toy's noise
  schedule, the one-step formula for any amount of noise, and the sampling step.
