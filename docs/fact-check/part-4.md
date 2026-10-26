# Fact-check: Part IV (Ch 8–10)

Claim checklist for the per-chapter fact-check (see [the spec](../spec/sources.md)). Tests:
`src/lib/math/attention.test.ts` (toy attention plus facts read from the recorded GPT-2 attention),
`src/lib/math/transformer.test.ts`, each chapter's `facts.test.ts`, `tests/unit/datasets.test.ts`
(attention rows sum to 1 and never look ahead), each chapter's `chapter.e2e.ts`.

Attention and logit-lens data come from `scripts/record/traces.py` (PyTorch, eager attention, pinned
GPT-2 revision): `static/data/traces/gpt2/attn-*.json` and `logitLens` in
`static/data/vectors/gpt2/the-cat-sat.json`.

## Ch 8. The context problem

| Claim                                                                                                                                                                    | Backing                                                                                          |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------ |
| The trophy/suitcase sentence is a Winograd schema; the challenge tests this kind of reasoning                                                                            | Cite `levesque2012` (the paper's first example: "The trophy doesn't fit in the brown suitcase…") |
| The Ch 1 model sees one word; the Ch 7 model sees 3 characters                                                                                                           | Implementations (`bigram.ts`, `mlp.ts`)                                                          |
| About 2.5 billion possible token pairs and 127 trillion triples for GPT-2's vocabulary                                                                                   | Test (50,257² and 50,257³)                                                                       |
| Most long n-grams never appear in training text                                                                                                                          | Cite `jurafsky-martin-ngrams` (sparsity)                                                         |
| Neural models share what they learn across similar words                                                                                                                 | Cite `bengio2003`                                                                                |
| GPT-2 can look at up to 1,024 tokens                                                                                                                                     | Cite `radford2019`; `canonical.json`, checked against the model config                           |
| Llama 3 (2024) can look at up to 128K tokens, more than 100 times GPT-2's                                                                                                | Cite `grattafiori2024` (abstract: "context window of up to 128K tokens"); 128,000 / 1,024 = 125  |
| Simple: restates Standard in plainer words, with no new claims                                                                                                           | Reviewed against the Standard text                                                               |
| In depth: a window model feeds the last n vectors side by side, each slot with its own columns of W                                                                      | Cite `bengio2003`                                                                                |
| In depth: the tiny model has 3 × 8 = 24 inputs to 64 neurons; each extra character adds 512 weights                                                                      | Test (`CharModel`, trainer config)                                                               |
| In depth: attention's work grows with the square of the window; 128,000² / 1,024² = 15,625                                                                               | Arithmetic, test; the score grid from Ch 9                                                       |
| In depth: Claude Haiku 5.5 charges 5× per token (input and output) for prompts over 100,000 tokens; Anthropic's other recent models charge one rate across the 1M window | Cite `anthropic-pricing` (model pricing; long context pricing)                                   |

## Ch 9. Attention

| Claim                                                                                                                                      | Backing                                                                                |
| ------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------- |
| The transformer (2017) is built around attention; GPT-2 uses it                                                                            | Cite `vaswani2017`, `radford2019`                                                      |
| Query·key scores, divided by a fixed number (√d), softmaxed, then used to blend values                                                     | Cite `vaswani2017` (scaled dot-product attention); test (`attend`)                     |
| Tokens can't look ahead                                                                                                                    | Test (masked scores); every recorded row checked by `parseTrace`                       |
| Without position information, one attention step blends "the dog chased the cat." and its swap the same way at "."                         | Test (`attention/facts.test.ts`, identical outputs)                                    |
| GPT-2 adds a learned position vector for each place: 1,024 of them, one per place in its context window                                    | GPT-2's `wpe` table (1,024 × 768, `n_positions` in the config); test (parameter count) |
| Llama 3 turns queries and keys by an angle that grows with position, so scores depend on distance (rotary position embedding)              | Cite `su2024` (abstract), `grattafiori2024` (RoPE)                                     |
| The toy example's "it" looks mostly at "trophy"                                                                                            | Test (made-up numbers, labelled as such)                                               |
| GPT-2 predicts " Mary" after "When Mary and John went to the store, John gave a drink to"                                                  | Test (recorded trace)                                                                  |
| Head 9.9 looks from the last word at "Mary" far more than at either "John"                                                                 | Test (also 9.6; > 30% on Mary)                                                         |
| Wang et al. found heads including 9.6 and 9.9 that find and copy the right name                                                            | Cite `wang2022` (name mover heads 9.6, 9.9, 10.0)                                      |
| Head 9.0 looks from "its" to "lamb"; from "it" mostly to "suitcase" in both trophy sentences                                               | Test (> 85%; > 50%, trophy < 10%)                                                      |
| Attention from "it" is identical in the big/small versions                                                                                 | Test (exact equality across all 144 heads); follows from causal masking                |
| The largest GPT-2 got 70.70% on the Winograd Schema Challenge; guessing gets 50%                                                           | Cite `radford2019` §3.4 (273 examples; binary choice)                                  |
| 12 heads per layer, 12 layers, 144 heads; numbered from 0                                                                                  | `canonical.json`, checked against the model config                                     |
| Heads often put most attention on the first word: more than half the time from the 4th word on                                             | Test (61–72% across the recorded sentences)                                            |
| Researchers think the first token acts as a resting spot ("attention sink")                                                                | Cite `xiao2024`                                                                        |
| Simple: restates Standard in plainer words, with no new claims                                                                             | Reviewed against the Standard text                                                     |
| In depth: softmax(QKᵀ/√d_k + M)V, with −∞ in the mask for later tokens; each row sums to 1                                                 | Cite `vaswani2017` (eq. 1, §3.2.3); test (`attend`)                                    |
| In depth: the heads' outputs are put side by side and multiplied by W_O                                                                    | Cite `vaswani2017` (§3.2.2)                                                            |
| In depth: GPT-2's d_k = 768 / 12 = 64, so scores are divided by 8; 144 heads                                                               | `canonical.json`; test                                                                 |
| In depth: GPT-2 normalizes the token vectors before attention                                                                              | Cite `radford2019` (§2.3)                                                              |
| In depth: n(n+1)/2 scores per head; 524,800 for 1,024 tokens                                                                               | Test (toy `attend`, arithmetic)                                                        |
| In depth: x_i = e_{t_i} + p_i, from the 50,257 × 768 and 1,024 × 768 tables                                                                | GPT-2's config; test (parameter count)                                                 |
| In depth: rotary angle mθ_j with θ_j = b^(−2j/d); scores depend only on m − n                                                              | Cite `su2024` (§3.4); test (rotation identity)                                         |
| In depth: RoFormer used b = 10,000; Llama 3 raised it to 500,000                                                                           | Cite `su2024`, `grattafiori2024` (§3.2)                                                |
| One head step by step: raw scores for every pair, the mask hides 91 of 196, softmax per row; recorded raw scores give back GPT-2's weights | `scripts/record/attention.py` (checks to 1e-4); test (`math/attention.test.ts`)        |
| Head 9.9, last word: Mary 4.25, John 3.23, When 4.24; weights 36%, 13%, 36%                                                                | Test                                                                                   |
| In depth: weights differing by Δ in score are in the ratio e^Δ; e^1.02 ≈ 2.8                                                               | Arithmetic; test                                                                       |

## Ch 10. The transformer block

| Claim                                                                                       | Backing                                                                    |
| ------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| A transformer stacks blocks of attention and an MLP                                         | Cite `vaswani2017`                                                         |
| Residual connections add each step's change to the stream; they ease deep training          | Cite `he2016`                                                              |
| Layer norm rescales the numbers; GPT-2 applies it before each step and once at the end      | Cite `ba2016`, `radford2019` §2.3                                          |
| The block builder's parameter counter totals 124,439,808                                    | Test (`parameterBreakdown` equals `canonical.parameters`)                  |
| About a third of weights are in the token/position tables; almost half in the MLPs          | Test (31.6%; 45.5%)                                                        |
| The MLP is two thirds of every block; attention is under a quarter of the total             | Test (66.6%; 22.8%)                                                        |
| The output step reuses the token table (weight tying)                                       | GPT-2 `lm_head` is tied to `wte`; counter matches the official total       |
| The logit lens reads the stream partway through                                             | Cite `nostalgebraist2020`; `record/traces.py` applies the final layer norm |
| Blocks 1–7 guess " same"; from block 8 " floor" is top-2, " ground" leads once              | Test                                                                       |
| Furniture appears (" table", " sofa", " bed"); the end is " floor", " bed", " couch"        | Test; last stage equals the recorded prediction (Ch 0)                     |
| The last block spreads the bets out                                                         | Test (final top probability lower than after block 11)                     |
| Simple: restates Standard in plainer words, with no new claims                              | Reviewed against the Standard text                                         |
| In depth: x' = x + Attn(LN(x)), x'' = x' + MLP(LN(x'))                                      | Cite `radford2019` (§2.3, pre-norm)                                        |
| In depth: LN(x) = γ ⊙ (x − μ)/√(σ² + ε) + β; ε is 0.00001 in GPT-2                          | Cite `ba2016`, `gpt2-config` (`layer_norm_epsilon`)                        |
| In depth: the original transformer applied the norm after each addition                     | Cite `vaswani2017` (§3.1, LayerNorm(x + Sublayer(x)))                      |
| In depth: 2,362,368 + 4,722,432 + 3,072 = 7,087,872 per block; the parts sum to 124,439,808 | Test (`parameterBreakdown`)                                                |
| In depth: the logit lens is softmax(LN_f(x) W_Eᵀ)                                           | Cite `nostalgebraist2020`; `record/traces.py`                              |
