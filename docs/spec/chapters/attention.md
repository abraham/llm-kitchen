# Attention

**Question:** How can a model look back at everything and decide what's relevant?

**Key idea:** Attention lets each token pull in information from any earlier token, weighted by
relevance. Each token makes a query, a key, and a value: query times key gives a score, softmax turns
the scores into weights, and the weights blend the values. A token can only look back, never ahead.
Attention alone ignores word order, so GPT-2 adds a learned position vector for each place in the
text (1,024 of them, one per place in its context window); newer models rotate queries and keys by
position instead. GPT-2 has 12 heads in each of its 12 layers; a few have clear jobs, like finding
the name that comes next, and most are harder to read.

## Widgets

- `QKVExplainer`: builds attention up in three steps: a spotlight analogy, then a grid of
  query-key scores, then a softmax-weighted mix of values (`VectorStrip`).
- `AttentionViewer`: the visitor clicks a token and sees which earlier tokens it attends to, with
  line thickness for weight (`AttentionLines`), and picks any layer and head.
- `AttentionGrid`: one head's full grid for the Mary and John sentence, a row per word looking and a
  column per word looked at, switching between the raw scores, the masked scores, and the softmax
  weights. Previous and Next page through all 144 heads; a table gives one row's numbers.

## Data

Recorded GPT-2 small attention for 5 sentences, all 144 heads (`attn-*` traces). For the Mary and
John sentence, `scripts/record/attention.py` also records every head's raw scores (query · key /
√64, every pair) to `static/data/attention/gpt2/ioi-scores.json`; the browser masks them and applies
softmax, and tests check that this gives back the recorded weights.

## Decisions

- Attention is recorded, not live: the standard GPT-2 ONNX export used by Transformers.js has no
  attention outputs. A custom export is on the [roadmap](../roadmap.md).
- The query/key/value walkthrough uses made-up small numbers, labeled as such.
- The heads the chapter names (such as 9.6 and 9.9, which find and copy the right name) follow
  Wang et al. 2022, and tests check them against the recordings.
- For the trophy sentence, GPT-2 small's attention from "it" is the same for "big" and "small" (the
  clue comes later), and the model doesn't clearly resolve the pronoun. The chapter says so rather
  than presenting a cherry-picked head as the answer.
- Word order is taught here, where the score formula makes the problem visible, rather than in
  [Meaning as position](embeddings.md). The chapter says the two kinds of "position" differ. The
  order-blindness example ("the dog chased the cat." and its swap) is prose, checked by a test on
  the toy attention code, not a widget.
- The step-by-step grid is recorded too, for one sentence only: raw scores aren't in the traces, and
  recording them for every sentence would add most of a megabyte. It is preloaded with the page
  (about 160 kB), like the traces.
- [Levels](../levels.md): Simple explains queries, keys, and values without the scoring arithmetic,
  and drops rotary positions and the Winograd score. In depth gives the attention formula with
  GPT-2's sizes, the quadratic cost of the score grid, GPT-2's position sum, the rotary angle
  formula with Llama 3's base, and why a gap in score becomes a ratio of $e^{\Delta}$ in weight.
