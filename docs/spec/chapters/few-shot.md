# Learning from examples in the prompt

**Question:** Instead of describing a task, could you just show the model a few examples?

**Key idea:** A few examples in the prompt can teach a model a new task with no change to its
weights: in-context learning. Attention heads that look at "what came after this token last time"
(induction heads) help copy the pattern. Bigger models learn from examples much better; small ones
often just repeat the last answer.

## Widgets

- `FewShot`: made-up tasks (opposites, and nonsense labels for animals) with 0, 1, 2, and 4
  examples, charting the probability of the right answer as examples are added.
- `InductionHead`: GPT-2's strongest induction head reaching back from the new question to the
  answers in the examples.

## Data

Recorded by `scripts/record/prompts.py` (`static/data/prompts/fewshot.json`): probabilities from
Qwen2.5-1.5B-Instruct (reading the prompt as plain text, no chat template) and GPT-2 small, and GPT-2
small's attention.

## Decisions

- The attention view is GPT-2's, since that's the model the site shows attention for. The
  probabilities show both models: Qwen learns the tasks from a few examples, while GPT-2 mostly
  repeats an example's answer.
- Live with the Large model tier ([downloads.md](../downloads.md#widgets)): `FewShot` scores the
  table with both models in the browser and adds rows for the visitor's own words;
  the live model is Qwen2.5-0.5B-Instruct, not the recording's 1.5B (see [downloads.md](../downloads.md#what-can-be-downloaded)).
- [Levels](../levels.md): Simple drops the made-up-label percentages and the model details. In depth
  multiplies token chances for two-token labels and explains the two heads behind an induction
  head, with head 5.0's attention to each answer.
