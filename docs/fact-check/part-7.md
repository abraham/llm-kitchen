# Fact-check: Part VII (Ch 23–29)

Claim checklist for the per-chapter fact-check (see [the spec](../spec/sources.md)). Tests:
each chapter's `facts.test.ts`, `src/lib/harness/agent.test.ts` (the browser's toy tools give
exactly the recorded results; the prompt segmenter loses nothing), each chapter's `chapter.e2e.ts`.

Data: real runs of Qwen2.5-1.5B-Instruct (greedy, pinned revision recorded in each file) inside the
harness in `scripts/record/agent.py`, written to `static/data/agent/`. The harness stops the model
after its first tool call, runs the tool, and calls the model again, up to 8 calls.

## Ch 23. The model is not the product

| Claim                                                                                                         | Backing                                                                                                 |
| ------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| The prompt contains a system prompt, tool descriptions, earlier turns, and chat markers                       | Recorded prompt; segmenter test labels each part                                                        |
| A 31-character message became a 400-token prompt, then 493 on the second call                                 | Test (recorded token counts, Qwen tokenizer)                                                            |
| The model has no memory; the harness re-sends the conversation                                                | Each recorded prompt contains the full history (harness code)                                           |
| The earlier assistant turn is the model's own reply                                                           | `record/agent.py` generates it                                                                          |
| Qwen2.5 model family                                                                                          | Cite `qwen2024`                                                                                         |
| Simple: restates Standard in plainer words, with no new claims                                                | Reviewed against the Standard text                                                                      |
| In depth: tool descriptions 295 of 400 tokens; instructions 53, earlier exchange 22, message 8                | Qwen tokenizer, per part (record environment); test checks the tools part is over 70% of the characters |
| In depth: Qwen's template puts the descriptions in `<tools>` tags with calling instructions                   | Recorded prompt                                                                                         |
| In depth: the second call added 93 tokens: the call as the model's turn, the result in `<tool_response>` tags | Test                                                                                                    |

## Ch 24. Tools

| Claim                                                                                                                                                                               | Backing                                                           |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------- |
| Without tools the model answered 7,050,952; the right answer is 7,006,652                                                                                                           | Test (recorded output; calculator)                                |
| With a calculator it answered 7006652                                                                                                                                               | Test                                                              |
| Models can be trained to write tool calls at the right moments                                                                                                                      | Cite `schick2023`                                                 |
| Qwen writes JSON between `<tool_call>` tags                                                                                                                                         | Recorded outputs and chat template                                |
| The site's `<call name>…</call>` form is simplified and made up                                                                                                                     | Stated in the chapter; `simpleCall` in `harness/tools.ts`         |
| The toy tools run in the browser, never `eval`, never the network                                                                                                                   | `harness/tools.ts` (hand-written parser; test rejects code)       |
| Anthropic released MCP as an open standard in November 2024                                                                                                                         | Cite `anthropic-mcp` (Nov 25, 2024)                               |
| An MCP server lists tools with a name, a description, and an input schema; harnesses list them and send calls to the server (`get_weather` with a `location` is the spec's example) | Cite `mcp-spec` (`tools/list`, `tools/call`; accessed 2026-10-23) |
| The model never sees MCP; the harness sits between model and server                                                                                                                 | Cite `mcp-spec` (message flow: the client talks to both)          |
| Simple: restates Standard in plainer words, with no new claims                                                                                                                      | Reviewed against the Standard text                                |
| In depth: the rows were 98,072, 61,700, 617,000, 6,170,000; only the last is right; they sum to 6,946,772                                                                           | Test (recorded output; arithmetic)                                |
| In depth: Toolformer kept a sampled call only if its result made the next tokens easier to predict                                                                                  | Cite `schick2023` (§2, filtering by loss)                         |
| In depth: Qwen2.5 reserves two control tokens for tools; `<tool_call>` and `</tool_call>` are single tokens                                                                         | Cite `qwen2024` (§2); Qwen tokenizer (ids 151657, 151658)         |
| In depth: the recorded call text between the tags                                                                                                                                   | Test                                                              |
| In depth: MCP is JSON-RPC 2.0; `tools/list` returns name, description, inputSchema; `tools/call` returns content; list-changed notifications                                        | Cite `mcp-spec`                                                   |

## Ch 25. The agent loop

| Claim                                                                                         | Backing                                                  |
| --------------------------------------------------------------------------------------------- | -------------------------------------------------------- |
| The run: search_rhymes, then count_words (30), then the answer                                | Test                                                     |
| Prompts of 301, 394, 483 tokens; at most 8 model calls                                        | Test                                                     |
| The harness stops after the first tool call; the system prompt says to use tools for counting | `record/agent.py`                                        |
| Interleaving reasoning and actions was popularized by ReAct                                   | Cite `yao2023`                                           |
| Simple: restates Standard in plainer words, with no new claims                                | Reviewed against the Standard text                       |
| In depth: K calls read K·p₀ + a·K(K−1)/2 tokens, growing with the square of the steps         | Arithmetic; test (within 5 tokens of the run)            |
| In depth: 301 + 394 + 483 = 1,178 tokens; each step added about 90                            | Test                                                     |
| In depth: providers reuse their work on an unchanged start of the prompt                      | Cite `openai-prompt-caching`, `anthropic-prompt-caching` |

## Ch 26. Managing the context

| Claim                                                                                           | Backing                                                        |
| ----------------------------------------------------------------------------------------------- | -------------------------------------------------------------- |
| Six tasks overflow a 1,500-token budget; each strategy fits                                     | Test                                                           |
| The budget is deliberately small; the model can read far more                                   | Qwen2.5-1.5B-Instruct config: `max_position_embeddings` 32,768 |
| Dropping the oldest: the model made up "Old Mother Hubbard", 18 words                           | Test (recorded answer)                                         |
| Summary kept "30 words" and the answer was right                                                | Test                                                           |
| Retrieval by embedding similarity (MiniLM) picked the cat task, and the answer was right        | Test; cite `lewis2020`                                         |
| The map uses the Ch 5 projection                                                                | `ContextBudget` projects with `minilm-map.json`'s PCA basis    |
| Simple: restates Standard in plainer words, with no new claims                                  | Reviewed against the Standard text                             |
| In depth: similarity is the cosine of 384-number MiniLM vectors; cat 0.67, the others 0.53–0.60 | Test (recomputed from the stored vectors)                      |
| In depth: the summary shrank the 221-token cat task to a 29-token note                          | Test                                                           |

## Ch 27. Caching: reusing the work

Data: `scripts/record/caching.py` times GPT-2 small (float32, CPU) generating 500 greedy tokens
after "The cat sat on the", with and without its KV cache, three times each (median per token),
written to `static/data/caching/kv-cache.json`. The prompt-cache view is computed in the browser
(`src/lib/harness/cache.ts`) from the Ch 26 session's recorded token counts.

| Claim                                                                                                                    | Backing                                                         |
| ------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------- |
| A token's key and value depend only on earlier text (causal mask), so they can be kept                                   | Ch 9 mask; the cached and uncached runs pick the same tokens    |
| Without the cache, 24 to 139 ms per token; with it about 20; 43.2 s against 10.0 s                                       | Test (measured, this machine; labeled in the widget)            |
| Both runs picked the same 500 tokens; scores differed by at most 0.01                                                    | Script asserts equal tokens; test checks the difference         |
| 2 × 12 × 768 = 18,432 cached numbers per token for GPT-2 small                                                           | Test against `models/canonical.json`                            |
| Large models' caches run to gigabytes; keeping them small matters for serving                                            | Cite `pope2022`                                                 |
| Providers keep the KV cache for a prompt's exact start, for minutes to hours                                             | Cite `openai-prompt-caching`, `anthropic-prompt-caching`        |
| Cached tokens cost a tenth of the normal price or less; replies start sooner                                             | Cite both provider docs (0.1× reads, lower on some models)      |
| The match must be exact from the first token; any early change breaks the rest                                           | Cite both provider docs                                         |
| Put stable content first, append only; trimming or summarizing changes the prefix                                        | Cite `openai-prompt-caching` (optimization guidance)            |
| Appending reuses 6,100 of 7,656 tokens (80%); the time at the top reuses none                                            | Test (`cacheCalls`)                                             |
| Dropping sends 5,776 tokens but costs more than appending; summarizing costs least                                       | Test                                                            |
| Caching doesn't change the answer and isn't memory                                                                       | Cite both provider docs                                         |
| Minimum cacheable length (a few hundred to a few thousand tokens); writes cost extra                                     | Cite both provider docs; labeled as simplified in the widget    |
| Simple: restates Standard in plainer words, with no new claims                                                           | Reviewed against the Standard text                              |
| In depth: without the cache, n·p + n(n−1)/2 passes: 127,250 against 504 (252×), yet 4.3× the time                        | Test (`positionsProcessed`, recorded times)                     |
| In depth: one-token passes are mostly loading weights from memory, so extra tokens in a pass are cheap                   | Cite `pope2022`                                                 |
| In depth: with the cache the time per token crept from about 19 to 20 ms                                                 | Test                                                            |
| In depth: Qwen2.5-1.5B: 28 layers, 12 query heads sharing 2 key/value heads of 128: 14,336 numbers per token, not 86,016 | Cite `qwen2024` (Table 1, GQA); config `hidden_size` 1536; test |
| In depth: 2 bytes each: about 29 KB per token, 0.94 GB for 32,768 tokens                                                 | Test; config (bfloat16, 32,768 positions)                       |
| In depth: appending costs 1,556 + 610 = 2,166 full-price tokens, 28%; the time at the top costs 7,656                    | Test (`cacheTotals`, illustrative 0.1 price)                    |

## Ch 28. Prompt injection

Data: `scripts/record/injection.py` runs Qwen2.5-1.5B-Instruct (greedy) on 3 documents × 5 attacks
(including none) × 6 defenses, written to `static/data/injection/lab.json`. The injected goal is a false
claim in the summary; each reply is graded by a per-document pattern, and every reply was read by
hand to check the grading ("four out of five stars", the real rating, doesn't count).

| Claim                                                                                                       | Backing                                                       |
| ----------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------- |
| Instructions in text the model reads can hijack it                                                          | Cite `perez2022`                                              |
| Indirect injection hides in fetched content the user may never see                                          | Cite `greshake2023`                                           |
| No defense: 7 of 12; plain instruction 16 of 18; HTML comment 11 of 18                                      | Test                                                          |
| The made-up cancellation reply                                                                              | Test (exact recorded reply)                                   |
| Every defense let some through; marking 6 of 12; warning and tags 9 of 12 each                              | Test                                                          |
| The fake message adds a 4th role marker; removing markers leaves 3, works as often                          | Test (token counts, tally)                                    |
| Spotlighting cut attacks from over 50% to under 2% for GPT models                                           | Cite `hines2024` (abstract)                                   |
| Training a model to rank system instructions above tool text makes it more robust                           | Cite `wallace2024`                                            |
| No prompt defense is known to stop every attack                                                             | `hines2024`, `wallace2024` report reductions, not elimination |
| Small models are easier to fool; these results show the mechanism, not real rates                           | Labeled in the prose                                          |
| Simple: restates Standard in plainer words, with no new claims                                              | Reviewed against the Standard text                            |
| In depth: spotlighting has three forms: delimiting, datamarking, encoding                                   | Cite `hines2024` (§III)                                       |
| In depth: GPT-3.5 Turbo: delimiting about halves attacks; datamarking about 50% to about 3%; encoding to 0% | Cite `hines2024` (§V-A, Figs. 3, 4, 6)                        |
| In depth: encoding hurt GPT-3.5's task performance; recommended only for the strongest models               | Cite `hines2024` (§V-B)                                       |
| In depth: marking stopped every fake notice, only one of three plain instructions                           | Test                                                          |
| In depth: a known delimiter can be forged; space-only marking misses attacks without spaces                 | Cite `hines2024` (§V-D)                                       |

## Ch 29. Trust and guardrails

| Claim                                                                                                                    | Backing                                                                   |
| ------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------- |
| Indirect prompt injection has worked on real products                                                                    | Cite `greshake2023`                                                       |
| No guardrails: all three files deleted, then the 8-call limit, no summary                                                | Test                                                                      |
| Ask first: six deletion attempts refused, nothing lost                                                                   | Test                                                                      |
| Only safe tools: it still tried `delete_file`, nothing lost                                                              | Test                                                                      |
| A 3-step limit still loses one file                                                                                      | Test (replay of the first 3 steps)                                        |
| Sandboxes isolate code execution                                                                                         | General practice (no demo)                                                |
| Simple: restates Standard in plainer words, with no new claims                                                           | Reviewed against the Standard text                                        |
| In depth: the page contains `</tool_response>` then "New instructions from the user:"                                    | Test (`INJECTED_PAGE`)                                                    |
| In depth: Qwen's result tags are ordinary text, four tokens each, the same as the real ones                              | Qwen tokenizer (`</tool_response>` = 522, 14172, 9655, 29); `qwen2024` §2 |
| In depth: allowlist: three `delete_file` calls with a made-up `file_path`, each an error; first prompt 262 vs 327 tokens | Test                                                                      |
| In depth: MCP says a person should always be able to deny a tool call                                                    | Cite `mcp-spec` (User Interaction Model)                                  |
| In depth: none of the three runs produced the summary                                                                    | Test                                                                      |
