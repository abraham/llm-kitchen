"""Record question embeddings for the word-versus-meaning search in `managing-the-context` (tier T0).

Usage:
    scripts/.venv/bin/python -m scripts.record search

Embeds a few questions about the recorded long chat (static/data/agent/context.json) with the
same MiniLM model and pooling that recorded the chat's exchanges, and writes
static/data/agent/search.json. The browser ranks the exchanges by keywords (BM25) and by cosine
similarity from these vectors.
"""

from __future__ import annotations

import datetime

from .agent import EMBEDDER, embed
from .common import read_dataset, revision, write_dataset

# (question, index of the exchange it is about)
QUESTIONS = [
    ("Which child in my class loves the rhyme about the cat?", 0),
    ("Which one is about a kitty?", 0),
    ("What did I tell you about Sam?", 3),
    ("Which rhyme mentions a crown?", 2),
    ("Which rhyme does Leo love?", 5),
]


def main() -> None:
    context = read_dataset("agent/context")
    if context["embedder"]["revision"] != revision(EMBEDDER):
        raise SystemExit("agent/context was embedded with another MiniLM revision; re-record agent first")
    vectors = embed([q for q, _ in QUESTIONS])
    write_dataset("agent/search", {
        "version": 1,
        "embedder": {"id": EMBEDDER, "revision": revision(EMBEDDER)},
        "questions": [
            {"question": q, "about": about, "vector": [round(x, 5) for x in vectors[i].tolist()]}
            for i, (q, about) in enumerate(QUESTIONS)
        ],
        "generatedAt": datetime.date.today().isoformat(),
    }, "search")


if __name__ == "__main__":
    main()
