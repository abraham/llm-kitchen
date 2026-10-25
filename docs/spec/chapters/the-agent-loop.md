# The agent loop

**Question:** One tool call helps. What if a task needs several, one after another?

**Key idea:** An agent is a model called in a loop by a harness that runs its tool calls and feeds the
results back in. The loop stops when the model answers without a tool call, or at a step limit. Each
step re-sends the whole conversation, so the prompt keeps growing. An agent is one end of a range,
from workflows whose steps are fixed in code to loops where the model decides them; the simplest
setup that works is the one to use.

## Widgets

- `AgentStepper`: steps through "Find which nursery rhyme mentions a cat, and count its words":
  think, call a tool (`search_rhymes`, then `count_words`), read the result, repeat, answer. Two
  nested loops are drawn: the token loop from [Generating text](generating-text.md) inside the
  harness loop, with a step counter and the stop condition on the outer one.

## Data

Recorded by `scripts/record/agent.py` (`static/data/agent/`): Qwen2.5-1.5B-Instruct, with at most
8 model calls.

## Decisions

- The harness stops the model after its first tool call, and the system prompt asks it to use tools
  for counting. Without these rules, both small Qwen models wrote several calls at once with made-up
  arguments and guessed the word count. The chapter says the harness makes the rules.
- Qwen2.5-1.5B-Instruct rather than 0.5B, which couldn't complete the task.
- "Deciding what to look up" contrasts the one-time retrieval of
  [Managing the context](managing-the-context.md) with search as a tool the model calls with its
  own query, and can call again. It uses the recorded run's `search_rhymes("cat")` and cites ReAct
  and Anthropic's research agents rather than recording a new run.
- "Plan first, or step by step" shows a made-up plan for the same cat task in ReWOO's format
  instead of a recorded run, like "Tools as code": the recording harness runs one tool call per
  model call. The text gives ReWOO's measured savings and its failures, and Anthropic's mix of the
  two.
- "Who decides the next step" places the agent on a range (fixed chain, router, one tool call,
  loop) using Anthropic's split between workflows and agents, and points back to the chapters that
  show each one, rather than adding a widget: the site already has a widget for each kind.
- "Tools as code" shows a made-up two-line program instead of a recorded run: the recording
  harness and the toy tools take one JSON call at a time, and running model-written code in the
  browser would need a sandbox the site doesn't have. The chapter says the code must run in one.
- [Levels](../levels.md): Simple says the two loops, the range from a fixed recipe to a loop, tools
  written as code, planning first, and the harness's rules in plain words. In depth names more of
  Anthropic's workflows, says a failed program's error goes back to the model, works out what
  the loop costs (every call re-reads the conversation, so the total grows
  with the square of the steps), points ahead to caching, and gives ReWOO's HotpotQA token counts
  and plan-and-solve prompting.
