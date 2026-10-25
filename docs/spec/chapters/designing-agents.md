# Designing an agent

**Question:** Here the model chose every step. Is a loop like this always the best way to build an
agent?

**Key idea:** An agent is one end of a range, from workflows whose steps are fixed in code to loops
where the model decides them; the simplest setup that works is the one to use. Inside an agent,
search is a tool the model aims itself. A model can also write its steps as a program, or plan them
all first: fewer model calls and tokens, but less chance to react to each result, and a program
has to run in a sandbox.

## Widgets

- `DesignCompare`: a slider sets how many tool calls a task needs (1 to 6). Bars and a table compare
  step by step, tools as code, and plan first: model calls, tokens read in all, whether the model
  sees each result before the next step, and whether the harness runs code the model wrote.

## Data

Computed in the browser from made-up prompt sizes (`src/lib/harness/designs.ts`), close to the
recorded run in [The agent loop](the-agent-loop.md): 300 tokens to start, 90 per tool result, and
60 for a program and what it prints. A test keeps them within 10 tokens of the recording.

## Decisions

- Split from [The agent loop](the-agent-loop.md), which had grown to six sections, so each chapter
  has one key idea and one main widget.
- The widget is a made-up example, not a recording: the recording harness runs one JSON tool call
  per model call, and running model-written code in the browser would need a sandbox the site
  doesn't have. The badge says "Made-up example"; the text gives ReWOO's and CodeAct's measured
  results.
- "Who decides the next step" places the agent on a range (fixed chain, router, one tool call,
  loop) using Anthropic's split between workflows and agents, and points back to the chapters that
  show each one.
- "Deciding what to look up" contrasts the one-time retrieval of
  [Managing the context](managing-the-context.md) with search as a tool the model calls with its
  own query, using the recorded run's `search_rhymes("cat")`, and cites ReAct and Anthropic's
  research agents.
- "Tools as code" and "Plan first" show made-up examples for the same cat task, labeled as such.
- [Levels](../levels.md): Simple keeps the range, search as a tool, tools as code, and planning
  first in plain words. In depth names more of Anthropic's workflows, says a failed program's error
  goes back to the model, and gives ReWOO's HotpotQA token counts and plan-and-solve prompting.
