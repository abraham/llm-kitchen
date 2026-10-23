# Quirks and limits

**Question:** Even tuned assistants sometimes make things up or trip over simple questions. Why?

**Key idea:** Models produce likely text, not checked facts, so they can confidently make things up.
They know nothing after their training cutoff unless told. They read tokens, not letters or digits,
which makes spelling and arithmetic hard. Small changes in wording can change the answer, and
anything outside the context window is forgotten.

## Widgets

- `GlassBoxGenerator` as a "quirks lab", with recorded presets: made-up facts (the first person on
  the moon, a painter who doesn't exist), an out-of-date answer (the latest iPhone), arithmetic
  (2 + 2), wording (the capital of France, as a sentence and as Q/A), and a repetition loop. The
  visitor can switch to live GPT-2 to run their own experiments.
- `SpellingBlindSpot`: how words like "strawberry" split into tokens (`TokenChip`).

## Data

Recorded GPT-2 small traces (`quirk-*`); live GPT-2 (T2) and the GPT-2 tokenizer (T1).
