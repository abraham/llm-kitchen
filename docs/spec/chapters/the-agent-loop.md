# The agent loop

**Question:** One tool call helps. What if a task needs several, one after another?

**Key idea:** An agent is a model called in a loop by a harness that runs its tool calls and feeds the
results back in. The loop stops when the model answers without a tool call, or at a step limit. Each
step re-sends the whole conversation, so the prompt keeps growing.

## Widgets

- `AgentStepper`: steps through "Find which nursery rhyme mentions a cat, and count its words":
  think, call a tool (`search_rhymes`, then `count_words`), read the result, repeat, answer. Two
  nested loops are drawn: the token loop from [Generating text](generating-text.md) inside the
  harness loop, with a step counter and the stop condition on the outer one.

## Data

Recorded by `scripts/build-agent-traces.py` (`static/agent/`): Qwen2.5-1.5B-Instruct, with at most
8 model calls.

## Decisions

- The harness stops the model after its first tool call, and the system prompt asks it to use tools
  for counting. Without these rules, both small Qwen models wrote several calls at once with made-up
  arguments and guessed the word count. The chapter says the harness makes the rules.
- Qwen2.5-1.5B-Instruct rather than 0.5B, which couldn't complete the task.
