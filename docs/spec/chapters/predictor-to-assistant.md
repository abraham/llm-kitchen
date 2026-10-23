# From predictor to assistant

**Question:** Bigger, smaller, or faster, a base model is still just continuing text. How does it
become an assistant that answers questions?

**Key idea:** A chat is written out as one text in a chat template, and the model continues it. A
base model just continues text; tuning teaches it to answer in the chat format and stop. Tuning
usually has two stages after pretraining: learning from example answers, then from people's
preferences between answers.

## Widgets

- `ChatTemplate`: a conversation and the exact text it becomes, with the template's marker tokens
  and system slot.
- `BaseVsInstruct`: the same prompts given to a base model, to its instruct version without the chat
  template, and to the instruct version in its chat format, plus GPT-2.
- `TrainingStages`: pretraining (web text) → instruction tuning (example conversations) → preference
  tuning (comparisons between answers).

## Data

Recorded by `scripts/build-chat.py` (`static/chat/base-vs-instruct.json`): Qwen2.5-0.5B and
Qwen2.5-0.5B-Instruct, greedy.

## Decisions

- The comparison is recorded; a live chat model is on the [roadmap](../roadmap.md).
- The training stages are a simplification of real pipelines, labeled as such.
- The chat template's system slot introduced here is what
  [Instructions, roles, and the system prompt](instructions-and-roles.md) builds on.
