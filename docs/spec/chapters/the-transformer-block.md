# The transformer block

**Question:** Attention moves information between tokens. How does it fit into a whole model?

**Key idea:** A transformer block is attention plus an MLP, each added onto the residual stream,
with layer norm before each. GPT-2 small stacks 12 blocks, and most of its weights are in the MLPs and
the token table, not in attention. Each block makes a small change; reading the stream partway
through shows the guess forming.

## Widgets

- `BlockBuilder`: assembles GPT-2 small piece by piece (embeddings plus positions, attention, the
  MLP, the residual connections, and normalization), then stacks the block, with weight counts from
  `models/canonical.json`.
- `ResidualStream`: the vector for the last "the" in the running example, block by block
  (`VectorStrip`), with the logit lens showing the model's top guesses if it stopped at each block.

## Data

Recorded GPT-2 small per-layer vectors and logit-lens guesses (`static/data/vectors/gpt2/`).

## Decisions

- The residual view shows top guesses per block rather than the size of each block's change. The
  change sizes are dominated by a few very large numbers in GPT-2's stream, and the last row includes
  the final layer norm, so they would mislead. The vector strips use a 95th-percentile color scale
  for the same reason.
- [Levels](../levels.md): Simple describes the highway and layer norm in a paragraph and the logit
  lens in plain words. In depth writes a block and layer norm as formulas (and how GPT-2's order
  differs from the original transformer's), adds up GPT-2's weights exactly, and gives the logit
  lens formula.
