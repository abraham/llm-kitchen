# Curriculum

This document owns how the site's content is organized: which Parts there are, which chapters each
Part holds, their order, numbers, titles, and slugs, and what each chapter builds on. What happens
inside a chapter (its hook, widgets, and key idea) is in [chapters/](chapters/), one file per slug.
This is the only spec that uses chapter numbers.

`tests/unit/curriculum.test.ts` checks that `src/lib/curriculum/curriculum.ts` matches the tables below.

## Principles

- **Each Part answers one question** a reader would ask, in the order they'd ask it: what does a
  language model do, how does it see text, how does it learn, how does it use context, how does it
  become an assistant, how do you talk to it, what is built around it, and what else is built from
  the same pieces.
- **The model before what's built around it.** First the model alone, then how to prompt it, then
  the harness code that wraps it. Prompting needs only the model and its chat template, and the
  harness chapters (system prompts, tool-call formats, prompt injection) are easier once prompting is
  familiar.
- **The standard model before its variants.** Other kinds of models come last, as variations on a
  recipe the reader already knows. A chapter belongs there only if it changes the architecture or
  what counts as a token; models that are the same transformer trained differently stay with
  training.
- **Dependencies only point backward.** Every chapter's "builds on" list names earlier chapters only,
  and its prose refers back, never forward, except in the closing "Next question".
- **Each chapter answers the previous one's question.** The "Next question" at the end of a chapter
  is what the next chapter opens with, including across Part boundaries.
- **Small, even Parts.** A Part has 2 to 7 chapters; a chapter has one key idea and one main widget.
- **Numbers are positions; slugs are identities.** Chapter numbers follow reading order and may change
  when chapters are added or moved. Slugs, and therefore URLs and visitors' saved progress, never
  change. Titles are plain words, at most about 40 characters.

## The organization

### Part I — Prediction

_What does a language model do?_

| Ch  | Title                    | Slug                       | Builds on |
| --- | ------------------------ | -------------------------- | --------- |
| 0   | The guessing game        | `guessing-game`            | —         |
| 1   | Predicting by counting   | `predicting-by-counting`   | 0         |
| 2   | Probability and sampling | `probability-and-sampling` | 1         |

### Part II — Representation

_How does text become something a model can compute with?_

| Ch  | Title                        | Slug              | Builds on |
| --- | ---------------------------- | ----------------- | --------- |
| 3   | Text is just numbers         | `text-is-numbers` | 0         |
| 4   | Tokens: the model's alphabet | `tokens`          | 3         |
| 5   | Meaning as position          | `embeddings`      | 4         |

### Part III — Learning

_Where do the model's numbers come from?_

| Ch  | Title                  | Slug                     | Builds on |
| --- | ---------------------- | ------------------------ | --------- |
| 6   | A neuron               | `a-neuron`               | 5         |
| 7   | Learning from mistakes | `learning-from-mistakes` | 1, 6      |

### Part IV — Context

_How does a prediction use everything that came before?_

| Ch  | Title                 | Slug                    | Builds on |
| --- | --------------------- | ----------------------- | --------- |
| 8   | The context problem   | `the-context-problem`   | 1         |
| 9   | Attention             | `attention`             | 5, 8      |
| 10  | The transformer block | `the-transformer-block` | 6, 9      |

### Part V — Putting it together

_How does the whole model write, run, and become an assistant?_

| Ch  | Title                       | Slug                     | Builds on  |
| --- | --------------------------- | ------------------------ | ---------- |
| 11  | Generating text             | `generating-text`        | 2, 10      |
| 12  | Scale                       | `scale`                  | 7, 11      |
| 13  | Fewer bits per number       | `quantization`           | 3, 12      |
| 14  | Guessing ahead              | `speculative-decoding`   | 2, 11, 12  |
| 15  | From predictor to assistant | `predictor-to-assistant` | 11         |
| 16  | Quirks and limits           | `quirks-and-limits`      | 4, 15      |
| 17  | Thinking before answering   | `reasoning-models`       | 11, 15, 16 |

### Part VI — Prompt engineering

_How do you get the answer you want?_

| Ch  | Title                                      | Slug                     | Builds on   |
| --- | ------------------------------------------ | ------------------------ | ----------- |
| 18  | A prompt is the start of a document        | `prompts-as-documents`   | 2, 8, 9, 15 |
| 19  | Learning from examples in the prompt       | `few-shot`               | 9, 18       |
| 20  | Instructions, roles, and the system prompt | `instructions-and-roles` | 15, 18      |
| 21  | Asking for steps and structure             | `steps-and-structure`    | 11, 17      |
| 22  | Where prompts break                        | `where-prompts-break`    | 16, 19      |

### Part VII — Harnesses

_What is built around the model to make a chat app or an agent?_

| Ch  | Title                        | Slug                           | Builds on  |
| --- | ---------------------------- | ------------------------------ | ---------- |
| 23  | The model is not the product | `the-model-is-not-the-product` | 15, 20     |
| 24  | Tools                        | `tools`                        | 21, 23     |
| 25  | The agent loop               | `the-agent-loop`               | 11, 24     |
| 26  | Managing the context         | `managing-the-context`         | 5, 8, 25   |
| 27  | Caching: reusing the work    | `caching`                      | 9, 11, 25  |
| 28  | Prompt injection             | `prompt-injection`             | 20, 22, 24 |
| 29  | Trust and guardrails         | `trust-and-guardrails`         | 25, 28     |

### Part VIII — Other kinds of models

_What else is built from the same pieces?_

| Ch  | Title                         | Slug                 | Builds on |
| --- | ----------------------------- | -------------------- | --------- |
| 30  | Reading both ways             | `encoders`           | 5, 9      |
| 31  | Many experts                  | `mixture-of-experts` | 6, 10     |
| 32  | Remembering without attention | `recurrent-models`   | 7, 8, 27  |
| 33  | Seeing pictures               | `seeing-pictures`    | 5, 10     |
| 34  | Painting from noise           | `diffusion`          | 7, 11     |

### Wrap-up

_How does it all fit together?_ Unnumbered Part.

| Ch  | Title                    | Slug              | Builds on                  |
| --- | ------------------------ | ----------------- | -------------------------- |
| 35  | Recap: the whole picture | `recap`           | —                          |
| 36  | From message to reply    | `end-to-end`      | —                          |
| 37  | Picking a model          | `picking-a-model` | 12, 13, 14, 15, 27, 31, 33 |
| 38  | Check yourself           | `quiz`            | —                          |

## Why this order

- **Prediction comes first, with words.** Part I stays on prediction itself: guess, count, sample.
  Counting word pairs needs words, not numbers.
- **Text is just numbers opens Representation.** Text → numbers → tokens → vectors is one story.
- **Part V is the whole model at work.** After Generating text and Scale come the two chapters about
  running a big model on real hardware, Fewer bits per number and Guessing ahead. They need only
  Scale and Generating text, and model names use both (`qat`, `Q4_0`, `-assistant`). Thinking before
  answering stays in Part V because a reasoning model is the same transformer with more training
  (Ch 15's tuning, plus rewards for checkable answers), not a new architecture. It follows Quirks
  and limits as one answer to them, and it sets up Ch 21, which asks for steps in the prompt
  instead.
- **Prompt engineering comes before Harnesses.** Prompting needs only the model and its chat
  template. Learning it first means the system prompt (Ch 20) and structured output (Ch 21) are
  familiar when the harness puts a system prompt in front of every chat (Ch 23) and parses tool calls
  (Ch 24). Prompt injection (Ch 28) then reads as prompting by an attacker.
- **Other kinds of models come last.** They are breadth rather than a step in the main story, and
  they draw on every earlier Part, including the KV cache (Ch 27) that recurrent models avoid.
- **The Wrap-up puts it together.** The recap shows what the pieces are, From message to reply shows
  the order they run in, Picking a model reads real model names with everything taught so far, and
  the quiz comes last.

## Changing the organization

1. Decide the change here first: which Part's question the chapter answers, where it sits, what it
   builds on, and how the Next questions around it change.
2. Move or add the row in `src/lib/curriculum/curriculum.ts` (and in `parts.ts` for a new Part),
   with `buildsOn` as slugs, and update the tables here to match. Chapter numbers everywhere else
   are derived, so no files are renamed and no references are remapped.
3. For a new chapter, add `src/lib/chapters/<slug>/` (with `chapter.svx`, and `chapter.ts` if its
   widgets show recorded data) and `docs/spec/chapters/<slug>.md`.
4. Review the prose around the move: the Next questions, and any sentence that says "earlier" or
   "later". Update the claim lists in `docs/fact-check/`, which are grouped by Part.
