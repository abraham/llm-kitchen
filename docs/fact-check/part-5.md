# Fact-check: Part V (Ch 11–14)

Claim checklist for the per-chapter fact-check (see PLAN.md §7). Tests:
`tests/unit/part-5-facts.test.ts`, `src/lib/math/chat-template.test.ts`,
`src/lib/math/transformer.test.ts`, `tests/unit/traces.test.ts`, `tests/e2e/part-5.e2e.ts`.

Data: GPT-2 traces from `scripts/build-traces.py` (`the-cat-sat-*` branches, `quirk-*`); base vs.
instruct outputs from `scripts/build-chat.py` (`static/chat/base-vs-instruct.json`, greedy, pinned
revisions recorded in the file). Paper figures were checked against the PDFs' text.

## Ch 11. Generating text

| Claim                                                                                 | Backing                                                                    |
| ------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| Greedy continuation of "The cat sat on the" is "floor, and the cat was still asleep." | Test (recorded trace)                                                      |
| Picking " bed" leads to the loop ", and the cat sat on the bed, and the cat…"         | Test (`the-cat-sat-bed`)                                                   |
| Greedy decoding tends to repeat; sampling mostly avoids it                            | Cite `holtzman2020`                                                        |
| Each token costs a full run through all 124 million weights                           | Model architecture (no caching is shown); `canonical.json`                 |
| `<\|endoftext\|>` is token 50,256 and GPT-2's end token                               | Cite `gpt2-config` (`eos_token_id: 50256`); test (tokenizer)               |
| The live copy is about 155 MB including the runtime                                   | `canonical.json` `onnxMB` (128, Hugging Face file listing) + 27 MB runtime |
| The live 8-bit copy's percentages differ from the recorded ones                       | Checked: " floor" 15.4% (8-bit) vs. 7.6% (full precision)                  |

## Ch 12. Scale

| Claim                                                                                 | Backing                                                    |
| ------------------------------------------------------------------------------------- | ---------------------------------------------------------- |
| GPT-3: 175 billion weights, 300 billion training tokens, 3.14 × 10²³ FLOPs            | Cite `brown2020` (§2, Table D.1)                           |
| GPT-3 is more than 1,000 times GPT-2 small                                            | Test (1,406×)                                              |
| Llama 3 405B: 15.6T tokens, 3.8 × 10²⁵ FLOPs; about 39 tokens per weight              | Cite `grattafiori2024` (§1, §3.2); test                    |
| Chinchilla 70B on 1.4T tokens, same compute as Gopher (280B, 300B tokens), and better | Cite `hoffmann2022` (abstract, Table 1; 5.76 × 10²³ FLOPs) |
| Chinchilla is about 20 tokens per weight                                              | Test                                                       |
| GPT-2 small read about 8 million web pages, about 40 GB                               | Cite `radford2019` §2.1                                    |
| The site's toy models: word-pair counts, 3,790 weights, 192,000 training characters   | Test (computed from the same code as the widgets)          |
| Tiny model compute ≈ 6 × weights × tokens                                             | The standard estimate (Kaplan et al. 2020 §2.1, C ≈ 6NE)   |
| Loss falls smoothly with size, data, and compute                                      | Cite `kaplan2020`                                          |
| L(N) = (8.8 × 10¹³ / N)^0.076, N = non-embedding weights, fit on 768 to 1.5 billion   | Cite `kaplan2020` eq. 1.1, §3; test (`kaplanLoss`)         |
| GPT-2 sizes' non-embedding counts; released totals 124M/355M/774M/1.56B               | Test (`GPT2_FAMILY` totals equal the released checkpoints) |
| e^(−loss) is the average (geometric mean) probability of the right token              | Definition of cross-entropy                                |
| Bigger models were much better at learning a task from a few examples in the prompt   | Cite `brown2020`                                           |

## Ch 13. From predictor to assistant

| Claim                                                                                 | Backing                                                                                        |
| ------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| The ChatML template text, including Qwen's default system prompt                      | Test: `chatTemplate` equals `apply_chat_template` output from the real tokenizer               |
| Qwen2.5 is a 2024 model family with base and instruct versions                        | Cite `qwen2024`                                                                                |
| Base Qwen answers "boil an egg" with a question and a multiple-choice quiz            | Recorded output; test                                                                          |
| Instruct without the template keeps going (Python code; a stray template line)        | Recorded output; test                                                                          |
| Instruct in its chat format answers and stops                                         | Recorded output (`stopped: true`); test                                                        |
| Tuning: example answers, then preference comparisons and a reward model               | Cite `ouyang2022` (Fig. 2)                                                                     |
| People preferred 1.3B InstructGPT over 175B GPT-3                                     | Cite `ouyang2022` (abstract)                                                                   |
| Qwen2.5's tuning used over a million examples, then multistage reinforcement learning | Cite `qwen2024` (abstract)                                                                     |
| Stage 1 example output                                                                | Real Qwen2.5-0.5B output (recorded); stage 2–3 examples are illustrations (widget is "sample") |

## Ch 14. Quirks and limits

| Claim                                                                                | Backing                                  |
| ------------------------------------------------------------------------------------ | ---------------------------------------- |
| GPT-2: first person on the moon was "a man named John, who was born in 1829."        | Test (recorded)                          |
| Hallucination is the term for fluent, made-up text                                   | Cite `ji2023`                            |
| InstructGPT made up information about half as often as GPT-3 (21% vs. 41%)           | Cite `ouyang2022` (§1)                   |
| WebText excludes links created after Dec 2017                                        | Cite `radford2019` §2.1                  |
| Top guesses for the latest iPhone: 6, 5, 7                                           | Test (recorded)                          |
| " strawberry" is one GPT-2 token; "strawberry" is three                              | e2e (live tokenizer) and Ch 4 tests      |
| After "2 + 2 =", " 3" is more likely than " 4"                                       | Test (recorded: 10.2% vs. 5.5%)          |
| "The capital of France is" rambles; the Q/A version says Paris                       | Test (recorded)                          |
| Formatting alone changed accuracy by up to 76 points                                 | Cite `sclar2024` (abstract, LLaMA-2-13B) |
| GPT-2's context window is 1,024 tokens; the live generator keeps only the last 1,024 | `canonical.json`; implementation         |

## Changes from the plan

- **T3 (WebLLM) and T4 (bring your own key) are not built yet.** Ch 13's base vs. instruct comparison
  uses recorded outputs from Qwen2.5-0.5B and its instruct version instead of a live T3 model, and
  Ch 14's live experiments use the live GPT-2 (T2). See PLAN.md.
- **Ch 11 pipeline animation** is a compact strip of stages that lights up on each step, rather than
  a full left-to-right reuse of every earlier visual.
- **Ch 12 scaling chart** draws Kaplan et al.'s fitted formula (with the GPT-2 sizes placed on it),
  not measured losses, and says so.
- **Ch 14 quirks lab** reuses the glass-box generator with recorded quirk prompts as presets.
