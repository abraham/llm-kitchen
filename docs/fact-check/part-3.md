# Fact-check: Part III (Ch 6–7)

Claim checklist for the per-chapter fact-check (see [the spec](../spec/sources.md)). Tests: `src/lib/math/mlp.test.ts`
(including numerical gradient checks of every hand-written backward pass),
`tests/unit/canonical.test.ts`, each chapter's `chapter.e2e.ts`.

## Ch 6. A neuron

| Claim                                                                                                      | Backing                                                                                                 |
| ---------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| GPT-2's path: 768-number token vectors, 12 blocks of attention then 3,072 neurons, then next-token chances | Cite `gpt2-config`; `canonical.json`                                                                    |
| A neuron multiplies inputs by weights, adds a bias, and applies an activation function                     | Test (`neuron`), e2e (0.5 and −1.8 examples)                                                            |
| ReLU turns negative totals into 0 and leaves positive ones alone                                           | Test (`activate`)                                                                                       |
| Without an activation, stacked neurons only produce straight lines                                         | Composition of linear functions is linear (math fact)                                                   |
| A layer of three neurons plus an output neuron fences off a triangle; one gives an edge                    | Test (`triangleNet`), e2e (0.4, 1 and 0 examples)                                                       |
| McCulloch and Pitts described a mathematical neuron in 1943                                                | Cite `mcculloch1943`                                                                                    |
| Rosenblatt's 1958 perceptron added weights adjusted from examples                                          | Cite `rosenblatt1958`                                                                                   |
| GPT-2 small has 3,072 neurons per block in 12 blocks, each reading 768 numbers                             | Cite `gpt2-config`; `canonical.json` (`mlpSize`), checked by `record/traces.py` (`n_inner or 4·n_embd`) |
| GPT-2 uses GELU, a smooth cousin of ReLU                                                                   | Cite `hendrycks2016`; GPT-2 config `activation_function: gelu_new`                                      |
| GPT-2 small has about 124 million numbers (weights)                                                        | `canonical.json` parameter count, checked against the model                                             |
| Simple: restates Standard in plainer words, with no new claims                                             | Reviewed against the Standard text                                                                      |
| In depth: y = f(Σ w_i x_i + b); ReLU(z) = max(0, z); a layer is f(Wx + b)                                  | Test (`a-neuron/facts.test.ts`, `neuron`, `layer`)                                                      |
| In depth: without f, two layers collapse into one with weights W₂W₁ and bias W₂b₁ + b₂                     | Test (matrix identity)                                                                                  |
| In depth: GPT-2's MLP is W₂ GELU(W₁x + b₁) + b₂ with 3,072 × 768 and 768 × 3,072 matrices                  | Cite `gpt2-config`; `canonical.json`                                                                    |
| In depth: 4,722,432 weights per block, 56,669,184 in all, about 46% of the model                           | Test (`parameterBreakdown`)                                                                             |
| In depth: GELU(z) = z Φ(z); GPT-2's tanh approximation is within 0.001 everywhere                          | Cite `hendrycks2016`; test (against erf)                                                                |

## Ch 7. Learning from mistakes

| Claim                                                                                                                                                                            | Backing                                                                               |
| -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| Counting fills in a table from the text; a network's weights each take part in many predictions                                                                                  | `bigram.ts`; `mlp.ts` (shared weights)                                                |
| Machine learning: a program's numbers come from examples instead of hand-written rules; deep learning: many stacked layers; an LLM is a deep network trained on text             | Definitions used across the field; GPT-2's 12 blocks from `canonical.json`            |
| In 1959 Arthur Samuel described a checkers program that improved by playing, in "Some Studies in Machine Learning Using the Game of Checkers"                                    | Cite `samuel1959` (title; the program learned from its own games and from book games) |
| "Artificial intelligence" was named in the 1955 proposal for a Dartmouth summer workshop; the field also covers rule-following programs                                          | Cite `mccarthy1955` (AAAI reprint, verified title, date, authors)                     |
| The curve fitter's 16 neurons use tanh, one of the neuron widget's choices                                                                                                       | `CurveNet` in `mlp.ts`; `NeuronPlayground` options                                    |
| The tiny model: 8 numbers per character, 3 characters into 64 neurons, a chance per character; all start random                                                                  | `trainer.worker.ts` config; test (`learning-from-mistakes/facts.test.ts`)             |
| Token vectors are weights, learned the same way                                                                                                                                  | `CharModel` trains `E` with the rest; GPT-2's `wte` is a trained parameter            |
| Later chapters keep the recipe (attention, scale, tuning); the loss rewards likely text, not true text                                                                           | The linked chapters; Quirks and limits' In depth (`ji2023`)                           |
| Training lowers the loss (curve fit)                                                                                                                                             | Test (`CurveTrainer` loss falls 10×)                                                  |
| The curve fitter has 16 neurons and 49 numbers, and one step nudges every one of them                                                                                            | `CurveNet` (16 × 3 + 1); e2e (49 arrows, max 0.020)                                   |
| For a language model, loss is how surprised it was by the real next token                                                                                                        | Cross-entropy implementation; test                                                    |
| Large steps overshoot; small steps can settle in a dip that isn't lowest                                                                                                         | Shown by the widget on its bumpy loss                                                 |
| Backpropagation finds the direction for every weight at once                                                                                                                     | Cite `rumelhart1986`; gradient checks in tests                                        |
| The networks use Adam for step sizes                                                                                                                                             | Cite `kingma2015`; implementation in `mlp.ts`                                         |
| The tiny model reads 3 characters and predicts the next, a scaled-down Bengio et al. design                                                                                      | Cite `bengio2003`; implementation                                                     |
| It has fewer than 50,000 weights (3,790)                                                                                                                                         | Test; shown live                                                                      |
| Its loss starts at the "random guessing" line (log of the number of characters)                                                                                                  | Test (start ≈ ln V)                                                                   |
| Its writing goes from random letters to real words and phrase fragments                                                                                                          | Checked by simulating 6,000 steps for several seeds                                   |
| GPT-2 was trained on about 40 GB of text from 8 million web pages                                                                                                                | Cite `radford2019` (§2.1, WebText)                                                    |
| Simple: restates Standard in plainer words, with no new claims                                                                                                                   | Reviewed against the Standard text                                                    |
| In depth: mean squared error for the curve; cross-entropy (average −ln p of the real next token) for a language model                                                            | Implementations in `mlp.ts`; test                                                     |
| In depth: guessing evenly among V gives ln V; perplexity is e^L, the number of even choices                                                                                      | Cite `jurafsky-martin-ngrams` (perplexity); test                                      |
| In depth: w ← w − η ∂L/∂w; a neuron's slope is the slope from above × f'(z) × x_i                                                                                                | Cite `rumelhart1986`; test (numerical check)                                          |
| In depth: Adam divides a running average of the slope by the root of a running average of its square; 0.9 and 0.999                                                              | Cite `kingma2015`; test (`Adam` defaults, used by both networks)                      |
| In depth: overfitting is fitting the training set so closely (memorizing) that new data does worse; training loss falls while held-out loss rises                                | Cite `google-mlcc-overfitting` (definition; "Detecting overfitting")                  |
| In depth: training data may soon be limited by the text available; models up to 9B weights; up to 4 repeats about as good as new text; then more training's value decays to zero | Cite `muennighoff2023` (abstract)                                                     |
| In depth: GPT-2 was trained with dropout, each number zeroed with a chance of 0.1                                                                                                | Cite `gpt2-config` (`attn_pdrop`, `embd_pdrop`, `resid_pdrop`)                        |
| In depth: dropout keeps a network from relying on any one neuron, so it memorizes less and does better on unseen text; it's off when the model is used                           | Cite `srivastava2014`                                                                 |

## Notes

- The Rosenblatt DOI link returns 403 to automated checkers (publisher bot protection) but works in
  a browser; the link checker should allow 403 for doi.org/psycnet links.
