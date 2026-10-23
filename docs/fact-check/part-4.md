# Fact-check: Part IV (Ch 8–10)

Claim checklist for the per-chapter fact-check (see PLAN.md §7). Tests:
`src/lib/math/attention.test.ts` (toy attention plus facts read from the recorded GPT-2 attention),
`src/lib/math/transformer.test.ts`, `tests/unit/part-4-facts.test.ts`, `tests/unit/traces.test.ts`
(attention rows sum to 1 and never look ahead), `tests/e2e/part-4.e2e.ts`.

Attention and logit-lens data come from `scripts/build-traces.py` (PyTorch, eager attention, pinned
GPT-2 revision): `static/traces/gpt2/attn-*.json` and `logitLens` in
`static/vectors/gpt2/the-cat-sat.json`.

## Ch 8. The context problem

| Claim                                                                                         | Backing                                                                                          |
| --------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| The trophy/suitcase sentence is a Winograd schema; the challenge tests this kind of reasoning | Cite `levesque2012` (the paper's first example: "The trophy doesn't fit in the brown suitcase…") |
| The Ch 2 model sees one word; the Ch 7 model sees 3 characters                                | Implementations (`bigram.ts`, `mlp.ts`)                                                          |
| About 2.5 billion possible token pairs and 127 trillion triples for GPT-2's vocabulary        | Test (50,257² and 50,257³)                                                                       |
| Most long n-grams never appear in training text                                               | Cite `jurafsky-martin-ngrams` (sparsity)                                                         |
| Neural models share what they learn across similar words                                      | Cite `bengio2003`                                                                                |
| GPT-2 can look at up to 1,024 tokens                                                          | Cite `radford2019`; `canonical.json`, checked against the model config                           |
| Llama 3 (2024) can look at up to 128K tokens, more than 100 times GPT-2's                     | Cite `grattafiori2024` (abstract: "context window of up to 128K tokens"); 128,000 / 1,024 = 125  |

## Ch 9. Attention

| Claim                                                                                          | Backing                                                                 |
| ---------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| The transformer (2017) is built around attention; GPT-2 uses it                                | Cite `vaswani2017`, `radford2019`                                       |
| Query·key scores, divided by a fixed number (√d), softmaxed, then used to blend values         | Cite `vaswani2017` (scaled dot-product attention); test (`attend`)      |
| Tokens can't look ahead                                                                        | Test (masked scores); every recorded row checked by `parseTrace`        |
| The toy example's "it" looks mostly at "trophy"                                                | Test (made-up numbers, labelled as such)                                |
| GPT-2 predicts " Mary" after "When Mary and John went to the store, John gave a drink to"      | Test (recorded trace)                                                   |
| Head 9.9 looks from the last word at "Mary" far more than at either "John"                     | Test (also 9.6; > 30% on Mary)                                          |
| Wang et al. found heads including 9.6 and 9.9 that find and copy the right name                | Cite `wang2022` (name mover heads 9.6, 9.9, 10.0)                       |
| Head 9.0 looks from "its" to "lamb"; from "it" mostly to "suitcase" in both trophy sentences   | Test (> 85%; > 50%, trophy < 10%)                                       |
| Attention from "it" is identical in the big/small versions                                     | Test (exact equality across all 144 heads); follows from causal masking |
| The largest GPT-2 got 70.70% on the Winograd Schema Challenge; guessing gets 50%               | Cite `radford2019` §3.4 (273 examples; binary choice)                   |
| 12 heads per layer, 12 layers, 144 heads; numbered from 0                                      | `canonical.json`, checked against the model config                      |
| Heads often put most attention on the first word: more than half the time from the 4th word on | Test (61–72% across the recorded sentences)                             |
| Researchers think the first token acts as a resting spot ("attention sink")                    | Cite `xiao2024`                                                         |

## Ch 10. The transformer block

| Claim                                                                                  | Backing                                                                   |
| -------------------------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| A transformer stacks blocks of attention and an MLP                                    | Cite `vaswani2017`                                                        |
| Residual connections add each step's change to the stream; they ease deep training     | Cite `he2016`                                                             |
| Layer norm rescales the numbers; GPT-2 applies it before each step and once at the end | Cite `ba2016`, `radford2019` §2.3                                         |
| The block builder's parameter counter totals 124,439,808                               | Test (`parameterBreakdown` equals `canonical.parameters`)                 |
| About a third of weights are in the token/position tables; almost half in the MLPs     | Test (31.6%; 45.5%)                                                       |
| The MLP is two thirds of every block; attention is under a quarter of the total        | Test (66.6%; 22.8%)                                                       |
| The output step reuses the token table (weight tying)                                  | GPT-2 `lm_head` is tied to `wte`; counter matches the official total      |
| The logit lens reads the stream partway through                                        | Cite `nostalgebraist2020`; `build-traces.py` applies the final layer norm |
| Blocks 1–7 guess " same"; from block 8 " floor" is top-2, " ground" leads once         | Test                                                                      |
| Furniture appears (" table", " sofa", " bed"); the end is " floor", " bed", " couch"   | Test; last stage equals the recorded prediction (Ch 0)                    |
| The last block spreads the bets out                                                    | Test (final top probability lower than after block 11)                    |

## Changes from the plan

- **Recorded attention instead of live.** The standard GPT-2 ONNX export used by Transformers.js
  doesn't output attention weights, so Ch 9 shows attention recorded from PyTorch for 5 sentences
  (all 12 layers × 12 heads). A custom ONNX export with attention outputs is listed under future
  improvements.
- **Trophy sentence.** GPT-2 small's attention from "it" is the same for "big" and "small" (the
  clue comes later), and the model doesn't clearly resolve the pronoun. The chapter says so, rather
  than presenting a cherry-picked head as an answer.
- **Residual stream view.** Uses the logit lens (top guesses per block) instead of the size of each
  block's change. The change sizes are dominated by a few very large numbers in GPT-2's stream, and
  the final row includes the final layer norm, so they would mislead. The vector strips use a
  95th-percentile color scale for the same reason.
