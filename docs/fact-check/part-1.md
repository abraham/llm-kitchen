# Fact-check: Part I (Ch 0–2)

Claim checklist for the per-chapter fact-check (see [the spec](../spec/sources.md)). Each claim is cited, checked by a
test, or labeled in the text as a simplification. Tests: each chapter's `facts.test.ts`,
`src/lib/math/*.test.ts`, `tests/unit/datasets.test.ts`, `tests/unit/canonical.test.ts`.

## Ch 0. The guessing game

| Claim                                                                                     | Backing                                              |
| ----------------------------------------------------------------------------------------- | ---------------------------------------------------- |
| Shannon (1951) had people guess the next letter and used it to measure predictability     | Cite `shannon1951`                                   |
| GPT-2 small was released by OpenAI in 2019                                                | Cite `radford2019`, `gpt2-model-card`                |
| GPT-2's top guesses after "The cat sat on the" are floor, bed, couch                      | Test (recorded trace)                                |
| No single option gets even one chance in ten                                              | Test (top probability < 0.1)                         |
| The model chooses from 50,257 possible pieces of text                                     | `models/canonical.json`, checked by record/traces.py |
| Generation repeats: predict, pick, append                                                 | Recorded trace replay (greedy)                       |
| Simple: restates Standard in plainer words, with no new claims                            | Reviewed against the Standard text                   |
| In depth: a text's chance is the product of each token's chance given the ones before     | Cite `radford2019` (§2, eq. 1)                       |
| In depth: floor 7.6%, then a comma 26%; about 2% together                                 | Test (recorded trace)                                |
| In depth: the top 50 next tokens add up to about 64%; the other 50,207 share the rest     | Test (recorded trace, `canonical.json`)              |
| In depth: entropy H = −Σ p log₂ p, in bits; eight equal outcomes are 3 bits               | Cite `shannon1948`; test (arithmetic)                |
| In depth: Shannon estimated about one bit per letter of English, given 100 letters before | Cite `shannon1951` (summary)                         |

## Ch 1. Predicting by counting

| Claim                                                                                                               | Backing                                                                             |
| ------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| A bigram model looks at two words, current and next                                                                 | Cite `jurafsky-martin-ngrams`                                                       |
| After "little": lamb, dog, star once each (1 in 3)                                                                  | Test (`bigramCounts`)                                                               |
| Shannon generated English word by word from the previous word in 1948                                               | Cite `shannon1948` (§3, second-order word approximation)                            |
| "the cow jumped over the clock struck one, the lamb was sure to go" only uses seen pairs                            | Test                                                                                |
| "the" is followed by words from the cow, mouse, and lamb rhymes                                                     | Test                                                                                |
| Words with no followers only ever ended a rhyme                                                                     | Follows from counting; test of dead-end stop                                        |
| Rhymes are traditional/public domain; wording varies                                                                | Noted in `src/lib/data/rhymes.ts`                                                   |
| Simple: restates Standard in plainer words, with no new claims                                                      | Reviewed against the Standard text                                                  |
| In depth: P(w_i given w_i−1) = C(w_i−1 w_i) / C(w_i−1), the maximum likelihood estimate; P(lamb given little) = 1/3 | Cite `jurafsky-martin-ngrams` (§3.1); test (`nextWordProbs`)                        |
| In depth: unseen pairs get 0, so one makes a whole sentence impossible                                              | Follows from multiplying the chances; cite `jurafsky-martin-ngrams` (smoothing)     |
| In depth: add-one smoothing adds 1 to every count and V to the total                                                | Cite `jurafsky-martin-ngrams` (Laplace smoothing); test (chances still add up to 1) |
| In depth: 50,257² is about 2.5 billion pairs, 50,257³ about 127 trillion triples                                    | Test (`canonical.json`, arithmetic)                                                 |
| In depth: Bengio et al. called this the curse of dimensionality and proposed learning a prediction                  | Cite `bengio2003` (abstract)                                                        |

## Ch 2. Probability and sampling

| Claim                                                                                                     | Backing                                                                                         |
| --------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| Always picking the top word tends to give dull, repetitive text                                           | Cite `holtzman2020`                                                                             |
| Temperature divides raw scores before softmax; <1 sharpens, >1 flattens; 0 is greedy                      | Test (`applyTemperature`, `softmax`)                                                            |
| "Divide by the temperature": log probabilities stand in for raw scores; top is e^(gap/T) times the second | Test (same chances as the temperature widget; adding a constant to every score changes nothing) |
| Top-k keeps only the k most likely                                                                        | Cite `fan2018`, test (`topK`)                                                                   |
| Top-p (nucleus) keeps the most likely words until their chances add up to p; few when sure, many when not | Cite `holtzman2020`, test (`topP`)                                                              |
| In the widget, top-p 0.5 keeps floor, bed, couch, and ground, together 58%                                | Test (the recorded top ten, rescaled)                                                           |
| Widget uses only the top 10, rescaled                                                                     | Labeled "Simplified:" in the text                                                               |
| Real model has 50,257 options                                                                             | Test (`canonical.json`)                                                                         |
| Recorded runs: 16 tokens at T = 0, 0.7, 1.5; T = 0 matches greedy                                         | Test (traces)                                                                                   |
| Simple: restates Standard in plainer words, with no new claims                                            | Reviewed against the Standard text                                                              |
| In depth: p_i = e^(z_i/T) / Σ e^(z_j/T); the ratio of two chances is e^((z_i − z_j)/T)                    | Test (`softmax`, existing temperature test)                                                     |
| In depth: T = 1 leaves the probabilities unchanged; near 0 the top score takes everything                 | Test                                                                                            |
| In depth: the recorded runs divide GPT-2's raw scores by T and draw from all 50,257 tokens                | `scripts/record/traces.py` (softmax of logits / T, then a multinomial draw)                     |
| In depth: top-p keeps the smallest set of top tokens with chances summing to at least p, then rescales    | Test (`topP`)                                                                                   |
