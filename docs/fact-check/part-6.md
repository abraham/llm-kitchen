# Fact-check: Part VI (Ch 15–21)

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

## Ch 19. Caching: reusing the work

Data: `scripts/build-caching.py` times GPT-2 small (float32, CPU) generating 500 greedy tokens
after "The cat sat on the", with and without its KV cache, three times each (median per token),
written to `static/caching/kv-cache.json`. The prompt-cache view is computed in the browser
(`src/lib/harness/cache.ts`) from the Ch 18 session's recorded token counts.

| Claim                                                                                  | Backing                                                      |
| -------------------------------------------------------------------------------------- | ------------------------------------------------------------ |
| A token's key and value depend only on earlier text (causal mask), so they can be kept | Ch 9 mask; the cached and uncached runs pick the same tokens |
| Without the cache, 24 to 139 ms per token; with it about 20; 43.2 s against 10.0 s     | Test (measured, this machine; labeled in the widget)         |
| Both runs picked the same 500 tokens; scores differed by at most 0.01                  | Script asserts equal tokens; test checks the difference      |
| 2 × 12 × 768 = 18,432 cached numbers per token for GPT-2 small                         | Test against `models/canonical.json`                         |
| Large models' caches run to gigabytes; keeping them small matters for serving          | Cite `pope2022`                                              |
| Providers keep the KV cache for a prompt's exact start, for minutes to hours           | Cite `openai-prompt-caching`, `anthropic-prompt-caching`     |
| Cached tokens cost a tenth of the normal price or less; replies start sooner           | Cite both provider docs (0.1× reads, lower on some models)   |
| The match must be exact from the first token; any early change breaks the rest         | Cite both provider docs                                      |
| Put stable content first, append only; trimming or summarizing changes the prefix      | Cite `openai-prompt-caching` (optimization guidance)         |
| Appending reuses 6,100 of 7,656 tokens (80%); the time at the top reuses none          | Test (`cacheCalls`)                                          |
| Dropping sends 5,776 tokens but costs more than appending; summarizing costs least     | Test                                                         |
| Caching doesn't change the answer and isn't memory                                     | Cite both provider docs                                      |
| Minimum cacheable length (a few hundred to a few thousand tokens); writes cost extra   | Cite both provider docs; labeled as simplified in the widget |

## Ch 20. Prompt injection

Data: `scripts/build-injection.py` runs Qwen2.5-1.5B-Instruct (greedy) on 3 documents × 5 attacks
(including none) × 6 defenses, written to `static/injection/lab.json`. The injected goal is a false
claim in the summary; each reply is graded by a per-document pattern, and every reply was read by
hand to check the grading ("four out of five stars", the real rating, doesn't count).

| Claim                                                                              | Backing                                                       |
| ---------------------------------------------------------------------------------- | ------------------------------------------------------------- |
| Instructions in text the model reads can hijack it                                 | Cite `perez2022`                                              |
| Indirect injection hides in fetched content the user may never see                 | Cite `greshake2023`                                           |
| No defense: 7 of 12; plain instruction 16 of 18; HTML comment 11 of 18             | Test                                                          |
| The made-up cancellation reply                                                     | Test (exact recorded reply)                                   |
| Every defense let some through; marking 6 of 12; warning and tags 9 of 12 each     | Test                                                          |
| The fake message adds a 4th role marker; removing markers leaves 3, works as often | Test (token counts, tally)                                    |
| Spotlighting cut attacks from over 50% to under 2% for GPT models                  | Cite `hines2024` (abstract)                                   |
| Training a model to rank system instructions above tool text makes it more robust  | Cite `wallace2024`                                            |
| No prompt defense is known to stop every attack                                    | `hines2024`, `wallace2024` report reductions, not elimination |
| Small models are easier to fool; these results show the mechanism, not real rates  | Labeled in the prose                                          |

## Ch 21. Trust and guardrails

| Claim                                                                     | Backing                            |
| ------------------------------------------------------------------------- | ---------------------------------- |
| Indirect prompt injection has worked on real products                     | Cite `greshake2023`                |
| No guardrails: all three files deleted, then the 8-call limit, no summary | Test                               |
| Ask first: six deletion attempts refused, nothing lost                    | Test                               |
| Only safe tools: it still tried `delete_file`, nothing lost               | Test                               |
| A 3-step limit still loses one file                                       | Test (replay of the first 3 steps) |
| Sandboxes isolate code execution                                          | General practice (no demo)         |

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
- **Ch 19 views.** The prompt-cache view draws each call as a bar of blocks (system prompt, tasks)
  rather than rows of token chips, since the prompts are hundreds of tokens long, and it shows
  tokens processed instead of a time to first token. The KV-cache timing is measured offline on one
  laptop CPU; live timing in the browser is left for later.
- **Ch 20 goal.** The injected goal is a false claim in the summary. A first version asked for a
  reply of only a code word: the model almost never did that, but often worked the word into its
  summary ("Pineapple confirms they can volunteer…"). A second asked it to add a link, which
  worked only 3 times in 72. A false claim fits the task the model was given, which is how real
  attacks on summarizers work.
- **Ch 20 view.** The lab shows the prompt in its own colored view rather than in the Ch 15 inspector,
  and a toggle removes the colors to show what the model gets.
- **The recap** moved to [part-7.md](part-7.md) when Part VII was added.
