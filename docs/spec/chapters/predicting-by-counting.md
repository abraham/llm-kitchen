# Predicting by counting

**Question:** What's the simplest way a program could make the same guess as in
[The guessing game](guessing-game.md)?

**Key idea:** Prediction means answering "what usually comes next?". A bigram model answers it by
counting which word follows which and turning the counts into probabilities. It only looks one word
back, so its output is locally plausible but wanders.

## Widgets

- `BigramBuilder`: a count table fills in as a cursor moves through a few nursery rhymes, the counts
  turn into probability bars (`ProbBars`), and "generate" produces text that only ever uses word pairs
  it has seen.

## Data

Computed in the browser from the rhymes in `src/lib/data/rhymes.ts`. The same rhymes are reused by
the tiny trainers in [Learning from mistakes](learning-from-mistakes.md) and
[Remembering without attention](recurrent-models.md), and by the agent's search tool in the
Tools and agents chapters.

## Decisions

- The rhymes are traditional and in the public domain; their wording varies between sources, which
  the data file notes.
- [Levels](../levels.md): Simple turns counts into chances without Shannon's history. In depth
  gives the counting rule as a formula, add-one smoothing for unseen pairs, and why count tables
  can't scale to a real vocabulary.
