# Splitting the work

**Question:** One agent does every step in one prompt that keeps growing. What if it handed parts
of the job to other agents?

**Key idea:** A lead agent can split a job and hand each part to a subagent: a helper that is an
agent loop of its own, starts with a fresh prompt holding only its task, and reports back a short
summary. No prompt has to hold every result, and helpers can run at the same time. Real systems
spend many more tokens this way, which pays off on broad jobs that split into independent parts and
less on tightly linked ones like most coding.

## Widgets

- `SplitTheWork`: sliders for the number of subtasks and tool calls per subtask. Two column charts
  on one scale show every model call's prompt size: one agent's prompts grow with every tool result;
  the lead's two calls and each helper's fresh loop stay small. A table compares model calls, calls
  that wait for the one before (helpers run at the same time), the longest prompt, and tokens read
  in all.

## Data

Computed in the browser from made-up prompt sizes (`src/lib/harness/delegation.ts`), close to the
recorded run in [The agent loop](the-agent-loop.md): 300 tokens to start, 90 per tool result, 150
for a helper's first prompt, and 80 for the lead per subtask.

## Decisions

- The widget is a made-up example, not a recorded run: a small local model splitting a job and
  delegating reliably would need a model much larger than the site's. The badge says "Made-up
  example", and the text gives the real costs from Anthropic's research system.
- The toy keeps the work the same either way, so splitting reads fewer tokens there. The text says
  real systems spend far more, because their helpers search more widely.
- The chapter ends Tools and agents because it builds on the loop, on managing the context, and on
  guardrails: each helper can have its own instructions and tools.
- [Levels](../levels.md): Simple keeps the lead, the helpers, the 15× cost, and when splitting fits,
  without the 4× and 90.2% figures. In depth works out the tokens read with and without splitting,
  BrowseComp's link between tokens spent and score, and why a lead that waits for each round of
  helpers can be held up by the slowest.
