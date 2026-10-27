"""Pre-compute the `embeddings` embedding map with all-MiniLM-L6-v2 (the model the live option runs).

Usage: scripts/.venv/bin/python -m scripts.record run embeddings

Writes:
  static/data/embeddings/minilm-map.json      words, 3D PCA positions, nearest neighbors (full 384-D),
                                         the analogy result, and the PCA basis for live words
  static/data/embeddings/minilm-vectors.json  the full vectors, only fetched by the live option
"""

from __future__ import annotations

import datetime

import torch

from . import runtime
from .common import EMBEDDER, revision
from .runtime import ModelSpec, Run, job

MINILM = ModelSpec(EMBEDDER["huggingFaceId"], EMBEDDER["displayName"], kind="encoder")
MODEL = MINILM.id

GROUPS = {
    "animals": ["cat", "kitten", "dog", "puppy", "cow", "horse", "mouse", "lion", "tiger", "fish", "bird"],
    "furniture": ["mat", "floor", "bed", "couch", "sofa", "chair", "table", "bench", "rug"],
    "people": ["king", "queen", "man", "woman", "prince", "princess", "boy", "girl", "mother", "father"],
    "food": ["apple", "banana", "bread", "cheese", "pizza", "cake", "milk"],
    "places": ["paris", "france", "london", "england", "rome", "italy", "berlin", "germany"],
    "weather": ["rain", "snow", "sun", "cloud", "wind"],
    "numbers": ["one", "two", "three", "four", "ten"],
    "colors": ["red", "blue", "green", "yellow"],
    "actions": ["run", "walk", "jump", "sit", "sleep", "eat"],
    "technology": ["computer", "phone", "keyboard", "screen"],
}


def nearest(query: torch.Tensor, vectors: torch.Tensor, words: list[str], exclude: set[str], k: int):
    sims = vectors @ query
    order = torch.argsort(sims, descending=True).tolist()
    return [(words[i], round(float(sims[i]), 4)) for i in order if words[i] not in exclude][:k]


@job("embeddings/minilm-map", "embeddings/minilm-vectors", models=[MINILM], compact=True)
def minilm(run: Run) -> None:
    model_revision = revision(MODEL)

    words = [w for group in GROUPS.values() for w in group]
    group_of = {w: g for g, ws in GROUPS.items() for w in ws}
    # Mean-pooled, L2-normalized sentence embeddings (the model card's recipe).
    vectors = torch.tensor(runtime.embed(MINILM, words))

    mean = vectors.mean(0)
    centered = vectors - mean
    _, _, v = torch.linalg.svd(centered, full_matrices=False)
    components = v[:3]
    coords = centered @ components.T
    explained = (torch.linalg.svdvals(centered) ** 2)
    explained = (explained[:3] / explained.sum()).tolist()

    target = vectors[words.index("king")] - vectors[words.index("man")] + vectors[words.index("woman")]
    target = torch.nn.functional.normalize(target, dim=0)
    analogy = nearest(target, vectors, words, {"king", "man", "woman"}, 3)

    data = {
        "model": MODEL,
        "revision": model_revision,
        "generatedAt": datetime.date.today().isoformat(),
        "dimensions": vectors.shape[1],
        "explainedVariance": [round(e, 4) for e in explained],
        "words": [
            {
                "word": w,
                "group": group_of[w],
                "x": round(float(coords[i, 0]), 4),
                "y": round(float(coords[i, 1]), 4),
                "z": round(float(coords[i, 2]), 4),
                "neighbors": [
                    {"word": n, "similarity": s}
                    for n, s in nearest(vectors[i], vectors, words, {w}, 5)
                ],
            }
            for i, w in enumerate(words)
        ],
        "analogy": {
            "expression": "king - man + woman",
            "nearest": [{"word": n, "similarity": s} for n, s in analogy],
        },
        "pca": {
            "mean": [round(float(x), 6) for x in mean],
            "components": [[round(float(x), 6) for x in row] for row in components],
        },
    }
    run.write("embeddings/minilm-map", data)
    run.write(
        "embeddings/minilm-vectors",
        {
            "model": MODEL,
            "revision": model_revision,
            "words": words,
            "vectors": [[round(float(x), 5) for x in row] for row in vectors],
        },
    )
    run.log(f"analogy: {analogy}")
    run.log(f"explained variance (3D): {explained}")
    run.log(f"cat neighbors: {data['words'][0]['neighbors']}")
