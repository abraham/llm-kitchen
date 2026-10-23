# Attention

**Question:** How can a model look back at everything and decide what's relevant?

**Key idea:** Attention lets each token pull in information from any earlier token, weighted by
relevance. Each token makes a query, a key, and a value: query times key gives a score, softmax turns
the scores into weights, and the weights blend the values. A token can only look back, never ahead.
GPT-2 has 12 heads in each of its 12 layers; a few have clear jobs, like finding the name that comes
next, and most are harder to read.

## Widgets

- `QKVExplainer`: builds attention up in three steps: a spotlight analogy, then a grid of
  query-key scores, then a softmax-weighted mix of values (`VectorStrip`).
- `AttentionViewer`: the visitor clicks a token and sees which earlier tokens it attends to, with
  line thickness for weight (`AttentionLines`), and picks any layer and head.

## Data

Recorded GPT-2 small attention for 5 sentences, all 144 heads (`attn-*` traces).

## Decisions

- Attention is recorded, not live: the standard GPT-2 ONNX export used by Transformers.js has no
  attention outputs. A custom export is on the [roadmap](../roadmap.md).
- The query/key/value walkthrough uses made-up small numbers, labeled as such.
- The heads the chapter names (such as 9.6 and 9.9, which find and copy the right name) follow
  Wang et al. 2022, and tests check them against the recordings.
- For the trophy sentence, GPT-2 small's attention from "it" is the same for "big" and "small" (the
  clue comes later), and the model doesn't clearly resolve the pronoun. The chapter says so rather
  than presenting a cherry-picked head as the answer.
