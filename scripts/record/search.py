"""Record question embeddings and reranker scores for the search in `search-and-memory` (tier T0).

Usage:
    scripts/.venv/bin/python -m scripts.record run search

Embeds a few questions about the recorded long chat (static/data/agent/context.json) with the
same MiniLM model and pooling that recorded the chat's exchanges, scores every exchange against
each question with a cross-encoder reranker that reads the two together, and writes
static/data/agent/search.json. The browser ranks the exchanges by keywords (BM25), by cosine
similarity from these vectors, merged by rank, and reranks the merged list's top few by these scores.
"""

from __future__ import annotations

import datetime

from . import runtime
from .agent import EMBEDDER, MINILM, embed
from .common import read_dataset, revision
from .runtime import ModelSpec, Run, job

RERANKER = ModelSpec("cross-encoder/ms-marco-MiniLM-L6-v2", "ms-marco-MiniLM-L6-v2", kind="reranker")

# (question, index of the exchange it is about)
QUESTIONS = [
    ("Which child in my class loves the rhyme about the cat?", 0),
    ("Which one is about a kitty?", 0),
    ("What did I tell you about Sam?", 3),
    ("Which rhyme mentions a crown?", 2),
    ("Which rhyme does Leo love?", 5),
]


@job("agent/search", models=[MINILM, RERANKER], needs=["agent/chat"])
def search(run: Run) -> dict:
    context = read_dataset("agent/context")
    if context["embedder"]["revision"] != revision(EMBEDDER):
        raise SystemExit("agent/context was embedded with another MiniLM revision; re-record agent first")
    texts = [t["text"] for t in context["turns"]]
    vectors = embed([q for q, _ in QUESTIONS])
    return {
        "version": 1,
        "embedder": {"id": EMBEDDER, "revision": revision(EMBEDDER)},
        "reranker": run.info(RERANKER),
        "questions": [
            {
                "question": q,
                "about": about,
                "vector": [round(x, 5) for x in vectors[i].tolist()],
                "rerank": [round(x, 4) for x in runtime.rerank(RERANKER, q, texts)],
            }
            for i, (q, about) in enumerate(QUESTIONS)
        ],
        "generatedAt": datetime.date.today().isoformat(),
    }
