# Fact-check: Part VIII, Agents (Ch 28–31)

Claim checklist for the per-chapter fact-check (see [the spec](../spec/sources.md)). Tests:
each chapter's `facts.test.ts`, `src/lib/harness/agent.test.ts` (the browser's toy tools give
exactly the recorded results; the prompt segmenter loses nothing), each chapter's `chapter.e2e.ts`.

Data: real runs of Qwen2.5-1.5B-Instruct (greedy, pinned revision recorded in each file) inside the
harness in `scripts/record/agent.py`, written to `static/data/agent/`. The harness stops the model
after its first tool call, runs the tool, and calls the model again, up to 8 calls.

## Ch 28. Tools

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

## Ch 29. The agent loop

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

## Ch 30. Designing an agent

The comparison widget is computed from made-up sizes (`src/lib/harness/designs.ts`), within 10 tokens of the Ch 29 run.

| Claim                                                                                                                                                                                                                          | Backing                                                                                   |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------- |
| Workflows fix the path in code; agents let the model direct its own steps                                                                                                                                                      | Cite `anthropic-agents` ("What are agents?")                                              |
| A loop suits tasks with unknown steps but costs more, is slower, and compounds errors; use the simplest setup that works                                                                                                       | Cite `anthropic-agents` ("When (and when not) to use agents", "Agents")                   |
| The router example: Which model answers? passes unsure questions to a bigger model                                                                                                                                             | The routing chapter's cascade                                                             |
| In depth: workflows also include parallel calls and one call checking another's work                                                                                                                                           | Cite `anthropic-agents` (parallelization, evaluator-optimizer)                            |
| Across 17 models, actions written as Python succeeded up to 20% more often than JSON or text actions                                                                                                                           | Cite `wang2024codeact` (abstract)                                                         |
| Code agents run model-written code in a sandbox: allowed imports only, capped loops, or a separate container                                                                                                                   | Cite `smolagents-secure`                                                                  |
| The code example is made up, labeled so in the text                                                                                                                                                                            | Labeled "made-up"                                                                         |
| Deciding what to look up: it searched for just "cat", not the whole task                                                                                                                                                       | Test                                                                                      |
| ReAct's agents used search and lookup tools over Wikipedia, reasoning between steps                                                                                                                                            | Cite `yao2023`                                                                            |
| Anthropic: multi-step search that adapts, versus fetching the most similar passages once; agents wrote overly long, specific queries, so prompts say start broad and narrow; agents searched endlessly for nonexistent sources | Cite `anthropic-multi-agent` ("Architecture overview", principle 6, "Prompt engineering") |
| Plan first: a planner writes every tool call with placeholders (#E1) for earlier results; a final call answers; the example plan is made up                                                                                    | Cite `xu2023rewoo` (§2.1, Appendix B.2); labeled "made up"                                |
| ReWOO used 64% fewer tokens and was 4.4 points more accurate than ReAct, averaged over six public benchmarks, same tools                                                                                                       | Cite `xu2023rewoo` (§3.2)                                                                 |
| Plans rested on wrong expectations (a person's age in search results); an unknown room (AlfWorld) would need a plan for every possibility                                                                                      | Cite `xu2023rewoo` (Appendix A.2, §4)                                                     |
| Anthropic's lead agent saves its plan outside the prompt in case the context is truncated, and decides after each round whether to do more or refine its strategy                                                              | Cite `anthropic-multi-agent` ("Architecture overview")                                    |
| In depth: HotpotQA, ReAct 9,795 tokens per question, ReWOO 1,986                                                                                                                                                               | Cite `xu2023rewoo` (Table 2)                                                              |
| In depth: plan-and-solve prompting raised GPT-3 (text-davinci-003) on GSM8K from 56.4% ("Let's think step by step") to 58.2%                                                                                                   | Cite `wang2023plansolve` (Table 5)                                                        |
| In depth: a failed program's error comes back as the result, so the model can fix its code                                                                                                                                     | Cite `wang2024codeact` (abstract: revises actions on new observations, self-debugs)       |
| Two tool calls: step by step 3 calls, 1,170 tokens; code 2 and 660; plan 2 and 780. Six: 3,990, 660, 1,140                                                                                                                     | Test (`designs.test.ts`, `facts.test.ts`)                                                 |
| Simple: restates Standard in plainer words, with no new claims                                                                                                                                                                 | Reviewed against the Standard text                                                        |

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
