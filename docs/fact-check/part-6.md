# Fact-check: Part VI (Ch 18–22)

Claim checklist for the per-chapter fact-check (see [the spec](../spec/sources.md)). Tests:
each chapter's `facts.test.ts` (the recorded data says what the prose says),
each chapter's `chapter.e2e.ts`.

Data: `scripts/record/prompts.py` writes `static/data/prompts/`, using only models other scripts already
download: GPT-2 small (the canonical model) and Qwen2.5-1.5B-Instruct. Greedy decoding throughout;
the pinned revision is in each file. Probabilities of an answer cover all of its tokens.

## Ch 18. A prompt is the start of a document

| Claim                                                                                                                                   | Backing                                                    |
| --------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------- |
| "The cat sat on the": _floor_ about 8%, _bed_ about 7%; with "It was bedtime," _bed_ 22%                                                | Test (recorded data)                                       |
| At the beach, _sand_ goes from under 0.2% to one of the top two guesses                                                                 | Test                                                       |
| "What is the capital of France?": _Paris_ about 0.5%, top guess a new line at 34%                                                       | Test                                                       |
| "The capital of France is" makes _Paris_ about six times as likely                                                                      | Test                                                       |
| Shading: last token's attention averaged over all heads, first token left out and shown separately                                      | Labeled in the widget; recorded data                       |
| Chat models were tuned so a question is followed by an answer                                                                           | Ch 15; cite `ouyang2022` there                             |
| GPT-3 did new tasks from a description and examples with no weight updates                                                              | Cite `brown2020` (abstract)                                |
| Simple: restates Standard in plainer words, with no new claims                                                                          | Reviewed against the Standard text                         |
| In depth: averaged over GPT-2's 144 heads, the first token takes 63% for the cat, 46–91% across the eight prompts                       | Test (recorded data); `gpt2-config` (12 layers × 12 heads) |
| In depth: softmax weights add up to 1, so heads park attention on the first token; keeping it lets windowed attention work on long text | Cite `xiao2024`                                            |
| In depth: after "A:", " The" 23% is far ahead of " Paris" 1.8%; " Paris" goes from 0.54% to 3.2%                                        | Test                                                       |

## Ch 19. Learning from examples in the prompt

| Claim                                                                                                                                        | Backing                                                              |
| -------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------- |
| Qwen: _sad_ for "happy ->" about 1% with no examples, 96% with four                                                                          | Test                                                                 |
| Made-up labels: almost nothing with no examples, 22–78% with four                                                                            | Test                                                                 |
| "light -> dark" got less likely as examples were added                                                                                       | Test                                                                 |
| GPT-2 repeats the word for opposites and says "zork" for every made-up-label test                                                            | Test (its top guess)                                                 |
| In-context learning improves with model size                                                                                                 | Cite `brown2020`                                                     |
| Induction heads look at what followed the current token last time; they appear with a jump in in-context learning and may explain most of it | Cite `olsson2022` (abstract)                                         |
| GPT-2 head 5.0 sends over 90% of the final arrow's attention to the earlier answers                                                          | Test (recorded attention)                                            |
| Simple: restates Standard in plainer words, with no new claims                                                                               | Reviewed against the Standard text                                   |
| In depth: "blip" is " bl" + "ip" and "zork" is " z" + "ork"; an answer's chance is the product of its tokens'                                | Test (recorded tokens); implementation (`answer_prob` in the script) |
| In depth: "horse ->" after four examples: about 0.69, with "ork" after " z" over 99%                                                         | Test                                                                 |
| In depth: an induction head relies on an earlier previous-token head, so it needs two layers                                                 | Cite `olsson2022`                                                    |
| In depth: head 5.0 sends 98% to the four opposites answers, rising from 5% to 35%                                                            | Test                                                                 |

## Ch 20. Instructions, roles, and the system prompt

| Claim                                                                                                                                                                            | Backing                                   |
| -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------- |
| Chat models were tuned on instruction-following examples and human ratings                                                                                                       | Cite `ouyang2022`                         |
| The widget's template matches the text the model read                                                                                                                            | Test (`chatTemplate` vs. recorded prompt) |
| Specific instructions gave a shorter answer; the persona more than doubled it and added a muddled claim                                                                          | Test (token counts, quoted phrase)        |
| "Never makes mistakes" persona: 3 of 8 sums right, default 5 of 8                                                                                                                | Test                                      |
| Across 162 personas and 2,410 questions, personas didn't improve accuracy; effects largely random                                                                                | Cite `zheng2024` (abstract)               |
| Simple: restates Standard in plainer words, with no new claims                                                                                                                   | Reviewed against the Standard text        |
| In depth: with no system prompt, Qwen's template fills in "You are Qwen, created by Alibaba Cloud. …"                                                                            | Test (site template vs recorded prompt)   |
| In depth: treating system prompts and untrusted text alike underlies prompt injection; training on an instruction hierarchy made GPT-3.5 much harder to attack, with little loss | Cite `wallace2024` (abstract)             |

## Ch 21. Asking for steps and structure

| Claim                                                                                                                           | Backing                                                                      |
| ------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| Worked examples of reasoning improved math word problems in large models                                                        | Cite `wei2022`                                                               |
| "Let's think step by step": 17.7% → 78.7% on MultiArith (InstructGPT text-davinci-002)                                          | Cite `kojima2022` (abstract)                                                 |
| Each of the three endings got 4 of 6 right; the format was followed once                                                        | Test (hand grades, see below)                                                |
| Just the answer: "0.10" for the ball; step by step: "0.2 minutes" for the widgets                                               | Test                                                                         |
| Simple: restates Standard in plainer words, with no new claims                                                                  | Reviewed against the Standard text                                           |
| In depth: Qwen2.5-1.5B has 28 layers; about 2 operations per weight is about 3 billion per token                                | Cite `qwen2024` (Table 1); 2 per weight as in Generating text (`kaplan2020`) |
| In depth: just the answer took 1–4 tokens; step by step 66–427                                                                  | Test                                                                         |
| In depth: every puzzle was right under at least one ending; a majority vote of the three gets 5 of 6                            | Test                                                                         |
| In depth: self-consistency samples several chains and keeps the most common answer; +17.9 points on GSM8K                       | Cite `wang2023` (abstract)                                                   |
| In depth: a format as a regular expression or grammar becomes an index of allowed tokens; little overhead; structure guaranteed | Cite `willard2023` (abstract)                                                |

The replies don't share a format, so they were graded by reading them. `GRADES` in the script
records each grade with a phrase from the reply it was given for, and the script stops if a rerun
changes a reply.

## Ch 22. Where prompts break

| Claim                                                                                                                              | Backing                            |
| ---------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------- |
| The 24 orders of four examples gave 4 to 8 of 8 reviews right                                                                      | Test                               |
| Some orders near state of the art, others random; good orders don't transfer between models                                        | Cite `lu2022` (abstract)           |
| Layouts gave 7, 6, 4, and 4 of 8                                                                                                   | Test                               |
| Formatting alone moved accuracy by up to 76 points, not fixed by size, examples, or instruction tuning                             | Cite `sclar2024` (abstract)        |
| 30 locker lines: 8 of 88 answers wrong, all with the line in the middle                                                            | Test                               |
| Models use information at the start and end of long prompts better than in the middle                                              | Cite `liu2024` (abstract)          |
| Simple: restates Standard in plainer words, with no new claims                                                                     | Reviewed against the Standard text |
| In depth: all five 4-of-8 orders ended with a positive example; all twelve ending with a negative scored 6 or more                 | Test                               |
| In depth: models favor labels near the end of the prompt or common in training; contextual calibration with "N/A", up to 30 points | Cite `zhao2021` (abstract)         |
| In depth: every miss gave the right number under 2%; 76 of the other 80 answers were over 99%                                      | Test                               |
