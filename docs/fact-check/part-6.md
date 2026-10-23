# Fact-check: Part VI (Ch 16–20)

Claim checklist for the per-chapter fact-check (see PLAN.md §7). Tests:
`tests/unit/part-6-facts.test.ts` (the recorded data says what the prose says),
`tests/e2e/part-6.e2e.ts`.

Data: `scripts/build-prompts.py` writes `static/prompts/`, using only models other scripts already
download: GPT-2 small (the canonical model) and Qwen2.5-1.5B-Instruct. Greedy decoding throughout;
the pinned revision is in each file. Probabilities of an answer cover all of its tokens.

## Ch 16. A prompt is the start of a document

| Claim                                                                                              | Backing                              |
| -------------------------------------------------------------------------------------------------- | ------------------------------------ |
| "The cat sat on the": _floor_ about 8%, _bed_ about 7%; with "It was bedtime," _bed_ 22%           | Test (recorded data)                 |
| At the beach, _sand_ goes from under 0.2% to one of the top two guesses                            | Test                                 |
| "What is the capital of France?": _Paris_ about 0.5%, top guess a new line at 34%                  | Test                                 |
| "The capital of France is" makes _Paris_ about six times as likely                                 | Test                                 |
| Shading: last token's attention averaged over all heads, first token left out and shown separately | Labeled in the widget; recorded data |
| Chat models were tuned so a question is followed by an answer                                      | Ch 13; cite `ouyang2022` there       |
| GPT-3 did new tasks from a description and examples with no weight updates                         | Cite `brown2020` (abstract)          |

## Ch 17. Learning from examples in the prompt

| Claim                                                                                                                                        | Backing                      |
| -------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------- |
| Qwen: _sad_ for "happy ->" about 1% with no examples, 96% with four                                                                          | Test                         |
| Made-up labels: almost nothing with no examples, 22–78% with four                                                                            | Test                         |
| "light -> dark" got less likely as examples were added                                                                                       | Test                         |
| GPT-2 repeats the word for opposites and says "zork" for every made-up-label test                                                            | Test (its top guess)         |
| In-context learning improves with model size                                                                                                 | Cite `brown2020`             |
| Induction heads look at what followed the current token last time; they appear with a jump in in-context learning and may explain most of it | Cite `olsson2022` (abstract) |
| GPT-2 head 5.0 sends over 90% of the final arrow's attention to the earlier answers                                                          | Test (recorded attention)    |

## Ch 18. Instructions, roles, and the system prompt

| Claim                                                                                                   | Backing                                   |
| ------------------------------------------------------------------------------------------------------- | ----------------------------------------- |
| Chat models were tuned on instruction-following examples and human ratings                              | Cite `ouyang2022`                         |
| The widget's template matches the text the model read                                                   | Test (`chatTemplate` vs. recorded prompt) |
| Specific instructions gave a shorter answer; the persona more than doubled it and added a muddled claim | Test (token counts, quoted phrase)        |
| "Never makes mistakes" persona: 3 of 8 sums right, default 5 of 8                                       | Test                                      |
| Across 162 personas and 2,410 questions, personas didn't improve accuracy; effects largely random       | Cite `zheng2024` (abstract)               |

## Ch 19. Asking for steps and structure

| Claim                                                                                  | Backing                       |
| -------------------------------------------------------------------------------------- | ----------------------------- |
| Worked examples of reasoning improved math word problems in large models               | Cite `wei2022`                |
| "Let's think step by step": 17.7% → 78.7% on MultiArith (InstructGPT text-davinci-002) | Cite `kojima2022` (abstract)  |
| Each of the three endings got 4 of 6 right; the format was followed once               | Test (hand grades, see below) |
| Just the answer: "0.10" for the ball; step by step: "0.2 minutes" for the widgets      | Test                          |

The replies don't share a format, so they were graded by reading them. `GRADES` in the script
records each grade with a phrase from the reply it was given for, and the script stops if a rerun
changes a reply.

## Ch 20. Where prompts break

| Claim                                                                                                  | Backing                     |
| ------------------------------------------------------------------------------------------------------ | --------------------------- |
| The 24 orders of four examples gave 4 to 8 of 8 reviews right                                          | Test                        |
| Some orders near state of the art, others random; good orders don't transfer between models            | Cite `lu2022` (abstract)    |
| Layouts gave 7, 6, 4, and 4 of 8                                                                       | Test                        |
| Formatting alone moved accuracy by up to 76 points, not fixed by size, examples, or instruction tuning | Cite `sclar2024` (abstract) |
| 30 locker lines: 8 of 88 answers wrong, all with the line in the middle                                | Test                        |
| Models use information at the start and end of long prompts better than in the middle                  | Cite `liu2024` (abstract)   |

## Changes from the plan

- **Ch 17 models.** Probabilities come from Qwen2.5-1.5B-Instruct (reading the prompt as plain text)
  and GPT-2 small; the attention view is GPT-2's, since that's the model the site shows attention
  for.
- **Ch 18** shows the chat template with the system prompt highlighted, in its own widget, rather
  than reusing the Ch 21 prompt inspector.
- **Ch 19 grading.** Hand-graded replies (see above) instead of an automatic check, which misread
  several replies in testing.
- **Ch 20 position.** A short list of 30 lines rather than a long multi-document prompt, so the
  effect shows as a handful of misses in the middle rather than a smooth U-shaped curve.
- **Part order.** This was Part VIII (Ch 28–32) until milestone 19 moved prompting before the
  harness chapters.
