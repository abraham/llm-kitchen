# Meaning as position

**Question:** A token ID like 3797 is just a label. How does the model know that _cat_ is more like
_kitten_ than like _carpet_?

**Key idea:** Each token becomes a vector, a list of numbers (768 for GPT-2 small). The numbers are
learned, and tokens used in similar ways end up with similar vectors. Similar vectors are nearby
points, and some directions carry meaning, like _man_ to _woman_.

## Widgets

- `TokenToVector`: steps the running example from token chips to GPT-2's embedding vectors
  (`VectorStrip`, first 48 of 768 numbers; striped cells are negative).
- `EmbeddingMap`: a 2D map of words. The visitor picks a word (from the list or by clicking it) and
  sees its nearest neighbors, computed from the full vectors, and the "king − man + woman ≈ queen"
  analogy as an arrow. The live option embeds the visitor's own words and places them with the same
  projection.

## Data

- GPT-2 small's token and position vectors (`static/vectors/gpt2/`).
- The word map from all-MiniLM-L6-v2 (`scripts/build-embeddings.py`): 2D PCA positions, neighbors
  from the full 384-number vectors, the analogy, and the PCA basis.
- Live (T2): all-MiniLM-L6-v2 in the browser after consent (~23 MB plus ~27 MB runtime).

## Decisions

- Visitors pick words rather than drag them: moving a point in the 2D picture wouldn't change its
  real vector, so neighbors after a drag would mislead.
