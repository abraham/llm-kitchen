# Guessing ahead

**Question:** Smaller numbers make a model cheaper to store and read. Could it also write faster,
without changing a single word?

**Key idea:** A big model spends most of each pass reading its weights, and one pass predicts the
next token after every position, so it can check many tokens at once. In speculative decoding, a
small model guesses a few tokens and the big model checks them all in one pass, keeping the ones it
agrees with and adding its own. Each pass adds at least one token, and the text is exactly what the
big model would write alone. With sampling, an accept-or-resample rule keeps the big model's
probabilities exactly.

## Widgets

- `SpeculativeStepper`: steps through GPT-2 small guessing four tokens at a time for GPT-2 medium,
  showing each guess and the big model's replacement as clickable diff buttons (kept, wrong,
  dropped, or added) with a verdict detail strip and live status readout explaining why each token
  was kept or discarded. A counter compares the big model's passes with and without the drafter.

## Data

Recorded by `scripts/record/speculative.py` (`static/data/speculative/gpt2/drafts.json`): greedy, on four prompts
with easy and hard stretches. The script checks that the result equals GPT-2 medium's own greedy
output.

## Decisions

- The drafter is GPT-2 small, already used across the site, rather than DistilGPT-2. Both share
  GPT-2's tokenizer.
- Simplified: real systems also tune how far ahead to guess. Gemma 4's `-assistant` drafters are
  mentioned as a real example, citing their model cards.
- When it doesn't pay: smolmaxxing (a hobby project, cited with an accessed date) measured the same
  trick both ways on one TV box, slower for an in-memory 2B on a processor limited by arithmetic and
  69% faster for a 9B read from flash, so the text shows the chapter's premise has limits. Prose
  only; the measured rates are constants in the facts test.
- [Levels](../levels.md): Simple explains guess-then-check and the 7 passes without the sampling
  rule. In depth gives the accept-or-resample rule and the expected tokens per pass, next to the
  recorded run's average, and works out what a checking pass cost on the TV box.
