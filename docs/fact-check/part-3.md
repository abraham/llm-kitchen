# Fact-check: Part III (Ch 6–7)

Claim checklist for the per-chapter fact-check (see PLAN.md §7). Tests: `src/lib/math/mlp.test.ts`
(including numerical gradient checks of every hand-written backward pass),
`tests/unit/canonical.test.ts`, `tests/e2e/part-3.e2e.ts`.

## Ch 6. A neuron

| Claim                                                                                   | Backing                                                                                                |
| --------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| A neuron multiplies inputs by weights, adds a bias, and applies an activation function  | Test (`neuron`), e2e (0.5 and −1.8 examples)                                                           |
| ReLU turns negative totals into 0 and leaves positive ones alone                        | Test (`activate`)                                                                                      |
| Without an activation, stacked neurons only produce straight lines                      | Composition of linear functions is linear (math fact)                                                  |
| A layer of three neurons plus an output neuron fences off a triangle; one gives an edge | Test (`triangleNet`), e2e (0.4, 1 and 0 examples)                                                      |
| McCulloch and Pitts described a mathematical neuron in 1943                             | Cite `mcculloch1943`                                                                                   |
| Rosenblatt's 1958 perceptron added weights adjusted from examples                       | Cite `rosenblatt1958`                                                                                  |
| GPT-2 small has 3,072 neurons per block in 12 blocks, each reading 768 numbers          | Cite `gpt2-config`; `canonical.json` (`mlpSize`), checked by `build-traces.py` (`n_inner or 4·n_embd`) |
| GPT-2 uses GELU, a smooth cousin of ReLU                                                | Cite `hendrycks2016`; GPT-2 config `activation_function: gelu_new`                                     |
| GPT-2 small has about 124 million numbers (weights)                                     | `canonical.json` parameter count, checked against the model                                            |

## Ch 7. Learning from mistakes

| Claim                                                                                       | Backing                                             |
| ------------------------------------------------------------------------------------------- | --------------------------------------------------- |
| Training lowers the loss (curve fit)                                                        | Test (`CurveTrainer` loss falls 10×)                |
| For a language model, loss is how surprised it was by the real next token                   | Cross-entropy implementation; test                  |
| Large steps overshoot; small steps can settle in a dip that isn't lowest                    | Shown by the widget on its bumpy loss               |
| Backpropagation finds the direction for every weight at once                                | Cite `rumelhart1986`; gradient checks in tests      |
| The networks use Adam for step sizes                                                        | Cite `kingma2015`; implementation in `mlp.ts`       |
| The tiny model reads 3 characters and predicts the next, a scaled-down Bengio et al. design | Cite `bengio2003`; implementation                   |
| It has fewer than 50,000 weights (3,790)                                                    | Test; shown live                                    |
| Its loss starts at the "random guessing" line (log of the number of characters)             | Test (start ≈ ln V)                                 |
| Its writing goes from random letters to real words and phrase fragments                     | Checked by simulating 6,000 steps for several seeds |
| GPT-2 was trained on about 40 GB of text from 8 million web pages                           | Cite `radford2019` (§2.1, WebText)                  |

## Notes

- The Rosenblatt DOI link returns 403 to automated checkers (publisher bot protection) but works in
  a browser; the link checker should allow 403 for doi.org/psycnet links.
