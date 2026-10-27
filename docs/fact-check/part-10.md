# Fact-check: Part X, Other kinds of models (Ch 36–41), and the wrap-up (Ch 42–46)

Claim checklist for the per-chapter fact-check (see [the spec](../spec/sources.md)). Tests:
each chapter's `facts.test.ts` (the recorded data says what the prose says),
`src/lib/math/part-8-models.test.ts` (gradient checks and training for the in-browser models),
each chapter's `chapter.e2e.ts`.

Data: real runs recorded offline, with each model's pinned revision in its file:

- `static/data/encoders/fill-mask.json`: BERT base (`google-bert/bert-base-uncased`) and GPT-2 small, by
  `scripts/record/encoder.py`.
- `static/vision/`: pictures drawn by `scripts/record/clip.py` (no licensing questions) and CLIP
  ViT-B/32's patch vectors and caption similarities.
- `static/data/decisions/grid.json`: the grid world, a summary of 4,000 generated training runs,
  and the weights of the toy Decision Transformer trained on them, by `scripts/record/decisions.py`
  (seeded; the model's revision is the SHA-1 of the script).

## Ch 36. Reading both ways

| Claim                                                                                                                                   | Backing                                                             |
| --------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------- |
| BERT is trained by hiding 15% of tokens and guessing them from both sides                                                               | Cite `devlin2019`                                                   |
| Fridge: GPT-2's top guess is _floor_, BERT's is _top_; bread: _hospital_ vs. _market_                                                   | Test (recorded data)                                                |
| GPT-2's mask lets each token see only itself and earlier tokens; BERT's sees every token                                                | Widget computes it; matches Ch 9 and `devlin2019`                   |
| The blank sees 6 of 10 tokens with GPT-2's mask, 10 of 10 with BERT's                                                                   | Test (BERT's own tokens), e2e                                       |
| BERT base has 12 blocks working on 768 numbers, like GPT-2 small                                                                        | Cite `devlin2019`; BERT config (`num_hidden_layers`, `hidden_size`) |
| The Ch 5 embedding model is an encoder of the same design as BERT                                                                       | all-MiniLM-L6-v2 config: `model_type: bert`                         |
| The original transformer had an encoder and a decoder                                                                                   | Cite `vaswani2017`                                                  |
| Simple: restates Standard in plainer words, with no new claims                                                                          | Reviewed against the Standard text                                  |
| In depth: the dog: GPT-2's top guess a new line at 1.4%, BERT's _dog_ at 61%; _wagged_ is "wa" + "##gged"                               | Test (recorded data)                                                |
| In depth: the mask M is added before the softmax: −∞ for later tokens (GPT-2), 0 everywhere (BERT)                                      | Ch 9 (`attention.ts`); cite `vaswani2017`, `devlin2019`             |
| In depth: 10 tokens: 55 of 100 pairs with the causal mask                                                                               | Test                                                                |
| In depth: only the hidden 15% are predicted; of them 80% `[MASK]`, 10% random, 10% unchanged, since `[MASK]` never appears in real text | Cite `devlin2019` (§3.1, Appendix C.2)                              |

## Ch 37. Many experts

| Claim                                                                                                | Backing                                                               |
| ---------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------- |
| A router scores every expert and sends each token to the best few                                    | Cite `shazeer2017`; `Router` test                                     |
| Mixtral 8x7B: 8 experts per block, 2 per token, 47B total, 13B per token (about a quarter)           | Cite `jiang2024` (abstract); test                                     |
| DeepSeek-V3: 671B total, 37B per token (about 6%)                                                    | Cite `deepseek2024` (abstract); test                                  |
| Mixtral's experts show no obvious topic pattern; `self` and indentation go to the same experts       | Cite `jiang2024` (§5 Routing analysis)                                |
| The widget's router                                                                                  | Labeled simplification: random weights, reads Ch 5's token embeddings |
| Simple: restates Standard in plainer words, with no new claims                                       | Reviewed against the Standard text                                    |
| In depth: y = Σ over the top k of g_i(x) E_i(x), g = softmax(top_k(x W_g)); Mixtral k = 2            | Cite `jiang2024` (§2.1)                                               |
| In depth: the widget's rescaled top-k weights equal a softmax over the top k                         | Test (`Router`)                                                       |
| In depth: only the MLPs are split; S + 8E = 47, S + 2E = 13 gives about 5.7B per expert, 1.7B shared | Cite `jiang2024`; arithmetic, test                                    |
| In depth: favored experts train faster; a loss term penalizes uneven use                             | Cite `shazeer2017` (§4)                                               |
| In depth: DeepSeek-V3 balances experts without an extra loss term                                    | Cite `deepseek2024` (abstract)                                        |

## Ch 38. Remembering without attention

| Claim                                                                                                                                                         | Backing                                                                                                 |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| Recurrent networks predate transformers                                                                                                                       | Cite `elman1990`                                                                                        |
| The tiny model's memory is 32 numbers however much it has read                                                                                                | `CharRNN` test                                                                                          |
| After the widget's 1,500 training steps, it expects _u_ after "humpty d"                                                                                      | Test (same seed and batches as the widget)                                                              |
| GPT-2 keeps 2 × 12 × 768 = 18,432 numbers per token, up to 1,024 tokens                                                                                       | `canonical.json`; test; widget computes from it                                                         |
| The LSTM added gates that learn what to keep and forget                                                                                                       | Cite `hochreiter1997`                                                                                   |
| Transformers replaced recurrence                                                                                                                              | Cite `vaswani2017`                                                                                      |
| Recurrent models read even training text one token at a time; transformers handle every position at once, so they train faster                                | Cite `vaswani2017` (§1, abstract: "more parallelizable and requiring significantly less time to train") |
| The first transformer set a single-model record on English-to-French after 3.5 days on eight GPUs, a small fraction of the best earlier models' training cost | Cite `vaswani2017` (abstract: 41.8 BLEU, WMT 2014)                                                      |
| Generation still goes one token at a time; training is what runs in parallel                                                                                  | Ch 11 (one run per token); causal mask lets every position train at once                                |
| Mamba's state update depends on the input; cost grows linearly with length                                                                                    | Cite `gu2023` (abstract)                                                                                |
| Fixed-state models struggle to copy long passages that transformers copy                                                                                      | Cite `jelassi2024` (abstract)                                                                           |
| Simple: restates Standard in plainer words, with no new claims                                                                                                | Reviewed against the Standard text                                                                      |
| In depth: h_t = tanh(W_h h_{t−1} + W_x x_t + b), p = softmax(W_y h_t + c), as in the tiny model                                                               | Implementation (`rnn.ts`); cite `elman1990`                                                             |
| In depth: tanh keeps the memory between −1 and 1; trained by backpropagation through the steps                                                                | `rnn.ts`; test                                                                                          |
| In depth: the error passes through W_h and tanh's slope (at most 1) at every step, so it fades or blows up                                                    | Cite `hochreiter1997` (abstract and §3)                                                                 |
| In depth: the LSTM's cell is carried forward by addition (constant error carousel), with gates for writing and reading                                        | Cite `hochreiter1997` (abstract)                                                                        |
| In depth: per layer, recurrence needs n sequential steps and a path of n between tokens n apart; self-attention needs 1 and 1, at the cost of n² comparisons  | Cite `vaswani2017` (Table 1: sequential operations, maximum path length, complexity per layer)          |
| In depth: GPT-2 at 1,024 tokens keeps 18,874,368 numbers; the tiny model 32                                                                                   | Test (`canonical.json`)                                                                                 |

## Ch 39. Seeing pictures

| Claim                                                                                                                                                   | Backing                                                                                      |
| ------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| A vision transformer cuts a picture into patches, each turned into a vector                                                                             | Cite `dosovitskiy2021`                                                                       |
| CLIP ViT-B/32: 224-pixel pictures, 7 × 7 grid of 32-pixel patches, 768 numbers each                                                                     | Test (recorded model config and data)                                                        |
| Identical background patches get identical vectors                                                                                                      | Test                                                                                         |
| CLIP trained on 400 million picture–caption pairs, two parts pushed together                                                                            | Cite `radford2021` (abstract)                                                                |
| All 12 exact descriptions pick the right picture first; "something round" barely prefers a circle; "a photo of a cat" scores lower than any exact match | Test                                                                                         |
| Multimodal chat models turn pictures into tokens in the language model's context                                                                        | Cite `liu2023`                                                                               |
| Simple: restates Standard in plainer words, with no new claims                                                                                          | Reviewed against the Standard text                                                           |
| In depth: 32 × 32 × 3 = 3,072 numbers per patch, one learned matrix to 768, plus position                                                               | Cite `dosovitskiy2021` (§3.1); test                                                          |
| In depth: a class token makes 50 vectors; its output stands for the picture; CLIP's shared space has 512 numbers                                        | Cite `dosovitskiy2021`; test (recorded config)                                               |
| In depth: similarities × a learned temperature (100) before the softmax; red circle 0.271 vs square 0.268 gives 42% vs 32%                              | Cite `radford2021` (§2.5); test                                                              |
| In depth: training batches of 32,768 pairs; each picture picks its caption and each caption its picture                                                 | Cite `radford2021` (§2.3, §2.5)                                                              |
| Computer-use agent: screenshot in, click/type/key actions out, the next screenshot is the tool result; the example run is made up                       | Cite `anthropic-computer-use`; labeled "made-up"                                             |
| Anthropic trained its model to count pixels to click, comparing it to counting letters; screenshots are a flipbook that can miss short-lived messages   | Cite `anthropic-computer-use` ("The research process", "The future of computer use")         |
| OSWorld: 369 tasks in real apps, checked by scripts; people over 72%, best model 12.24%, failing at GUI grounding and operational knowledge             | Cite `xie2024osworld` (abstract)                                                             |
| Anthropic's first computer-use model scored 14.9% on OSWorld                                                                                            | Cite `anthropic-computer-use`                                                                |
| Prompt injection through what's on screen is a main risk                                                                                                | Cite `anthropic-computer-use` ("Making computer use safe")                                   |
| In depth: 28 × 28-pixel patches, ⌈w/28⌉ × ⌈h/28⌉ tokens; 1280 × 800 is 46 × 29 = 1,334; ten screenshots 13,340                                          | Cite `anthropic-vision` ("Resolution and token cost"); test (also checks the docs' examples) |

## Ch 40. Painting from noise

| Claim                                                                                                        | Backing                                                   |
| ------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------- |
| Train by adding noise in steps and predicting it; generate by removing it                                    | Cite `sohl-dickstein2015`, `ho2020`                       |
| The toy learns to turn noise into the shape                                                                  | Test (ring), gradient checks; e2e                         |
| Latent diffusion works on a compressed image and can be steered by text                                      | Cite `rombach2022`                                        |
| The original recipe used 1,000 steps; the toy uses 50                                                        | Cite `ho2020` (T = 1000); `STEPS` in code                 |
| Simple: restates Standard in plainer words, with no new claims                                               | Reviewed against the Standard text                        |
| In depth: the toy's β grows from 0.001 to 0.2 over 50 steps                                                  | Test (`BETAS`)                                            |
| In depth: x_t = √ᾱ_t x_0 + √(1 − ᾱ_t) ε in one go; loss is the squared error of the predicted noise          | Cite `ho2020` (eq. 4, eq. 14); `diffusion.ts`             |
| In depth: after 50 steps ᾱ ≈ 0.0045, under 7% of the point left                                              | Test                                                      |
| In depth: the sampling step x_{t−1} = (x_t − β_t/√(1 − ᾱ_t) ε̂)/√(1 − β_t) + σ_t z, no fresh noise at the end | Cite `ho2020` (Algorithm 2); `generate` in `diffusion.ts` |

## Ch 41. Choosing actions

| Claim                                                                                                                                                     | Backing                                                 |
| --------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------- |
| Reinforcement learning learns by trial and error from rewards                                                                                             | Cite `sutton2018`                                       |
| A Decision Transformer learns from recorded runs and predicts the next action from the return still to earn, past states and actions                      | Cite `chen2021decision` (abstract)                      |
| The game: 5 × 5, start A1, goal E5, pits B4, D3, B2; −1 a move, +20 the goal, −10 more for a pit; 16 moves                                                | Test (recorded world; `move`)                           |
| Best score 12: 8 moves, 20 − 8                                                                                                                            | Test                                                    |
| 4,000 runs: 1,365 random, 2,635 scripted with a 10–70% chance of a random move                                                                            | Test; `decisions.py`                                    |
| 2,272 fell into a pit, 368 ran out of moves, 1,360 reached the goal, 413 scored 12                                                                        | Test                                                    |
| Three tokens per step: still to earn, cell, move; the first run's tokens 12, A1, →                                                                        | `decisions.py` (token layout); test                     |
| Same masked attention as GPT-2                                                                                                                            | `decisions.py` and `decision.ts` (causal mask); Ch 9    |
| Aim 12: 8 moves to the goal; aim 8: 12 moves, scores 8; every target 4–12 exact                                                                           | Test (browser forward pass)                             |
| Aim −14: a pit on the fourth move, −14                                                                                                                    | Test                                                    |
| No run scored −11 to 3; −10 to −2 run out of moves (−16); −1 to 3 score 4                                                                                 | Test                                                    |
| Above 12 plays the same 8 moves as 12                                                                                                                     | Test                                                    |
| The browser runs the same network as the script                                                                                                           | Test (moves and first scores match the recorded checks) |
| Decision Transformers matched or beat model-free offline RL on Atari and Gym (simulated robots)                                                           | Cite `chen2021decision` (abstract)                      |
| Gato: one network, same weights, plays Atari, captions images, chats, stacks blocks with a real robot arm; outputs text, joint torques, or button presses | Cite `reed2022` (abstract)                              |
| Simple: restates Standard in plainer words, with no new claims                                                                                            | Reviewed against the Standard text                      |
| In depth: 24 numbers per token; return scaled by 1/20; tables for cells and moves; a step embedding on every token                                        | `decisions.py`; test (width)                            |
| In depth: 2 blocks of 2 heads; moves read at cell tokens; 48 tokens for 16 moves; 15,772 weights; 4,000 steps of 128 runs, cross-entropy on moves         | Test; `decisions.py`                                    |
| In depth: R̂_t = r_t + r_{t+1} + …, R̂_{t+1} = R̂_t − r_t; aiming 12 the tokens go 12 … 19, and the goal pays 19                                             | Cite `chen2021decision`; test                           |
| In depth: many RL methods estimate the reward a move leads to and pick the best                                                                           | Cite `sutton2018`                                       |

## Ch 42. Recap

The diagram restates earlier chapters; each box links to its chapter. The quiz has been its own
chapter (now Ch 45) since milestone 20.

- [x] Simple: restates the summary paragraph in plainer words, with no new claims.
- [x] In depth: GPT-2 in a few lines: h = W_E[x] + W_P[i] (Ch 5, 10); the block update (Ch 10's In
      depth); softmax(LN_f(h_n) W_Eᵀ / T) (Ch 10's logit lens, Ch 3's temperature); cross-entropy
      and the gradient step (Ch 7's In depth). Each formula restates its chapter.
- [x] In depth: each other kind of model changes one line: the mask (Ch 36), the MLP (Ch 37),
      attention itself (Ch 38), what a token stands for (Ch 39, 41), how the output is made (Ch 40).

## Ch 43. From message to reply

Each stage restates the chapters it links (`src/lib/chapters/end-to-end/data.ts`); the unit test checks that
every Part I–IX is linked from a stage and Part X from the closing box. Data comes from three
existing recordings, labeled in the widget:

- [x] The harness, cache, tool, and reply stages use the Ch 23 recording
      (`static/data/agent/chat.json`, Qwen2.5-1.5B-Instruct): call 1 is 400 tokens, call 2 is 493 and
      starts with the whole of call 1, so only 93 tokens need new work (Ch 26). The one tool call
      is `search_rhymes` with `{"query": "cat"}`; the run's policy is `none` (no guardrail asked),
      which the widget says, noting the search only reads (Ch 34).
- [x] In-model stages use GPT-2 small on "The cat sat on the" (`static/data/traces/gpt2/the-cat-sat.json`,
      `static/data/vectors/gpt2/the-cat-sat.json`): 5 tokens; temperature 0 picks " floor" at 7.6%; the
      logit lens reads " same" after block 1 and " floor" after blocks 8 and 12 (as Ch 10 says).
- [x] "GPT-2 adds a vector for the token's position": GPT-2 uses learned absolute position
      embeddings added to the token embeddings (Radford et al. 2019, as in Ch 10's stream "the
      vectors for ' the' and its position"). The text says GPT-2 specifically, since Qwen2.5 uses
      rotary position embeddings inside attention instead.
- [x] KV cache: 500 tokens took about 10 s with the cache and 43 s without
      (`static/data/caching/kv-cache.json`, as in Ch 26).
- [x] "The loop stops at an end-of-turn token": Ch 11 and Ch 15 (chat markers); the Qwen prompt
      ends each turn with `<|im_end|>`.
- [x] The closing box's one-line summaries match Ch 36–41 (both-ways attention; part of the network
      per token; fixed-size memory; picture patches as tokens; refined from noise; game moves as
      tokens).
- [x] Simple: restates the intro and the two-loops paragraphs, with no new claims.
- [x] In depth: call 1 wrote a 21-token tool call and call 2 a 59-token reply (Qwen tokenizer, record
      environment); the harness stops at `</tool_call>` (`stop_strings` in `record/agent.py`);
      with caching, 400 + 93 = 493 tokens of prompt work instead of 893 (test). About 80 runs:
      21 + 59 + the end-of-turn token.

## Ch 44. Is a model the right tool?

The four questions restate earlier chapters; each recorded example is quoted from an existing
dataset, and `facts.test.ts` checks the widget's text (`src/lib/chapters/when-to-use/data.ts`)
against it.

| Claim                                                                                                                                                                                                     | Backing                                        |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------- |
| 453 college-educated professionals, occupation-specific writing tasks, half randomly given ChatGPT; 40% less time, quality 18% higher                                                                     | Cite `noy2023` (abstract)                      |
| 758 BCG consultants, preregistered; on 18 tasks inside the frontier 12.2% more tasks, 25.1% faster, better quality; on one task outside it 19% less likely to be correct; "jagged technological frontier" | Cite `dellacqua2023` (abstract)                |
| A model writes likely tokens from its prompt and its weights                                                                                                                                              | Ch 11, 16, 23                                  |
| Exact answers may not be the likely ones                                                                                                                                                                  | Ch 16                                          |
| Without a calculator, Qwen2.5-1.5B-Instruct got 7,050,952 for 1234 × 5678; the answer is 7,006,652                                                                                                        | Test (`agent/math-no-tools`), Ch 28            |
| Nothing after its cutoff, little about rare topics                                                                                                                                                        | Ch 16; Ch 32 (`kandpal2023`)                   |
| The made-up novel: nine different authors in ten tries                                                                                                                                                    | Test (`hallucination/samples`), Ch 32          |
| Dropped chat couldn't name the child; retrieved, it said Lily                                                                                                                                             | Test (`agent/context`), Ch 24                  |
| Eddy Merckx ten times out of ten for 1987; it was Stephen Roche                                                                                                                                           | Test (`hallucination/samples`), Ch 32          |
| The small model was 79% sure Sydney is Australia's capital                                                                                                                                                | Test (`routing/cascade`), Ch 27                |
| Answers can change from call to call                                                                                                                                                                      | Ch 3                                           |
| The short call read a 400-token prompt; 10,000 calls is four million tokens                                                                                                                               | Test (`agent/chat`), Ch 43                     |
| Keep a person in the loop where mistakes are costly; test before relying on it                                                                                                                            | Ch 34, 35                                      |
| The widget's preset tasks and verdicts                                                                                                                                                                    | Illustrative; test checks each verdict         |
| Simple: restates Standard in plainer words, with no new claims                                                                                                                                            | Reviewed against the Standard text             |
| In depth: a + c + p f < T                                                                                                                                                                                 | Illustrative; each term is defined in the text |
| In depth: the consistency check trusts 8 of 10; flags 4 of 5 wrong, 0 of 6 right; misses Roche                                                                                                            | Test (`summarize`, `consistencyCheck`), Ch 32  |
| In depth: weaker writers gained most; inequality between workers decreased                                                                                                                                | Cite `noy2023` (abstract and editor's summary) |

## Ch 45. Picking a model

The decoder's names (`src/lib/chapters/picking-a-model/data.ts`) are from Google's Gemma 4, Gemma 4 QAT Mobile,
and Gemma 4 QAT Q4_0 collections, two of DeepSeek's R1-Distill models, and the models this site
uses, as listed on 2026-10-23. Lineups
and suffixes change often, so re-check the list in the final fact review. The unit test checks that
every name splits into known parts that spell it back.

| Claim                                                                                                                            | Backing                                                                  |
| -------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| E2B: 2.3B effective, 5.1B with per-layer embeddings; E4B: 4.5B and 8B; per-layer tables are only looked up                       | Cite `gemma4-model-card` (Dense Models table and the note on "E")        |
| 26B A4B: 25.2B total, 3.8B active, 8 of 128 experts plus 1 shared; runs almost as fast as a 4B model                             | Cite `gemma4-model-card` (MoE table and the note on "A")                 |
| 12B: 11.95B; 31B: 30.7B                                                                                                          | Cite `gemma4-model-card`; test (31B: 61 GB at 16 bits, 15 GB at 4)       |
| Context: 128K tokens (E2B, E4B), 256K (12B, 26B A4B, 31B); audio only on E2B, E4B, 12B; thinking mode; Apache 2.0                | Cite `gemma4-model-card`                                                 |
| Four QAT versions: unquantized 16-bit, GGUF Q4_0, mobile (wNa8o8, with 2-bit layers), compressed tensors w4a16 for vLLM          | Cite `gemma4-qat`                                                        |
| GGUF's Q4_0: 4-bit, blocks of 32 with one scale                                                                                  | Cite `gguf-quant-types`                                                  |
| `-assistant` models are speculative-decoding drafters                                                                            | Cite `gemma4-assistant` (Ch 14)                                          |
| DiffusionGemma is based on 26B A4B and denoises a 256-token canvas                                                               | Cite `diffusiongemma-model-card`                                         |
| Hugging Face shows 5B for `gemma-4-E2B` (stored tensors)                                                                         | Collection listing, 2026-10-23                                           |
| E models are built for phones and laptops                                                                                        | Cite `gemma4-model-card` ("Optimized for On-Device")                     |
| Qwen2.5 is from Alibaba's Qwen team; GPT-2's sizes are small, medium, large, and XL                                              | `qwen2024`; `radford2019` and the Hugging Face model names               |
| `DeepSeek-R1-Distill-Qwen-1.5B` is a 1.5B Qwen model tuned on examples made with DeepSeek-R1                                     | Cite `deepseek2025` §2.4 (base: Qwen2.5-Math-1.5B); test (name parts)    |
| A hosted model sees every prompt and charges per token; a model you run yourself keeps prompts on your machine                   | Follows from where the model runs; prices per token as in Ch 4 and Ch 11 |
| Tokenizers split text differently, so compare prices on your own text                                                            | Ch 4 (`anthropic-pricing`)                                               |
| Reply tokens cost more than prompt tokens; a cached start costs a tenth or less; a cascade sends most questions to a cheap model | Ch 11, Ch 26, Ch 27                                                      |
| At about 1.3 tokens a word (the rhymes in Ch 4), 128K tokens is about 100,000 words; the ratio depends on tokenizer and text     | Test (128,000 ÷ 1.3 ≈ 98,000); Ch 4 test; labeled as approximate         |
| Keep your own eval and rerun it when a new model comes out                                                                       | Ch 35 (evals)                                                            |
| Simple: restates Standard in plainer words, with no new claims                                                                   | Reviewed against the Standard text                                       |
| In depth: Qwen2.5-1.5B-Instruct has 1.54B weights: about 3.1 GB at 16 bits, 0.8 GB at 4                                          | Cite `qwen25-model-card`; test (`weightBytes`)                           |
| In depth: KV cache 14,336 numbers per token at 2 bytes: 0.11 GB at 4,000 tokens, 0.94 GB at 32,768                               | Ch 26 In depth (`qwen2024`, config); test                                |
| In depth: at full context the cache outweighs the 4-bit weights                                                                  | Test                                                                     |

## Ch 46. Check yourself

Sixteen questions in reading order; Simple rewords three of them and In depth adds four more (`src/lib/chapters/quiz/data.ts`); the unit test checks every Part I–IX
has at least one. Each answer restates its linked chapter:

- [x] Temperature spreads probabilities so unlikely tokens are picked more often (Ch 2).
- [x] Training nudges every weight to make the right next token more likely (Ch 7).
- [x] 4-bit weights take about a quarter of the memory of 16-bit ones, and coarse rounding can hurt
      (Ch 13; added in milestone 21).
- [x] Speculative decoding writes exactly the big model's text in fewer passes (Ch 14; added in
      milestone 21).
- [x] The other ten are unchanged from the recap's quiz (Ch 4, 16, 9, 11, 17, 19, 26, 28, 33, 34,
      31). The e2e test answers all sixteen and checks the revisit list.
- [x] A Decision Transformer asked for more than any training run scored plays like the best runs
      it has seen (Ch 41; added with the chapter).
- [x] Rewording an email you'll read suits a model on its own; the other options need one exact
      answer (Ch 44; added with the chapter).
- [x] Simple rewordings (training on lots of text with small nudges; examples shape only this
      prompt; the provider reuses work on the prompt's start) restate Ch 7, 19, and 25 with no new
      claims.
- [x] In depth only: cross-entropy averages −ln p over the real next tokens (Ch 7's In depth);
      min(1, p/q) and a redraw from max(0, p − q) keep the big model's probabilities (Ch 14's In
      depth); without a KV cache the work grows with the square of n (Ch 26's In depth); Mixtral
      shares attention and embeddings, so a token uses more than a quarter (Ch 37's In depth).
