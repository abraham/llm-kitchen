# Asking for steps and structure

**Question:** What about asking the model to work step by step, or to answer in a fixed format?

**Key idea:** Writing the working out gives each step something to build on, the same reason
reasoning models think; it helped large models a lot. Asking for a fixed format makes the reply
usable by programs, as long as you check that it was followed.

## Widgets

- `StepsTally`: the puzzles from [Thinking before answering](reasoning-models.md) asked three ways
  (just the answer, step by step, and with a fixed final line), with a tally of right answers and
  how often the format was followed.

## Data

Recorded by `scripts/build-prompts.py` (`static/prompts/steps.json`): Qwen2.5-1.5B-Instruct, greedy.

## Decisions

- Replies are graded by hand in the recording script, since they don't share a format; an automatic
  check misread several replies in testing.
- On the small model the effect is mixed (the same score each way, with different mistakes), and the
  chapter says so.
- The point that a fixed format makes output usable by programs sets up
  [Tools](tools.md), where a tool call is structured output in an agreed format.
