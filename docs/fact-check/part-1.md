# Fact-check: Part I (Ch 0–2)

Claim checklist for the per-chapter fact-check (see PLAN.md §7). Each claim is cited, checked by a
test, or labeled in the text as a simplification. Tests: `tests/unit/part-1-facts.test.ts`,
`src/lib/math/*.test.ts`, `tests/unit/traces.test.ts`, `tests/unit/canonical.test.ts`.

## Ch 0. The guessing game

| Claim                                                                                 | Backing                                          |
| ------------------------------------------------------------------------------------- | ------------------------------------------------ |
| Shannon (1951) had people guess the next letter and used it to measure predictability | Cite `shannon1951`                               |
| GPT-2 small was released by OpenAI in 2019                                            | Cite `radford2019`, `gpt2-model-card`            |
| GPT-2's top guesses after "The cat sat on the" are floor, bed, couch                  | Test (recorded trace)                            |
| No single option gets even one chance in ten                                          | Test (top probability < 0.1)                     |
| The model chooses from 50,257 possible pieces of text                                 | `models/canonical.json`, checked by build-traces |
| Generation repeats: predict, pick, append                                             | Recorded trace replay (greedy)                   |

## Ch 1. Predicting by counting

| Claim                                                                                    | Backing                                                  |
| ---------------------------------------------------------------------------------------- | -------------------------------------------------------- |
| A bigram model looks at two words, current and next                                      | Cite `jurafsky-martin-ngrams`                            |
| After "little": lamb, dog, star once each (1 in 3)                                       | Test (`bigramCounts`)                                    |
| Shannon generated English word by word from the previous word in 1948                    | Cite `shannon1948` (§3, second-order word approximation) |
| "the cow jumped over the clock struck one, the lamb was sure to go" only uses seen pairs | Test                                                     |
| "the" is followed by words from the cow, mouse, and lamb rhymes                          | Test                                                     |
| Words with no followers only ever ended a rhyme                                          | Follows from counting; test of dead-end stop             |
| Rhymes are traditional/public domain; wording varies                                     | Noted in `src/lib/data/rhymes.ts`                        |

## Ch 2. Probability and sampling

| Claim                                                                                                     | Backing                                                                                         |
| --------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| Always picking the top word tends to give dull, repetitive text                                           | Cite `holtzman2020`                                                                             |
| Temperature divides raw scores before softmax; <1 sharpens, >1 flattens; 0 is greedy                      | Test (`applyTemperature`, `softmax`)                                                            |
| "Divide by the temperature": log probabilities stand in for raw scores; top is e^(gap/T) times the second | Test (same chances as the temperature widget; adding a constant to every score changes nothing) |
| Top-k keeps only the k most likely                                                                        | Cite `fan2018`, test (`topK`)                                                                   |
| Widget uses only the top 10, rescaled                                                                     | Labeled "Simplified:" in the text                                                               |
| Real model has 50,257 options                                                                             | Test (`canonical.json`)                                                                         |
| Recorded runs: 16 tokens at T = 0, 0.7, 1.5; T = 0 matches greedy                                         | Test (traces)                                                                                   |

## Changes from the plan

- Ch 0's "guesses from other people" word cloud was dropped: there is no real survey data, and
  made-up crowd data would be presented as fact. The widget compares the visitor's guess with
  GPT-2's recorded top 50 instead.
- Live (T2) options for Ch 0 and Ch 2 come with the in-browser model in later milestones; Ch 2's
  temperature comparison uses recorded runs for now.
