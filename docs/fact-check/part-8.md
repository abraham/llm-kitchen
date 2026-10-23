# Fact-check: Part VIII (Ch 28–32) and the recap (Ch 33)

Claim checklist for the per-chapter fact-check (see PLAN.md §7). Tests:
`tests/unit/part-8-facts.test.ts` (the recorded data says what the prose says),
`src/lib/math/part-8-models.test.ts` (gradient checks and training for the in-browser models),
`tests/e2e/part-8.e2e.ts`.

Data: real runs recorded offline, with each model's pinned revision in its file:

- `static/encoders/fill-mask.json`: BERT base (`google-bert/bert-base-uncased`) and GPT-2 small, by
  `scripts/build-encoder.py`.
- `static/vision/`: pictures drawn by `scripts/build-clip.py` (no licensing questions) and CLIP
  ViT-B/32's patch vectors and caption similarities.

## Ch 28. Reading both ways

| Claim                                                                                    | Backing                                                             |
| ---------------------------------------------------------------------------------------- | ------------------------------------------------------------------- |
| BERT is trained by hiding 15% of tokens and guessing them from both sides                | Cite `devlin2019`                                                   |
| Fridge: GPT-2's top guess is _floor_, BERT's is _top_; bread: _hospital_ vs. _market_    | Test (recorded data)                                                |
| GPT-2's mask lets each token see only itself and earlier tokens; BERT's sees every token | Widget computes it; matches Ch 9 and `devlin2019`                   |
| The blank sees 6 of 10 tokens with GPT-2's mask, 10 of 10 with BERT's                    | Test (BERT's own tokens), e2e                                       |
| BERT base has 12 blocks working on 768 numbers, like GPT-2 small                         | Cite `devlin2019`; BERT config (`num_hidden_layers`, `hidden_size`) |
| The Ch 5 embedding model is an encoder of the same design as BERT                        | all-MiniLM-L6-v2 config: `model_type: bert`                         |
| The original transformer had an encoder and a decoder                                    | Cite `vaswani2017`                                                  |

## Ch 29. Many experts

| Claim                                                                                          | Backing                                                               |
| ---------------------------------------------------------------------------------------------- | --------------------------------------------------------------------- |
| A router scores every expert and sends each token to the best few                              | Cite `shazeer2017`; `Router` test                                     |
| Mixtral 8x7B: 8 experts per block, 2 per token, 47B total, 13B per token (about a quarter)     | Cite `jiang2024` (abstract); test                                     |
| DeepSeek-V3: 671B total, 37B per token (about 6%)                                              | Cite `deepseek2024` (abstract); test                                  |
| Mixtral's experts show no obvious topic pattern; `self` and indentation go to the same experts | Cite `jiang2024` (§5 Routing analysis)                                |
| The widget's router                                                                            | Labeled simplification: random weights, reads Ch 5's token embeddings |

## Ch 30. Remembering without attention

| Claim                                                                      | Backing                                         |
| -------------------------------------------------------------------------- | ----------------------------------------------- |
| Recurrent networks predate transformers                                    | Cite `elman1990`                                |
| The tiny model's memory is 32 numbers however much it has read             | `CharRNN` test                                  |
| After the widget's 1,500 training steps, it expects _u_ after "humpty d"   | Test (same seed and batches as the widget)      |
| GPT-2 keeps 2 × 12 × 768 = 18,432 numbers per token, up to 1,024 tokens    | `canonical.json`; test; widget computes from it |
| The LSTM added gates that learn what to keep and forget                    | Cite `hochreiter1997`                           |
| Transformers replaced recurrence                                           | Cite `vaswani2017`                              |
| Mamba's state update depends on the input; cost grows linearly with length | Cite `gu2023` (abstract)                        |
| Fixed-state models struggle to copy long passages that transformers copy   | Cite `jelassi2024` (abstract)                   |

## Ch 31. Seeing pictures

| Claim                                                                                                                                                   | Backing                               |
| ------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------- |
| A vision transformer cuts a picture into patches, each turned into a vector                                                                             | Cite `dosovitskiy2021`                |
| CLIP ViT-B/32: 224-pixel pictures, 7 × 7 grid of 32-pixel patches, 768 numbers each                                                                     | Test (recorded model config and data) |
| Identical background patches get identical vectors                                                                                                      | Test                                  |
| CLIP trained on 400 million picture–caption pairs, two parts pushed together                                                                            | Cite `radford2021` (abstract)         |
| All 12 exact descriptions pick the right picture first; "something round" barely prefers a circle; "a photo of a cat" scores lower than any exact match | Test                                  |
| Multimodal chat models turn pictures into tokens in the language model's context                                                                        | Cite `liu2023`                        |

## Ch 32. Painting from noise

| Claim                                                                     | Backing                                   |
| ------------------------------------------------------------------------- | ----------------------------------------- |
| Train by adding noise in steps and predicting it; generate by removing it | Cite `sohl-dickstein2015`, `ho2020`       |
| The toy learns to turn noise into the shape                               | Test (ring), gradient checks; e2e         |
| Latent diffusion works on a compressed image and can be steered by text   | Cite `rombach2022`                        |
| The original recipe used 1,000 steps; the toy uses 50                     | Cite `ho2020` (T = 1000); `STEPS` in code |

## Ch 33. Recap

The diagram and quiz restate earlier chapters; each box links to its chapter. Quiz answers are
checked by e2e.

## Changes from the plan

- **Ch 28 live option.** Recorded only (T0); a live fill-mask model is left for later.
- **Ch 29 routing.** A computed toy router, labeled as simplified, instead of recorded routing:
  recording a real mixture-of-experts model (several GB) wasn't practical on the available disk.
- **Ch 30** keeps the memory comparison in its own small widget next to the trainer.
- **Ch 31 pictures and map.** Simple colored shapes drawn by the script instead of photos, so there
  are no licensing questions. Every caption–picture similarity falls between 0.18 and 0.36, so a 2D
  map wouldn't show the matches clearly; the widget ranks pictures for each caption instead. No live
  caption embedding yet.
- **Ch 32 shapes.** Ring, square, and two blobs. A spiral was tried, but the small network only
  turned it into a blob in the training time a page visit allows.
- **The recap** (Ch 33) is checked here, with the last Part; its URL (`/recap`) never changes.
- **Part order.** This was Part VII (Ch 22–27, with Thinking before answering) until milestone 19
  moved reasoning models to Part V and this Part to the end.
