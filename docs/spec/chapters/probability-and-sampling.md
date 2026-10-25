# Probability and sampling

**Question:** The model gives probabilities, but something has to decide which word to use. How does
that choice work, and can we control it?

**Key idea:** A model outputs a probability distribution; sampling picks the actual word.
Temperature sharpens (below 1) or flattens (above 1) the distribution, and temperature 0 always picks
the top word. Top-k only allows the k most likely words.

## Widgets

- `TemperatureSampler`: temperature and top-k sliders reshape GPT-2's distribution for the running
  example (`ProbBars`), and a `SamplerWheel` with matching slices picks words.
- `TemperatureMath`: shows the arithmetic of dividing by the temperature.
- `RecordedRuns`: the same prompt continued at temperatures 0, 0.7, and 1.5 side by side.

## Data

Recorded GPT-2 small traces, including one run per temperature.

## Decisions

- The sliders use only GPT-2's top 10 tokens, rescaled to add up to 100%. The text labels this as a
  simplification.
- Log probabilities stand in for the raw scores when dividing by the temperature; adding a constant
  to every score changes nothing, so the chances are the same.
- Live with the Small model tier ([downloads.md](../downloads.md#widgets)): `RecordedRuns` runs
  the three temperatures again with GPT-2 small (8-bit), a token at a time, on the recorded prompt
  or the visitor's own. It samples among the top 50 at each step, so the text says even
  temperature 0 can differ from the recording.
- [Levels](../levels.md): Simple explains greedy picking and temperature in words and leaves out the
  raw-score widget (`TemperatureMath`). In depth gives softmax with temperature, what happens at 1
  and near 0, how the recorded runs were sampled, and nucleus sampling.
