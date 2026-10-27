# Sources and fact-checking

Every factual claim and number on the site is backed in one of three ways:

1. **Cited:** a `<Cite>` to a primary source (paper, model card, or official docs) in
   `src/lib/references.json`. Pages that change carry an accessed date.
2. **Tested:** a unit test checks the widget or recorded data says what the prose says.
3. **Labeled:** the text says it's a simplification ("Simplified: real models also…").

## Claim lists

[docs/fact-check/](../fact-check/README.md) has one claim list per Part: every claim and number in
its chapters and what backs it. A pull request that adds or changes a claim updates the list.

- **Model numbers come from the source.** GPT-2 small's sizes come from `models/canonical.json`,
  which `record/traces.py` checks against the model's own config. Any other figure cites its paper or
  model card.
- **Demos match the prose.** Each chapter's `facts.test.ts` checks the numbers it states (bigram
  counts, recorded results, and so on). Facts that come straight from shared logic are tested next
  to it instead: BPE merges in `math/bpe.test.ts`, the tokenizer's split of "strawberry" in
  `models/tokenizers.test.ts`, word vectors in `math/vectors.test.ts`, and the tiny networks in
  `math/mlp.test.ts`. Each Part's claim list names the test behind every number.
- **Recordings are reproducible.** Scripts decode greedily or with a fixed seed, pin their Python
  packages and model commits, and `python -m scripts.record check <module>` re-records a module,
  without the generation cache, and compares it with the committed data.
- **Verdicts on replies are checkable.** A verdict code can work out is computed by the site from
  the recorded text (`src/lib/grading/`), so a test and the widget see the same one. A reply graded
  by hand has its verdict and a one-line reason in `scripts/record/grades/`, tied to a hash of the
  exact text; the widget shows the reason where it matters, and the claim list points to the file.
- **Time-sensitive facts** (model lineups and cards, provider caching and tool-calling rules,
  frontier-model figures) carry accessed dates and are re-checked when the site is reviewed.
- **Links** are checked weekly in CI (see [quality.md](quality.md)). Some publishers answer bots with
  202 or 403, and some rate-limit with 429; `lychee.toml` accepts those.

## Core sources

Each Part cites at least these:

- **Prediction:** Shannon 1948 and 1951.
- **Representation:** Sennrich et al. 2016 (BPE) and Mikolov et al. 2013 (word vectors and
  analogies).
- **Learning:** Rumelhart et al. 1986 (backpropagation).
- **Context:** Levesque et al. 2012 (Winograd Schema Challenge, for the trophy/suitcase example),
  Vaswani et al. 2017 (attention and transformers), and Su et al. 2024 (rotary position embedding).
- **Putting it together:** Radford et al. 2019 (GPT-2); Kaplan et al. 2020 and Hoffmann et al. 2022
  (scaling laws); Jacob et al. 2018 and Dettmers et al. 2022 (quantization); Leviathan et al. 2023
  and Chen et al. 2023 (speculative decoding); Ouyang et al. 2022 (instruction and preference
  tuning), Hu et al. 2022 (LoRA), and Hinton et al. 2015 (distillation); Wei et al. 2022 (chain of
  thought) and DeepSeek-AI 2025 (DeepSeek-R1).
- **Prompt engineering:** Brown et al. 2020 (GPT-3, few-shot prompting), Olsson et al. 2022 (induction
  heads and in-context learning), Kojima et al. 2022 ("Let's think step by step"), Lu et al. 2022
  (example order), Sclar et al. 2024 (formatting sensitivity), and Liu et al. 2024 ("Lost in the
  Middle").
- **Harnesses:** Lewis et al. 2020 (RAG), Pope et al. 2022 (KV caching), the providers' prompt
  caching docs, Chen et al. 2023 (FrugalGPT, cascades), and Ong et al. 2024 (RouteLLM, routers).
- **Agents and Safety:** Schick et al. 2023 (Toolformer), the Model Context Protocol announcement and
  specification, Yao et al. 2023 (ReAct), Perez and Ribeiro 2022 and
  Greshake et al. 2023 (prompt injection), and Hines et al. 2024 (spotlighting) and Wallace et al.
  2024 (instruction hierarchy) for the defenses.
- **Other kinds of models:** Devlin et al. 2019 (BERT), Shazeer et al. 2017 and Jiang et al. 2024
  (mixture of experts, Mixtral), Hochreiter and Schmidhuber 1997 (LSTM) and Gu and Dao 2023 (Mamba),
  Dosovitskiy et al. 2021 (ViT) and Radford et al. 2021 (CLIP), Ho et al. 2020 (diffusion), and
  Chen et al. 2021 (Decision Transformer), Reed et al. 2022 (Gato), and Sutton and Barto 2018
  (reinforcement learning).
- **Wrap-up:** Noy and Zhang 2023 (writing with ChatGPT), and the Gemma 4 model cards and QAT
  announcement and the GGUF format docs, with accessed dates.

## Expert review

Someone with an ML background reads each Part end to end for errors and misleading simplifications,
and findings are fixed or logged as issues. Its status is tracked in
[docs/fact-check/README.md](../fact-check/README.md).
