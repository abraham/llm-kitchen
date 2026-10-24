# Managing the context

**Question:** The harness re-sends the whole conversation on every call. What happens when it gets
too long to fit?

**Key idea:** The model only knows what's in its prompt, and the prompt has a limit (the context
window). When it fills up, the harness drops, summarizes, or retrieves text. Whatever is left out is
gone for the model, and it may fill the gap by making things up.

## Widgets

- `ContextBudget`: a budget bar fills as a chat goes on: six nursery rhymes, each loved by a
  different child in the visitor's class, then a question about the first one. When it overflows, the visitor picks a strategy (drop the oldest turns, summarize them, or retrieve only
  relevant ones) and sees what the model answers. Retrieval reuses the embedding map from
  [Meaning as position](embeddings.md): the question becomes a point and the nearest chunks light
  up.

## Data

Recorded by `scripts/record/agent.py` (`static/data/agent/context.json`), with retrieval over the
MiniLM map (`static/data/embeddings/`).

## Decisions

- The session is a long chat, not an agent run, so the chapter needs only
  [The model is not the product](the-model-is-not-the-product.md), and Tools come later.
- The budget (600 tokens) is deliberately small so it overflows in a few turns; the text says the
  model can read far more.
- Failures are kept as real examples: after dropping the oldest turns, the model said it couldn't
  tell; the summary repeated a mistake from the model's first reply.
- [Levels](../levels.md): Simple keeps the three strategies and their outcomes. In depth shows the
  cosine scores behind retrieval and the size of the summary.
