# Fact-check: Part VIII, Tools and agents (Ch 27–30)

Claim checklist for the per-chapter fact-check (see [the spec](../spec/sources.md)). Tests:
each chapter's `facts.test.ts`, `src/lib/harness/agent.test.ts` (the browser's toy tools give
exactly the recorded results; the prompt segmenter loses nothing), each chapter's `chapter.e2e.ts`.

Data: real runs of Qwen2.5-1.5B-Instruct (greedy, pinned revision recorded in each file) inside the
harness in `scripts/record/agent.py`, written to `static/data/agent/`. The harness stops the model
after its first tool call, runs the tool, and calls the model again, up to 8 calls.

## Ch 27. Tools

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

## Ch 28. The agent loop

| Claim                                                                                                                    | Backing                                                                             |
| ------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------- |
| The run: search_rhymes, then count_words (30), then the answer                                                           | Test                                                                                |
| Prompts of 301, 394, 483 tokens; at most 8 model calls                                                                   | Test                                                                                |
| The harness stops after the first tool call; the system prompt says to use tools for counting                            | `record/agent.py`                                                                   |
| Interleaving reasoning and actions was popularized by ReAct                                                              | Cite `yao2023`                                                                      |
| Workflows fix the path in code; agents let the model direct its own steps                                                | Cite `anthropic-agents` ("What are agents?")                                        |
| A loop suits tasks with unknown steps but costs more, is slower, and compounds errors; use the simplest setup that works | Cite `anthropic-agents` ("When (and when not) to use agents", "Agents")             |
| The router example: Which model answers? passes unsure questions to a bigger model                                       | The routing chapter's cascade                                                       |
| In depth: workflows also include parallel calls and one call checking another's work                                     | Cite `anthropic-agents` (parallelization, evaluator-optimizer)                      |
| Simple: restates Standard in plainer words, with no new claims                                                           | Reviewed against the Standard text                                                  |
| In depth: K calls read K·p₀ + a·K(K−1)/2 tokens, growing with the square of the steps                                    | Arithmetic; test (within 5 tokens of the run)                                       |
| In depth: 301 + 394 + 483 = 1,178 tokens; each step added about 90                                                       | Test                                                                                |
| In depth: providers reuse their work on an unchanged start of the prompt                                                 | Cite `openai-prompt-caching`, `anthropic-prompt-caching`                            |
| Across 17 models, actions written as Python succeeded up to 20% more often than JSON or text actions                     | Cite `wang2024codeact` (abstract)                                                   |
| Code agents run model-written code in a sandbox: allowed imports only, capped loops, or a separate container             | Cite `smolagents-secure`                                                            |
| The code example is made up, labeled so in the text                                                                      | Labeled "made-up"                                                                   |
| In depth: a failed program's error comes back as the result, so the model can fix its code                               | Cite `wang2024codeact` (abstract: revises actions on new observations, self-debugs) |

## Ch 29. Prompt injection

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

## Ch 30. Trust and guardrails

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
