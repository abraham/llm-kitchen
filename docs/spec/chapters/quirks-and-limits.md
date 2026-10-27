# Quirks and limits

**Question:** Even tuned assistants sometimes make things up or trip over simple questions. Why?

**Key idea:** Models produce likely text, not checked facts, so they can confidently make things up.
They know nothing after their training cutoff unless told. They read tokens, not letters or digits,
which makes spelling and arithmetic hard. Tuned assistants tend to agree with the user, even
dropping a right answer when told "Are you sure?". Small changes in wording can change the answer, and
anything outside the context window is forgotten.

## Widgets

- `GlassBoxGenerator` as a "quirks lab", with recorded presets: made-up facts (the first person on
  the moon, a painter who doesn't exist), an out-of-date answer (the latest iPhone), arithmetic
  (2 + 2), wording (the capital of France, as a sentence and as Q/A), a repetition loop, and learned
  stereotypes ("The nurse said that", "The engineer said that"). The
  visitor can switch to live GPT-2 to run their own experiments.
- `SpellingBlindSpot`: how words like "strawberry" split into tokens (`TokenChip`).
- `PushbackLab`: 24 easy questions Qwen answers right, then the user's "I don't think that's right.
  Are you sure?" (10 still right, 11 switched to a wrong answer, 3 mixed), or a wrong guess in the
  question (23 right). Shows the scores and one chosen conversation with its grade.

## Data

Recorded GPT-2 small traces (`quirk-*`); live GPT-2 (T2) and the GPT-2 tokenizer (T1).
`static/data/prompts/pushback.json` (the `pushback` job in `scripts/record/prompts.py`):
Qwen2.5-1.5B-Instruct, greedy, with the pushback replies graded by hand.

## Decisions

- Sycophancy uses Qwen2.5-1.5B-Instruct, not GPT-2: it comes from tuning on people's ratings, so it
  needs a tuned chat model. The questions are easy ones the model gets right, so every switch is a
  right answer given up. A wrong guess in the question barely moved this model, and the text says so.
- [Levels](../levels.md): Simple keeps each quirk's example and drops the percentages and studies.
  In depth explains why the loss rewards likely rather than true text, the two kinds of
  hallucination, and how GPT-2 and GPT-4 split numbers into tokens.
