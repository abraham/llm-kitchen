# Tokens: the model's alphabet

**Question:** Now the text is numbers, one per character. But GPT-2 doesn't read single letters, or
whole words either. So what does it actually read?

**Key idea:** Models read tokens: chunks of text between single characters and whole words, each
with an ID. Byte pair encoding builds the vocabulary by repeatedly merging the most common pair, so
frequent words become one token and rare words are split into pieces. The model doesn't see the
letters inside a token.

## Widgets

- `LiveTokenizer`: the visitor types or pastes text and sees it split into colored token chips with
  IDs (`TokenChip`) by the GPT-2, GPT-4, and GPT-4o tokenizers side by side.
- `BPEStepper`: steps through byte pair encoding on a small corpus: the most frequent pair merges,
  the vocabulary grows, and the token count drops.

## Data

Tier T1: `gpt-tokenizer` in the browser, no model download. BPE is computed in the browser
(`src/lib/math/bpe.ts`).

## Decisions

- "strawberry" shows why counting letters is hard: the word reaches the model as a few token IDs.
