# The context problem

**Question:** Our tiny model only sees 3 characters back, and the bigram model only saw one word.
How much text does a model need to look at to predict well?

**Key idea:** Understanding a word often needs words from much earlier in the text ("The trophy
didn't fit in the suitcase because **it** was too big"). Counting tables can't grow to cover long
contexts, because almost every long combination is unseen, and a fixed window has a hard edge and
treats each position separately. Models need a way to pick out the relevant earlier words, wherever
they are, within a context window (1,024 tokens for GPT-2).

## Widgets

- `ContextWindow`: a fixed-size window slides over the text and misses the clue word.

## Data

Computed in the browser; the context length comes from `models/canonical.json`.

## Decisions

- [Levels](../levels.md): Simple drops the Winograd history and folds the counting and fixed-window
  problems into one paragraph. In depth writes the fixed-window layer as a formula (each slot with
  its own weights, as in the tiny model) and works out how much more attention a 128,000-token window
  needs than GPT-2's.
