# Fact-check: Part II (Ch 3–5)

Claim checklist for the per-chapter fact-check (see [the spec](../spec/sources.md)). Tests:
`src/lib/models/tokenizers.test.ts`, `src/lib/math/bpe.test.ts`, `src/lib/math/vectors.test.ts`,
`tests/unit/canonical.test.ts`, each chapter's `facts.test.ts`, each chapter's `chapter.e2e.ts`.

## Ch 3. Text is just numbers

| Claim                                                                   | Backing                                   |
| ----------------------------------------------------------------------- | ----------------------------------------- |
| T is 84, h is 104, space is 32, é is 233, 🐱 is 128,049                 | Test (`encodeText`)                       |
| Unicode has room for more than a million characters                     | Cite `unicode` (U+0000–U+10FFFF), test    |
| A byte holds 0–255; UTF-8 uses 1 byte for basic English, 2–4 for others | Cite `rfc3629`, test (é = 2, 🐱 = 4)      |
| GPT-2 starts from bytes so it can read any text                         | Cite `radford2019` (§2.2, byte-level BPE) |

## Ch 4. Tokens

| Claim                                                                      | Backing                                                          |
| -------------------------------------------------------------------------- | ---------------------------------------------------------------- |
| " cat" (with the space) is token 3797                                      | Recorded trace + tokenizer test                                  |
| "tokenization" splits into "token" + "ization"                             | Live tokenizer output (shown, not asserted in prose)             |
| GPT-2 knows exactly 50,257 tokens                                          | Cite `radford2019`; `canonical.json` checked by record/traces.py |
| BPE was first used for language/translation models by Sennrich et al. 2016 | Cite `sennrich2016`                                              |
| BPE: start from characters, repeatedly merge the most frequent pair        | Cite `sennrich2016`; test reproduces the paper's toy merges      |
| The toy example is the one from their paper (low, lower, newest, widest)   | Cite `sennrich2016` (Algorithm 1); test                          |
| GPT-2 ran BPE on bytes over web text                                       | Cite `radford2019` (§2.1–2.2)                                    |
| "strawberry" → st + raw + berry; " strawberry" is one token, 41236         | Test (`tokenizers.test.ts`), e2e                                 |
| The model never sees the letters inside a token                            | Follows from the input being token IDs                           |
| GPT-4 uses cl100k_base, GPT-4o uses o200k_base                             | Cite `tiktoken` (`model.py`)                                     |
| Newer, bigger vocabularies usually need fewer tokens for the same text     | Hedged ("usually"); widget shows the counts                      |
| The browser GPT-2 tokenizer matches the real model's tokens                | Test against the recorded trace                                  |

## Ch 5. Embeddings

| Claim                                                                  | Backing                                                                                           |
| ---------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| GPT-2 small turns each token into 768 numbers                          | `canonical.json` (checked against the model config)                                               |
| The vectors shown are GPT-2's real token embeddings                    | Exported by `record/traces.py` from `wte`                                                         |
| Embeddings start random and are learned in training                    | Cite `radford2019`                                                                                |
| all-MiniLM-L6-v2 maps text to 384 numbers                              | Cite `minilm-model-card`; test (`dimensions` = 384)                                               |
| cat's nearest neighbor is kitten                                       | Test                                                                                              |
| The 2D map keeps only a small share of the differences (~13%)          | Shown live from PCA explained variance; test (< 20%)                                              |
| Neighbors use all 384 numbers                                          | Test (browser math matches precomputed neighbors)                                                 |
| king − man + woman is nearest to queen among the map's words           | Test; text says "on this map" and "doesn't work for every analogy"                                |
| man → woman partly lines up with king → queen, but not on the flat map | Test (cosine above 0.2, more aligned than over 90% of word-pair steps; under 0.5 in 2D)           |
| The king/queen example was first shown in 2013 with word2vec vectors   | Cite `mikolov2013`                                                                                |
| Live option: ~23 MB model + ~27 MB runtime, cached, runs on device     | Hugging Face file size (22,972,370 B); ORT asyncify wasm (26.9 MB); Transformers.js browser cache |
