# Fact-check: Part VI (Ch 15–20)

Claim checklist for the per-chapter fact-check (see PLAN.md §7). Tests:
`tests/unit/part-6-facts.test.ts`, `src/lib/harness/agent.test.ts` (the browser's toy tools give
exactly the recorded results; the prompt segmenter loses nothing), `tests/e2e/part-6.e2e.ts`.

Data: real runs of Qwen2.5-1.5B-Instruct (greedy, pinned revision recorded in each file) inside the
harness in `scripts/build-agent-traces.py`, written to `static/agent/`. The harness stops the model
after its first tool call, runs the tool, and calls the model again, up to 8 calls.

## Ch 15. The model is not the product

| Claim                                                                                   | Backing                                                       |
| --------------------------------------------------------------------------------------- | ------------------------------------------------------------- |
| The prompt contains a system prompt, tool descriptions, earlier turns, and chat markers | Recorded prompt; segmenter test labels each part              |
| A 31-character message became a 400-token prompt, then 493 on the second call           | Test (recorded token counts, Qwen tokenizer)                  |
| The model has no memory; the harness re-sends the conversation                          | Each recorded prompt contains the full history (harness code) |
| The earlier assistant turn is the model's own reply                                     | `build-agent-traces.py` generates it                          |
| Qwen2.5 model family                                                                    | Cite `qwen2024`                                               |

## Ch 16. Tools

| Claim                                                                     | Backing                                                     |
| ------------------------------------------------------------------------- | ----------------------------------------------------------- |
| Without tools the model answered 7,050,952; the right answer is 7,006,652 | Test (recorded output; calculator)                          |
| With a calculator it answered 7006652                                     | Test                                                        |
| Models can be trained to write tool calls at the right moments            | Cite `schick2023`                                           |
| Qwen writes JSON between `<tool_call>` tags                               | Recorded outputs and chat template                          |
| The site's `<call name>…</call>` form is simplified and made up           | Stated in the chapter; `simpleCall` in `harness/tools.ts`   |
| The toy tools run in the browser, never `eval`, never the network         | `harness/tools.ts` (hand-written parser; test rejects code) |

## Ch 17. The agent loop

| Claim                                                                                         | Backing                 |
| --------------------------------------------------------------------------------------------- | ----------------------- |
| The run: search_rhymes, then count_words (30), then the answer                                | Test                    |
| Prompts of 301, 394, 483 tokens; at most 8 model calls                                        | Test                    |
| The harness stops after the first tool call; the system prompt says to use tools for counting | `build-agent-traces.py` |
| Interleaving reasoning and actions was popularized by ReAct                                   | Cite `yao2023`          |

## Ch 18. Managing the context

| Claim                                                                                    | Backing                                                        |
| ---------------------------------------------------------------------------------------- | -------------------------------------------------------------- |
| Six tasks overflow a 1,500-token budget; each strategy fits                              | Test                                                           |
| The budget is deliberately small; the model can read far more                            | Qwen2.5-1.5B-Instruct config: `max_position_embeddings` 32,768 |
| Dropping the oldest: the model made up "Old Mother Hubbard", 18 words                    | Test (recorded answer)                                         |
| Summary kept "30 words" and the answer was right                                         | Test                                                           |
| Retrieval by embedding similarity (MiniLM) picked the cat task, and the answer was right | Test; cite `lewis2020`                                         |
| The map uses the Ch 5 projection                                                         | `ContextBudget` projects with `minilm-map.json`'s PCA basis    |

## Ch 19. Trust and guardrails

| Claim                                                                     | Backing                            |
| ------------------------------------------------------------------------- | ---------------------------------- |
| Indirect prompt injection has worked on real products                     | Cite `greshake2023`                |
| No guardrails: all three files deleted, then the 8-call limit, no summary | Test                               |
| Ask first: six deletion attempts refused, nothing lost                    | Test                               |
| Only safe tools: it still tried `delete_file`, nothing lost               | Test                               |
| A 3-step limit still loses one file                                       | Test (replay of the first 3 steps) |
| Sandboxes isolate code execution                                          | General practice (no demo)         |

## Ch 20. Recap

The diagram and quiz restate earlier chapters; each box links to its chapter. Quiz answers are
checked by e2e.

## Changes from the plan

- **Model for Part VI recordings.** Qwen2.5-1.5B-Instruct (about 3 GB, recorded offline), not a
  frontier model. The 0.5B model couldn't complete the agent task. Its failures, like the made-up
  "Old Mother Hubbard", are kept as real examples.
- **Harness choices made visible.** The harness stops after the first tool call and the system
  prompt asks for tools instead of mental counting. Without these, both small models wrote several
  calls at once with made-up arguments and guessed the word count; the chapter says the harness
  makes the rules.
- **Injection text.** The page fakes the end of the tool result and a new user message. A plain
  "ignore your instructions" note didn't make the model delete anything in testing.
- **No live tool calling (T3/T4)** in v1; see PLAN.md Future improvements.
- **Ch 20** uses a click-to-zoom set of boxes rather than a free pan-and-zoom diagram.
