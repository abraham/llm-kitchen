# Fact-check: Part VIII (Ch 30–34) and the wrap-up (Ch 35–38)

Claim checklist for the per-chapter fact-check (see [the spec](../spec/sources.md)). Tests:
each chapter's `facts.test.ts` (the recorded data says what the prose says),
`src/lib/math/part-8-models.test.ts` (gradient checks and training for the in-browser models),
each chapter's `chapter.e2e.ts`.

Data: real runs recorded offline, with each model's pinned revision in its file:

- `static/data/encoders/fill-mask.json`: BERT base (`google-bert/bert-base-uncased`) and GPT-2 small, by
  `scripts/record/encoder.py`.
- `static/vision/`: pictures drawn by `scripts/record/clip.py` (no licensing questions) and CLIP
  ViT-B/32's patch vectors and caption similarities.

## Ch 30. Reading both ways

| Claim                                                                                    | Backing                                                             |
| ---------------------------------------------------------------------------------------- | ------------------------------------------------------------------- |
| BERT is trained by hiding 15% of tokens and guessing them from both sides                | Cite `devlin2019`                                                   |
| Fridge: GPT-2's top guess is _floor_, BERT's is _top_; bread: _hospital_ vs. _market_    | Test (recorded data)                                                |
| GPT-2's mask lets each token see only itself and earlier tokens; BERT's sees every token | Widget computes it; matches Ch 9 and `devlin2019`                   |
| The blank sees 6 of 10 tokens with GPT-2's mask, 10 of 10 with BERT's                    | Test (BERT's own tokens), e2e                                       |
| BERT base has 12 blocks working on 768 numbers, like GPT-2 small                         | Cite `devlin2019`; BERT config (`num_hidden_layers`, `hidden_size`) |
| The Ch 5 embedding model is an encoder of the same design as BERT                        | all-MiniLM-L6-v2 config: `model_type: bert`                         |
| The original transformer had an encoder and a decoder                                    | Cite `vaswani2017`                                                  |

## Ch 31. Many experts

| Claim                                                                                          | Backing                                                               |
| ---------------------------------------------------------------------------------------------- | --------------------------------------------------------------------- |
| A router scores every expert and sends each token to the best few                              | Cite `shazeer2017`; `Router` test                                     |
| Mixtral 8x7B: 8 experts per block, 2 per token, 47B total, 13B per token (about a quarter)     | Cite `jiang2024` (abstract); test                                     |
| DeepSeek-V3: 671B total, 37B per token (about 6%)                                              | Cite `deepseek2024` (abstract); test                                  |
| Mixtral's experts show no obvious topic pattern; `self` and indentation go to the same experts | Cite `jiang2024` (§5 Routing analysis)                                |
| The widget's router                                                                            | Labeled simplification: random weights, reads Ch 5's token embeddings |

## Ch 32. Remembering without attention

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

## Ch 33. Seeing pictures

| Claim                                                                                                                                                   | Backing                               |
| ------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------- |
| A vision transformer cuts a picture into patches, each turned into a vector                                                                             | Cite `dosovitskiy2021`                |
| CLIP ViT-B/32: 224-pixel pictures, 7 × 7 grid of 32-pixel patches, 768 numbers each                                                                     | Test (recorded model config and data) |
| Identical background patches get identical vectors                                                                                                      | Test                                  |
| CLIP trained on 400 million picture–caption pairs, two parts pushed together                                                                            | Cite `radford2021` (abstract)         |
| All 12 exact descriptions pick the right picture first; "something round" barely prefers a circle; "a photo of a cat" scores lower than any exact match | Test                                  |
| Multimodal chat models turn pictures into tokens in the language model's context                                                                        | Cite `liu2023`                        |

## Ch 34. Painting from noise

| Claim                                                                     | Backing                                   |
| ------------------------------------------------------------------------- | ----------------------------------------- |
| Train by adding noise in steps and predicting it; generate by removing it | Cite `sohl-dickstein2015`, `ho2020`       |
| The toy learns to turn noise into the shape                               | Test (ring), gradient checks; e2e         |
| Latent diffusion works on a compressed image and can be steered by text   | Cite `rombach2022`                        |
| The original recipe used 1,000 steps; the toy uses 50                     | Cite `ho2020` (T = 1000); `STEPS` in code |

## Ch 35. Recap

The diagram restates earlier chapters; each box links to its chapter. The quiz moved to Ch 38 in
milestone 20.

## Ch 36. From message to reply

Each stage restates the chapters it links (`src/lib/chapters/end-to-end/data.ts`); the unit test checks that
every Part I–VII is linked from a stage and Part VIII from the closing box. Data comes from three
existing recordings, labeled in the widget:

- [x] The harness, cache, tool, and reply stages use the Ch 23 recording
      (`static/data/agent/chat.json`, Qwen2.5-1.5B-Instruct): call 1 is 400 tokens, call 2 is 493 and
      starts with the whole of call 1, so only 93 tokens need new work (Ch 27). The one tool call
      is `search_rhymes` with `{"query": "cat"}`; the run's policy is `none` (no guardrail asked),
      which the widget says, noting the search only reads (Ch 29).
- [x] In-model stages use GPT-2 small on "The cat sat on the" (`static/data/traces/gpt2/the-cat-sat.json`,
      `static/data/vectors/gpt2/the-cat-sat.json`): 5 tokens; temperature 0 picks " floor" at 7.6%; the
      logit lens reads " same" after block 1 and " floor" after blocks 8 and 12 (as Ch 10 says).
- [x] "GPT-2 adds a vector for the token's position": GPT-2 uses learned absolute position
      embeddings added to the token embeddings (Radford et al. 2019, as in Ch 10's stream "the
      vectors for ' the' and its position"). The text says GPT-2 specifically, since Qwen2.5 uses
      rotary position embeddings inside attention instead.
- [x] KV cache: 500 tokens took about 10 s with the cache and 43 s without
      (`static/data/caching/kv-cache.json`, as in Ch 27).
- [x] "The loop stops at an end-of-turn token": Ch 11 and Ch 15 (chat markers); the Qwen prompt
      ends each turn with `<|im_end|>`.
- [x] The closing box's one-line summaries match Ch 30–34 (both-ways attention; part of the network
      per token; fixed-size memory; picture patches as tokens; refined from noise).

## Ch 37. Picking a model

The decoder's names (`src/lib/chapters/picking-a-model/data.ts`) are from Google's Gemma 4, Gemma 4 QAT Mobile,
and Gemma 4 QAT Q4_0 collections, two of DeepSeek's R1-Distill models, and the models this site
uses, as listed on 2026-10-23. Lineups
and suffixes change often, so re-check the list in the final fact review. The unit test checks that
every name splits into known parts that spell it back.

| Claim                                                                                                                   | Backing                                                               |
| ----------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------- |
| E2B: 2.3B effective, 5.1B with per-layer embeddings; E4B: 4.5B and 8B; per-layer tables are only looked up              | Cite `gemma4-model-card` (Dense Models table and the note on "E")     |
| 26B A4B: 25.2B total, 3.8B active, 8 of 128 experts plus 1 shared; runs almost as fast as a 4B model                    | Cite `gemma4-model-card` (MoE table and the note on "A")              |
| 12B: 11.95B; 31B: 30.7B                                                                                                 | Cite `gemma4-model-card`; test (31B: 61 GB at 16 bits, 15 GB at 4)    |
| Context: 128K tokens (E2B, E4B), 256K (12B, 26B A4B, 31B); audio only on E2B, E4B, 12B; thinking mode; Apache 2.0       | Cite `gemma4-model-card`                                              |
| Four QAT versions: unquantized 16-bit, GGUF Q4_0, mobile (wNa8o8, with 2-bit layers), compressed tensors w4a16 for vLLM | Cite `gemma4-qat`                                                     |
| GGUF's Q4_0: 4-bit, blocks of 32 with one scale                                                                         | Cite `gguf-quant-types`                                               |
| `-assistant` models are speculative-decoding drafters                                                                   | Cite `gemma4-assistant` (Ch 14)                                       |
| DiffusionGemma is based on 26B A4B and denoises a 256-token canvas                                                      | Cite `diffusiongemma-model-card`                                      |
| Hugging Face shows 5B for `gemma-4-E2B` (stored tensors)                                                                | Collection listing, 2026-10-23                                        |
| E models are built for phones and laptops                                                                               | Cite `gemma4-model-card` ("Optimized for On-Device")                  |
| Qwen2.5 is from Alibaba's Qwen team; GPT-2's sizes are small, medium, large, and XL                                     | `qwen2024`; `radford2019` and the Hugging Face model names            |
| `DeepSeek-R1-Distill-Qwen-1.5B` is a 1.5B Qwen model tuned on examples made with DeepSeek-R1                            | Cite `deepseek2025` §2.4 (base: Qwen2.5-Math-1.5B); test (name parts) |

## Ch 38. Check yourself

Fourteen questions in reading order (`src/lib/chapters/quiz/data.ts`); the unit test checks every Part I–VIII
has at least one. Each answer restates its linked chapter:

- [x] Temperature spreads probabilities so unlikely tokens are picked more often (Ch 2).
- [x] Training nudges every weight to make the right next token more likely (Ch 7).
- [x] 4-bit weights take about a quarter of the memory of 16-bit ones, and coarse rounding can hurt
      (Ch 13; added in milestone 21).
- [x] Speculative decoding writes exactly the big model's text in fewer passes (Ch 14; added in
      milestone 21).
- [x] The other ten are unchanged from the recap's quiz (Ch 4, 16, 9, 11, 17, 19, 24, 27, 28, 29,
      30). The e2e test answers all fourteen and checks the revisit list.
