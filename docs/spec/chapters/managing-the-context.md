# Managing the context

**Question:** If the prompt grows with every step, what happens when it gets too big?

**Key idea:** The model only knows what's in its prompt, and the prompt has a limit (the context
window). When it fills up, the harness drops, summarizes, or retrieves text. Whatever is left out is
gone for the model, and it may fill the gap by making things up.

## Widgets

- `ContextBudget`: a budget bar fills as an agent keeps working through several tasks. When it
  overflows, the visitor picks a strategy (drop the oldest turns, summarize them, or retrieve only
  relevant ones) and sees what the model answers. Retrieval reuses the embedding map from
  [Meaning as position](embeddings.md): the question becomes a point and the nearest chunks light
  up.

## Data

Recorded by `scripts/build-agent-traces.py` (`static/agent/context.json`), with retrieval over the
MiniLM map (`static/embeddings/`).

## Decisions

- The budget (1,500 tokens) is deliberately small so it overflows in a few tasks; the text says the
  model can read far more.
- Failures are kept as real examples: after dropping the oldest turns, the model made up "Old Mother
  Hubbard".
