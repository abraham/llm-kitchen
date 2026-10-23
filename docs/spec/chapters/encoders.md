# Reading both ways

**Question:** GPT-2 is one kind of model. What other kinds are built from the same pieces? First:
what if the blank is in the middle of the sentence?

**Key idea:** GPT-2 is a decoder: each token sees only earlier tokens, which is what lets it write
left to right. An encoder like BERT lets every token see every other one, so it can use the words on
both sides of a blank. Encoders are used for understanding (search, classification, and
embeddings, like the model in [Meaning as position](embeddings.md)) and can't generate text one
token at a time.

## Widgets

- `FillTheBlank`: fill in sentences such as "The cat sat on the ___ of the fridge" with BERT and with
  GPT-2, which can only use the words before the blank (`ProbBars`).
- `AttentionMask`: toggle the mask between "earlier tokens only" and "every token"; the triangle
  fills in to a full square, and the blank can see the clue after it.

## Data

Recorded by `scripts/build-encoder.py` (`static/encoders/fill-mask.json`): BERT base (uncased) and
GPT-2 small.

## Decisions

- Recorded only; a live fill-mask model is on the [roadmap](../roadmap.md).
- Each chapter in this Part starts from what changed compared with GPT-2 and reuses earlier widgets
  and visuals.
