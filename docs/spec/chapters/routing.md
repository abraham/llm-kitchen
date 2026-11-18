# Which model answers?

**Question:** So far one model has answered everything. Apps often have several, cheap and
expensive. Who decides which one answers?

**Key idea:** The harness does. A router picks a model before anything is answered; a cascade asks
the cheap model first and passes a question on only when the answer looks unsure. The model's own
confidence, read from the probabilities of its answer tokens, is the usual signal. It is a useful
hint, not a guarantee: a model can be sure and wrong, or unsure and right, so the threshold trades
cost against accuracy. Confidence is only as good as the model's calibration, which has to be
checked for each model and version, and the line goes where the costlier mistake is rarer.

## Widgets

- `RoutingCascade`: forty short questions answered by a small and a big model. A slider sets the
  confidence below which the small model's answer is passed on. A dot plot shows every small answer
  by confidence, right or wrong, with the threshold line; readouts show how many were passed on, how
  many final answers are right, and the cost against always asking the big model. A table lists each
  question with both answers.
- `CalibrationChart`: one model's 40 answers (small or big, chosen by radio) grouped into four
  confidence bands (below 40%, 40–60%, 60–80%, 80% or more). Each row shows how many answers fall
  in it, a bar for their mean confidence and one for the share that were right; a status line names
  the band with the biggest gap. Computed in the browser (`calibration` in
  `src/lib/harness/routing.ts`) from the same recording.

## Data

Recorded by `scripts/record/routing.py` (`static/data/routing/cascade.json`): Qwen2.5-0.5B-Instruct
and Qwen2.5-1.5B-Instruct, greedy, on 40 questions (arithmetic, capitals, general knowledge), with
each answer graded by code and its confidence (the geometric mean of its tokens' probabilities). The
cascade is replayed in the browser (`src/lib/harness/routing.ts`).

## Decisions

- Two sizes of the same family, so the only difference is size; cost is proportional to the number
  of weights, an illustrative simplification the text labels (real prices are per token and set by
  providers).
- The question set mixes easy and hard questions so the small model is right about two thirds of
  the time; confident wrong answers (Sydney) and unsure right ones (Ankara) are kept as real
  examples.
- Routers trained on preference data are described and cited (RouteLLM), not demonstrated.
- Calibration uses the same 40 answers, so the bands are small (5 to 36 answers), and the text
  says to read them as a warning rather than a measurement. Four fixed bands keep every row big
  enough to mean something; the big model's two empty bands are shown as empty.
- Where to put the line by the cost of each mistake, and thresholds moving between model
  versions, come from PostHog's production report (low 0.4 for a personal-details check, high 0.85
  for a bot that speaks unasked), cited rather than demonstrated.
- [Levels](../levels.md): Simple keeps the cascade, one threshold, and the calibration bands
  without averages. In depth defines the confidence score, works out the cost formula, and gives the
  expected calibration error with temperature scaling as the usual fix.
