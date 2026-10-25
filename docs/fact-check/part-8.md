# Fact-check: Part VIII, Tools and agents (Ch 27–32)

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

| Claim                                                                                                                                                                                                                          | Backing                                                                                   |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------- |
| The run: search_rhymes, then count_words (30), then the answer                                                                                                                                                                 | Test                                                                                      |
| Prompts of 301, 394, 483 tokens; at most 8 model calls                                                                                                                                                                         | Test                                                                                      |
| The harness stops after the first tool call; the system prompt says to use tools for counting                                                                                                                                  | `record/agent.py`                                                                         |
| Interleaving reasoning and actions was popularized by ReAct                                                                                                                                                                    | Cite `yao2023`                                                                            |
| Workflows fix the path in code; agents let the model direct its own steps                                                                                                                                                      | Cite `anthropic-agents` ("What are agents?")                                              |
| A loop suits tasks with unknown steps but costs more, is slower, and compounds errors; use the simplest setup that works                                                                                                       | Cite `anthropic-agents` ("When (and when not) to use agents", "Agents")                   |
| The router example: Which model answers? passes unsure questions to a bigger model                                                                                                                                             | The routing chapter's cascade                                                             |
| In depth: workflows also include parallel calls and one call checking another's work                                                                                                                                           | Cite `anthropic-agents` (parallelization, evaluator-optimizer)                            |
| Simple: restates Standard in plainer words, with no new claims                                                                                                                                                                 | Reviewed against the Standard text                                                        |
| In depth: K calls read K·p₀ + a·K(K−1)/2 tokens, growing with the square of the steps                                                                                                                                          | Arithmetic; test (within 5 tokens of the run)                                             |
| In depth: 301 + 394 + 483 = 1,178 tokens; each step added about 90                                                                                                                                                             | Test                                                                                      |
| In depth: providers reuse their work on an unchanged start of the prompt                                                                                                                                                       | Cite `openai-prompt-caching`, `anthropic-prompt-caching`                                  |
| Across 17 models, actions written as Python succeeded up to 20% more often than JSON or text actions                                                                                                                           | Cite `wang2024codeact` (abstract)                                                         |
| Code agents run model-written code in a sandbox: allowed imports only, capped loops, or a separate container                                                                                                                   | Cite `smolagents-secure`                                                                  |
| The code example is made up, labeled so in the text                                                                                                                                                                            | Labeled "made-up"                                                                         |
| Deciding what to look up: it searched for just "cat", not the whole task                                                                                                                                                       | Test                                                                                      |
| ReAct's agents used search and lookup tools over Wikipedia, reasoning between steps                                                                                                                                            | Cite `yao2023`                                                                            |
| Anthropic: multi-step search that adapts, versus fetching the most similar passages once; agents wrote overly long, specific queries, so prompts say start broad and narrow; agents searched endlessly for nonexistent sources | Cite `anthropic-multi-agent` ("Architecture overview", principle 6, "Prompt engineering") |
| In depth: a failed program's error comes back as the result, so the model can fix its code                                                                                                                                     | Cite `wang2024codeact` (abstract: revises actions on new observations, self-debugs)       |

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

## Ch 31. Splitting the work

| Claim                                                                                                                                                      | Backing                                                                         |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| Anthropic's research feature: a lead agent plans and starts subagents that explore parts of the question with their own context and pass back what matters | Cite `anthropic-multi-agent` ("Benefits", "Architecture overview")              |
| The toy's numbers: 3 subtasks × 3 tool calls: 10 calls, longest 1,110, 7,050 read alone; 14 calls, 6 in a row, longest 540, 4,260 read split               | Test (`delegation.test.ts`, `facts.test.ts`)                                    |
| The toy's prompt sizes are made up, close to the agent loop's recorded run (301 tokens, about 90 per step)                                                 | Labeled in the widget; agent loop tests                                         |
| Agents use about 4× a chat's tokens; multi-agent systems about 15×                                                                                         | Cite `anthropic-multi-agent`                                                    |
| Lead with helpers did 90.2% better than a single agent on Anthropic's research eval, especially on breadth-first questions                                 | Cite `anthropic-multi-agent`                                                    |
| Poor fit when agents share context or depend on each other, as in most coding tasks                                                                        | Cite `anthropic-multi-agent`                                                    |
| Vague task descriptions made helpers duplicate searches or leave gaps                                                                                      | Cite `anthropic-multi-agent` (principle 2)                                      |
| Each helper can have its own instructions and tools                                                                                                        | Cite `anthropic-multi-agent` ("separation of concerns—distinct tools, prompts") |
| Simple: restates Standard in plainer words, with no new claims                                                                                             | Reviewed against the Standard text                                              |
| In depth: one agent reads K·p₀ + a·K(K−1)/2 with K = Ns + 1; split reads 2p₀ + Nc + N[(s+1)h + a·s(s+1)/2]                                                 | Arithmetic; test (`delegation.test.ts`)                                         |
| In depth: on BrowseComp, token use explained 80% of score differences; tool calls and model choice most of the rest                                        | Cite `anthropic-multi-agent` (95% with all three)                               |
| In depth: the lead waits for each round of helpers, so one slow helper holds up the rest                                                                   | Cite `anthropic-multi-agent` ("Synchronous execution creates bottlenecks")      |

## Ch 32. Did it work?

Grades: Qwen2.5-1.5B-Instruct (greedy) grading each finished run's final answer, alone and with a
correct answer, in `scripts/record/grading.py`, written to `static/data/agent/grades.json`.

| Claim                                                                                                                                                    | Backing                                                                          |
| -------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| The traces are the recorded runs of the Tools, agent loop, guardrails, and harness chapters                                                              | `TEST_CASES` in `harness/evals.ts`; test                                         |
| No guardrails: 8 calls read 4,179 tokens; three deletions, a second fetch, a fourth deletion attempt; no answer                                          | Test                                                                             |
| In τ-bench, prompts were 95.9% of a GPT-4o agent's price                                                                                                 | Cite `yao2024taubench` (§5.1, cost analysis)                                     |
| Full production tracing let Anthropic diagnose why agents failed to find obvious information                                                             | Cite `anthropic-multi-agent` ("Debugging benefits from new approaches")          |
| Anthropic started with about 20 queries from real use; early changes had large effects                                                                   | Cite `anthropic-multi-agent` ("Start evaluating immediately")                    |
| Judge agents that change things by their end state, not their exact steps                                                                                | Cite `anthropic-multi-agent` (Appendix, end-state evaluation)                    |
| Code checks: answer contains the expected text (numbers without commas, whole words); all files kept                                                     | `answerCheck`, `filesKept`; test                                                 |
| Only 2 of the 7 runs pass both code checks; which runs fail which check                                                                                  | Test                                                                             |
| The grader alone passes all five answers: agrees with the code check on 2 of 5                                                                           | Test (recorded verdicts)                                                         |
| Given a correct answer: fails the wrong product with the numbers the wrong way round; still passes the unfinished sentence and the empty summary; 3 of 5 | Test; recorded replies                                                           |
| GPT-4 as judge agreed with people over 80% of the time, as often as people agree; position, verbosity, self-enhancement biases                           | Cite `zheng2023judge` (abstract)                                                 |
| Anthropic's judge: one call, a rubric (accuracy, citations, completeness, sources, tool use), pass or fail                                               | Cite `anthropic-multi-agent` ("LLM-as-judge evaluation scales")                  |
| People caught agents choosing SEO content farms over better sources                                                                                      | Cite `anthropic-multi-agent` ("Human evaluation catches what automation misses") |
| Anthropic monitors decision patterns and interaction structures without reading individual conversations                                                 | Cite `anthropic-multi-agent` ("Debugging…")                                      |
| The recordings are greedy, so reruns match                                                                                                               | `scripts/record/agent.py`, `grading.py` (`do_sample=False`)                      |
| τ-bench checks a database's end state; GPT-4o pass^1 about 61% in retail, pass^8 under 25%                                                               | Cite `yao2024taubench` (abstract, §1, Table 2)                                   |
| GAIA: 466 questions; people 92%, GPT-4 with plugins 15%                                                                                                  | Cite `mialon2023gaia` (abstract)                                                 |
| Simple: restates Standard in plainer words, with no new claims                                                                                           | Reviewed against the Standard text                                               |
| In depth: all of k tries succeed with chance pᵏ; 0.6⁸ ≈ 1.7%                                                                                             | Arithmetic; test                                                                 |
| In depth: varied task difficulty makes the measured drop gentler than pᵏ                                                                                 | Jensen's inequality (the mean of pᵏ is at least (mean p)ᵏ)                       |
| In depth: pass^k = C(c,k)/C(n,k) averaged over tasks; pass@k is at least one success                                                                     | Cite `yao2024taubench` (§3, pass^k metric)                                       |
