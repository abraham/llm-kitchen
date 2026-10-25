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

- `SearchCompare`: pick one of five questions about the same chat. Three ranked lists show the six
  exchanges by keyword score (BM25, computed in the browser), by cosine similarity of MiniLM
  vectors, and merged by reciprocal rank fusion, with the exchange the question is about marked.

## Data

Recorded by `scripts/record/agent.py` (`static/data/agent/context.json`), with retrieval over the
MiniLM map (`static/data/embeddings/`). The search questions' vectors are recorded by
`scripts/record/search.py` (`static/data/agent/search.json`) with the same MiniLM revision; the
rankings are computed in `src/lib/harness/search.ts`.

## Decisions

- The session is a long chat, not an agent run, so the chapter needs only
  [The model is not the product](the-model-is-not-the-product.md), and Tools come later.
- The budget (600 tokens) is deliberately small so it overflows in a few turns; the text says the
  model can read far more.
- Failures are kept as real examples: after dropping the oldest turns, the model said it couldn't
  tell; the summary repeated a mistake from the model's first reply.
- The search questions were chosen to show each method failing: "kitty" shares no word with any
  exchange, names and "crown" defeat MiniLM, and Leo's question defeats the merged list too. The
  text reports all five outcomes.
- Search by the agent itself (choosing when and what to search) is in
  [The agent loop](the-agent-loop.md), since it needs tools.
- [Levels](../levels.md): Simple keeps the three strategies and their outcomes, and the search
  results without BM25's details or the Anthropic figures. In depth shows the cosine scores behind
  retrieval, the size of the summary, the BM25 formula, and reciprocal rank fusion with Leo's
  scores.
