# Thinking before answering

**Question:** Several quirks come from answering straight away. What is a model doing when it pauses
to "think" first?

**Key idea:** A reasoning model is still a next-token predictor. It has been trained, often with
rewards for answers that can be checked, to write scratch work before its answer, and every token it
writes becomes context for the next. Writing the steps out can fix mistakes, like counting letters by
spelling the word first, but it costs many more tokens and can still go in circles or get the answer
wrong. Small reasoning models are usually distilled from big ones: DeepSeek's `R1-Distill` models,
and Qwen3-0.6B itself.

## Widgets

- `ThinkingToggle`: the same small puzzles with thinking off and on, stepping through the tokens the
  model writes before its answer, with a tally of right answers and tokens used.

## Data

Recorded by `scripts/record/reasoning.py` (`static/data/reasoning/thinking.json`): Qwen3-0.6B on six
puzzles, sampled with Qwen's recommended settings for each mode and a fixed seed.

## Decisions

- It sits in Putting it together rather than with other kinds of models: a reasoning model is the
  same transformer with more training. It opens from the quirks in
  [Quirks and limits](quirks-and-limits.md) and sets up
  [Asking for steps and structure](steps-and-structure.md).
- The small model's result is mixed (the same number right both ways, at many times the tokens, with
  some runs hitting the token limit), and the chapter says so.
