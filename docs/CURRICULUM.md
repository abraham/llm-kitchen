# LLM Kitchen — Curriculum

This document owns how the site's content is organized: which Parts there are, which chapters each
Part holds, their order, numbers, titles, and slugs, and what each chapter builds on. What happens
inside a chapter (its hook, widget, animation, and key idea) is described in
[PLAN.md §3](PLAN.md#3-curriculum). When the two disagree about placement, this document wins.

The site uses the organization below; `tests/unit/curriculum.test.ts` checks that
`src/lib/chapters/meta.ts` matches its tables. See [Status](#status).

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

_How does the whole model write, and how does it become an assistant?_

| Ch  | Title                       | Slug                     | Builds on  |
| --- | --------------------------- | ------------------------ | ---------- |
| 11  | Generating text             | `generating-text`        | 2, 10      |
| 12  | Scale                       | `scale`                  | 7, 11      |
| 13  | From predictor to assistant | `predictor-to-assistant` | 11         |
| 14  | Quirks and limits           | `quirks-and-limits`      | 4, 13      |
| 15  | Thinking before answering   | `reasoning-models`       | 11, 13, 14 |

### Part VI — Prompt engineering

_How do you get the answer you want?_

| Ch  | Title                                      | Slug                     | Builds on   |
| --- | ------------------------------------------ | ------------------------ | ----------- |
| 16  | A prompt is the start of a document        | `prompts-as-documents`   | 2, 8, 9, 13 |
| 17  | Learning from examples in the prompt       | `few-shot`               | 9, 16       |
| 18  | Instructions, roles, and the system prompt | `instructions-and-roles` | 13, 16      |
| 19  | Asking for steps and structure             | `steps-and-structure`    | 11, 15      |
| 20  | Where prompts break                        | `where-prompts-break`    | 14, 17      |

### Part VII — Harnesses

_What is built around the model to make a chat app or an agent?_

| Ch  | Title                        | Slug                           | Builds on  |
| --- | ---------------------------- | ------------------------------ | ---------- |
| 21  | The model is not the product | `the-model-is-not-the-product` | 13, 18     |
| 22  | Tools                        | `tools`                        | 19, 21     |
| 23  | The agent loop               | `the-agent-loop`               | 11, 22     |
| 24  | Managing the context         | `managing-the-context`         | 5, 8, 23   |
| 25  | Caching: reusing the work    | `caching`                      | 9, 11, 23  |
| 26  | Prompt injection             | `prompt-injection`             | 18, 20, 22 |
| 27  | Trust and guardrails         | `trust-and-guardrails`         | 23, 26     |

### Part VIII — Other kinds of models

_What else is built from the same pieces?_

| Ch  | Title                         | Slug                 | Builds on |
| --- | ----------------------------- | -------------------- | --------- |
| 28  | Reading both ways             | `encoders`           | 5, 9      |
| 29  | Many experts                  | `mixture-of-experts` | 6, 10     |
| 30  | Remembering without attention | `recurrent-models`   | 7, 8, 25  |
| 31  | Seeing pictures               | `seeing-pictures`    | 5, 10     |
| 32  | Painting from noise           | `diffusion`          | 7, 11     |

### Wrap-up

_How does it all fit together?_ Unnumbered Part.

| Ch  | Title                    | Slug         | Builds on |
| --- | ------------------------ | ------------ | --------- |
| 33  | Recap: the whole picture | `recap`      | —         |
| 34  | From message to reply    | `end-to-end` | —         |
| 35  | Check yourself           | `quiz`       | —         |

## Why this order

Compared with the order before milestone 19 (see the mapping below), four chapters or Parts move:

- **Text is just numbers joins Representation.** Text → numbers → tokens → vectors is one story.
  Part I can then stay on prediction itself: guess, count, sample. Counting word pairs needs words,
  not numbers.
- **Reasoning models join Part V.** A reasoning model is the same transformer with more training
  (Ch 13's tuning, plus rewards for checkable answers), not a new architecture. It follows Quirks and
  limits as one answer to them, and it sets up Ch 19, which asks for steps in the prompt instead.
- **Prompt engineering comes before Harnesses.** Prompting needs only the model and its chat
  template. Learning it first means the system prompt (Ch 18) and structured output (Ch 19) are
  familiar when the harness puts a system prompt in front of every chat (Ch 21) and parses tool calls
  (Ch 22). Prompt injection (Ch 26) then reads as prompting by an attacker.
- **Other kinds of models come last.** They are breadth rather than a step in the main story, and
  they draw on every earlier Part, including the KV cache (Ch 25) that recurrent models avoid.

Chapter contents change only where the new order requires:

- Ch 3 (Text is just numbers) opens from Ch 2's question about how a model can compute with words.
- Ch 15 (Thinking before answering) drops Part VII's "same as Ch N, except…" framing and opens from
  the quirks in Ch 14.
- Ch 18 (Instructions, roles, and the system prompt) introduces the system prompt itself, from the
  chat template's system slot (Ch 13), instead of pointing to the prompt inspector. Ch 21 refers back
  to it.
- Ch 19 (Steps and structure) says a fixed format makes output usable by programs; Ch 22 (Tools)
  then calls a tool call structured output in an agreed format.
- Ch 20 (Where prompts break) ends with instructions in text you didn't write as its Next question,
  answered in Part VII, instead of pointing back to prompt injection.
- The recap's paragraph and diagram follow the new Part order.

## Mapping from the milestone 18 order

| Slug                           | Now  | Target |
| ------------------------------ | ---- | ------ |
| `guessing-game`                | 0    | 0      |
| `text-is-numbers`              | 1    | 3      |
| `predicting-by-counting`       | 2    | 1      |
| `probability-and-sampling`     | 3    | 2      |
| `tokens` … `quirks-and-limits` | 4–14 | 4–14   |
| `the-model-is-not-the-product` | 15   | 21     |
| `tools`                        | 16   | 22     |
| `the-agent-loop`               | 17   | 23     |
| `managing-the-context`         | 18   | 24     |
| `caching`                      | 19   | 25     |
| `prompt-injection`             | 20   | 26     |
| `trust-and-guardrails`         | 21   | 27     |
| `encoders`                     | 22   | 28     |
| `mixture-of-experts`           | 23   | 29     |
| `recurrent-models`             | 24   | 30     |
| `seeing-pictures`              | 25   | 31     |
| `diffusion`                    | 26   | 32     |
| `reasoning-models`             | 27   | 15     |
| `prompts-as-documents`         | 28   | 16     |
| `few-shot`                     | 29   | 17     |
| `instructions-and-roles`       | 30   | 18     |
| `steps-and-structure`          | 31   | 19     |
| `where-prompts-break`          | 32   | 20     |
| `recap`                        | 33   | 33     |

## Changing the organization

1. Decide the change here first: which Part's question the chapter answers, where it sits, what it
   builds on, and how the Next questions around it change.
2. Update `src/lib/chapters/meta.ts` (`PARTS`, the curriculum rows, and `buildsOn`) and rename the
   chapter files to their new numbers.
3. Remap every "Ch N" cross-reference with a script from the old-to-new table, then review each
   change by hand: prose, widgets, data comments, the glossary, the recap diagram and quiz, tests,
   and `docs/fact-check/`. Historical notes keep the numbers they had.
4. Do the renumbering in its own commit, with all tests passing, before changing any chapter's
   content.

## Status

The site has used this order since milestone 19. Before it, Part VI was Harnesses (Ch 15–21), Part
VII was Other kinds of models with Thinking before answering (Ch 22–27), Part VIII was Prompt
engineering (Ch 28–32), and Text is just numbers was Ch 1; the mapping above records the move.
