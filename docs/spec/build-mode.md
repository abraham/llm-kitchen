# Learn and Build

Plan for a second way through the site: alongside today's explanations (**Learn**), every chapter
gets a **Build** version, a step of hands-on instructions for making a small language model from
Project Gutenberg books and a harness of the reader's own around it. A toggle in the app bar
switches between them. [roadmap.md](roadmap.md) points here. When a phase lands, its part moves
into the spec it belongs to ([Specs that change](#specs-that-change)) and leaves this file.

## Goals

- **Same chapters, same order.** Build follows [curriculum.md](curriculum.md): each chapter's Build
  step makes the idea its Learn version explains. Nothing is renumbered or reordered, and
  `buildsOn` stays as it is.
- **Learn stays the default and stays as it is.** A visitor who never touches the toggle sees
  today's site. No Learn text is rewritten to make room for Build.
- **One project, start to finish.** The steps grow one Python package, from counting word pairs
  to a trained transformer with a chat harness, tools, an agent loop, and tests. Each step leaves
  the reader with something that runs.
- **Runs on an ordinary laptop.** No GPU and no paid service are needed. A GPU or Apple silicon is
  used when present.
- **The code on the page is the code that's tested.** Every snippet is read at build time from
  files that CI runs, so prose and code can't drift apart.
- **Written from scratch.** Beyond Python and PyTorch's tensors and autograd, the reader writes
  every piece: the tokenizer, attention, the training loop, the sampler, and the harness. No
  `transformers`, `tokenizers`, or agent framework in the main track.
- **The site stays static.** The site shows instructions; the reader runs them on their own
  machine. Nothing runs on a server, and the browser never runs the reader's code.

## The toggle

- **Where:** in the app bar, before the Explanations control: a "Mode" group (visually hidden
  legend) of two radios, **Learn** and **Build**, drawn like the Explanations control. An open-book
  icon for Learn and a wrench for Build; only the selected one shows its name, the other keeps it
  for screen readers and as a tooltip.
- **What it changes:** the chapter body. Learn shows today's chapter; Build shows the chapter's
  Build step in its place. The heading, the progress rail, and the footer stay.
- **Levels:** Build is written once, at one level. In Build the Explanations control is hidden,
  which also gives the app bar back the room the new toggle takes on phones. The saved level is
  kept for when the reader returns to Learn.
- **Saving:** like the level, the choice is saved in `llm-kitchen:mode` (nothing for Learn) and
  applied by the inline script in `app.html` as `data-mode` on `<html>` before the page paints,
  so the right mode shows before JavaScript runs and switching re-renders nothing.
- **Switching keeps the reader in the same chapter** and scrolls to the top of the body, since the
  two versions don't line up section by section.
- **In-page switches:** each Learn chapter ends, after its recap card, with a short "Build it"
  box naming what its Build step makes, with a button that switches to Build. Each Build step
  opens with "Read the Learn version first" and a button that switches back. Both set the same
  saved choice as the toggle.
- **Sharing:** `?mode=build` on a chapter URL switches to Build and saves it, as if the reader had
  used the toggle, so a Build step can be shared. Without it, a link opens in the reader's saved
  mode. The canonical URL, the social image, and the page metadata are Learn's.
- **Pages without a Build version** (the menu, the Models page) ignore the mode and show the toggle
  as it is.

## A Build step

Each chapter's Build step is `src/lib/chapters/<slug>/build.svx`, with the same shape everywhere:

1. **What you'll add,** in one or two sentences, with the time it takes on the reference laptop
   and the files it creates or changes.
2. **You need:** the earlier steps whose code it uses, linked (the links keep Build mode).
3. **The idea,** in two or three sentences, linking the Learn version.
4. **Steps,** numbered: code to write (snippets from the workshop, below), commands to run, and
   the output to expect, from the reference run. Every step runs "The cat sat on the" through
   whatever the reader has built so far, so the running example carries through Build as well.
5. **Check it:** the one `pytest` command that tests this step's code.
6. **What you have now:** a recap card listing what now works.
7. **Next step:** a link to the next chapter's Build step.

- Glossary terms, citations, and chapter links work as in Learn. Build steps have no "Try it"
  widgets; the reader's own terminal is the widget.
- Code blocks are plain monospace, with no syntax highlighting and no JavaScript. Long lines scroll
  inside the block, so the page still never scrolls sideways at 320 px; the scrolling block is
  focusable, like a wide equation.
- Every command block has a "Copy" button. Commands are written for macOS and Linux shells, with
  the Windows (PowerShell) form beside them where it differs.
- `build.ts` beside it exports `needs` (the earlier steps whose modules it imports), `minutes`
  (measured on the reference laptop), and `track`: `main` for steps later steps build on, `side`
  for experiments nothing depends on.

## The workshop

The code lives in `workshop/` at the repository root, MIT licensed like the site. (`build/` is
SvelteKit's output, so the folder isn't called that.)

```
workshop/
  pyproject.toml     Python 3.12+, PyTorch pinned, dependencies locked with hashes
  books.json         the corpus: Project Gutenberg ebook numbers, titles, SHA-256 of each file
  kitchen/           the package the reader builds, one or more modules per step
    harness/         the harness modules, from The model is not the product on
  steps.py           one function per chapter, keyed by slug; `python -m kitchen <slug>` runs it
  tests/             one test file per step
  fixtures/          two short books, already stripped, for CI
  reference/         the reference run's outputs, one JSON file per step
  workspace/         the only folder the harness's tools can read or write (not committed)
```

- **Additive by design.** A step adds modules or functions and never rewrites an earlier step's
  code: where a later idea changes an earlier one (a KV cache in the model's forward pass, a
  format mask in the sampler), it arrives as a new function or an optional argument the earlier
  code already passes through. So the finished package holds every step's code as written, and
  every snippet comes straight from it.
- **Snippets:** a step includes code with `<Code file="kitchen/bigram.py" region="count" />`.
  A remark plugin (`scripts/mdsvex-code.ts`, like `mdsvex-math.ts`) reads the region between
  `# region count` and `# endregion` at build time and inlines it; a missing file or region fails
  the build. A step that adds a whole file can include it without a region.
- **Commands:** every step runs as `python -m kitchen <slug>`, keyed by the chapter's slug, never
  its number, so moving a chapter changes no command.
- **Reference run:** `python -m kitchen record` runs every step on the full corpus with fixed
  seeds and writes `reference/<slug>.json`: losses, sample outputs, timings, sizes. The expected
  output shown in each step comes from it, and the step says the reader's numbers will be close,
  not equal, on other hardware.
- **Checkpoints** are saved as PyTorch state dicts and loaded with `weights_only=True`.

## The corpus

- **Which books:** about 20 to 30 English books from Project Gutenberg, mostly children's stories,
  fairy tales, fables, and nursery rhymes, so the running example's cat and the site's rhymes feel
  at home. Every book is unrestricted by U.S. copyright, and the list is pinned in `books.json`
  with each file's SHA-256. The guide says that books this old carry their era's views and
  language, and the model learns them.
- **Getting them:** Project Gutenberg's website is for people; automated downloads must use its
  mirrors or the harvest service, with a wait between requests, and its catalog data is free to
  use ([robot access policy](https://www.gutenberg.org/policy/robot_access.html)). The download
  step does that: one plain-text file per book, two seconds apart, each checked against its
  SHA-256. Project Gutenberg updates files, so a changed hash stops the step with a message that
  names the book and offers `--accept-new`, which records the new hash locally.
- **Cleaning:** the step strips Project Gutenberg's header, license, and footer, and every
  reference to Project Gutenberg, leaving text the license calls unrestricted in the United States
  ([license](https://www.gutenberg.org/policy/license.html)). The guide says readers outside the
  United States should check their own country's law, as the license does. The site never hosts
  the books; the two CI fixtures are short, stripped texts.
- **Splits:** whole books are held out for validation, so the validation loss measures text the
  model has never seen, not just unseen sentences.

## The model and the harness

- **The model:** a GPT-style decoder of about 10 million weights (starting point: 6 blocks, 256
  numbers per vector, 4 heads, a 256-token context, and a 4,096-token byte-level BPE vocabulary the
  reader trains), with every size set in one config. The main training run must finish within an
  hour on the reference laptop: a recent laptop with 8 GB of memory, CPU only. Phase 3 measures
  the real numbers and adjusts the config to fit.
- **Small and honest.** A model this size writes book-like sentences and learns narrow tasks it's
  tuned on, but it won't reason or follow open instructions. Each step says what to expect, and
  failures are shown as they are, as Learn does with the small Qwen models.
- **Becoming an assistant:** the [From predictor to assistant](chapters/predictor-to-assistant.md)
  step adds a chat template with special tokens and tunes the model on generated instructions
  whose answers come from the books (such as "Write a sentence about a cat." answered with a
  corpus sentence containing "cat"), so it learns the template and the roles, not new knowledge.
- **Tools:** the [Tools](chapters/tools.md) step generates examples of the right tool call for the
  workshop's tools (`count_words`, `search_books`, `read_passage`) and tunes the model on them, so
  it learns that narrow format. The step says this is how tool use is trained, at a far smaller
  scale.
- **The harness** is the reader's own: a chat loop, the context budget, search and memory, a KV
  cache and a prefix cache, a router, tools, the agent loop, guardrails, and an eval suite, each
  added by the chapter that explains it. It talks to any model through one small interface
  (`next_token_logits`, `generate`), so later steps can compare the reader's model with a bigger
  one.

## Build steps

The step each chapter adds. Main-track steps feed later ones; side steps are experiments.

| Chapter                                                                          | Track | The reader builds                                                                                           |
| -------------------------------------------------------------------------------- | ----- | ----------------------------------------------------------------------------------------------------------- |
| [The guessing game](chapters/guessing-game.md)                                   | main  | Set up the project, download and clean the books, and play the guessing game on a passage from them         |
| [Predicting by counting](chapters/predicting-by-counting.md)                     | main  | A word-pair counting model, its predictions, and how many validation pairs it never saw                     |
| [Probability and sampling](chapters/probability-and-sampling.md)                 | main  | A sampler: counts to probabilities, temperature, top-k, top-p, and a seed                                   |
| [Text is just numbers](chapters/text-is-numbers.md)                              | main  | Reading the books as UTF-8, normalizing them, and counting bytes and characters                             |
| [Tokens](chapters/tokens.md)                                                     | main  | A byte-level BPE tokenizer trained on the books, saved, with a round-trip test                              |
| [Meaning as position](chapters/embeddings.md)                                    | main  | An embedding table and cosine similarity, used again once the model is trained                              |
| [A neuron](chapters/a-neuron.md)                                                 | main  | A neuron and a layer by hand, checked against PyTorch's `Linear`, and the MLP                               |
| [Learning from mistakes](chapters/learning-from-mistakes.md)                     | main  | The training loop: batches, cross-entropy, one gradient checked by hand, AdamW, a 3-token window model      |
| [The context problem](chapters/the-context-problem.md)                           | main  | The window model at 1, 3, and 8 tokens: validation loss against weights per slot                            |
| [Attention](chapters/attention.md)                                               | main  | Causal self-attention, one head then several, checked against PyTorch's own                                 |
| [The transformer block](chapters/the-transformer-block.md)                       | main  | The block (norms, attention, MLP, residuals), position vectors, and the stacked model with its weight count |
| [Generating text](chapters/generating-text.md)                                   | main  | The generation loop on the sampler, with stop tokens and streamed output                                    |
| [Scale](chapters/scale.md)                                                       | main  | The main training run, plus three smaller sizes to plot validation loss against weights                     |
| [Fewer bits per number](chapters/quantization.md)                                | main  | 8-bit and 4-bit weights: the file size and the validation loss at each                                      |
| [Guessing ahead](chapters/speculative-decoding.md)                               | side  | A one-block draft model and speculative decoding, with the speed-up and identical greedy output             |
| [From predictor to assistant](chapters/predictor-to-assistant.md)                | main  | The chat template and instruction tuning, comparing the base and tuned models                               |
| [Quirks and limits](chapters/quirks-and-limits.md)                               | main  | A probe script that logs made-up facts, letter counting, and answers that shift with wording                |
| [Thinking before answering](chapters/reasoning-models.md)                        | side  | Two-digit addition tuned with and without written steps, and the accuracy of each                           |
| [A prompt is the start of a document](chapters/prompts-as-documents.md)          | main  | Prompting the base model with different openings from the books                                             |
| [Learning from examples in the prompt](chapters/few-shot.md)                     | main  | Accuracy on a made-up pattern with 0 to 8 examples in the prompt                                            |
| [Instructions, roles, and the system prompt](chapters/instructions-and-roles.md) | main  | A system prompt in the template, and the same question under different ones                                 |
| [Asking for steps and structure](chapters/steps-and-structure.md)                | main  | A format mask in the sampler that only allows tokens that keep the output valid                             |
| [Where prompts break](chapters/where-prompts-break.md)                           | main  | A prompt test runner: variants in, answers and how often they agree out                                     |
| [The model is not the product](chapters/the-model-is-not-the-product.md)         | main  | The harness: messages, the template, a model call, and a chat in the terminal                               |
| [Managing the context](chapters/managing-the-context.md)                         | main  | A token budget with drop-oldest, a short note in place of old turns, and retrieval                          |
| [Search and memory](chapters/search-and-memory.md)                               | main  | BM25 and vector search over book passages, merged by rank, and notes kept between chats                     |
| [Caching: reusing the work](chapters/caching.md)                                 | main  | A KV cache in the forward pass and a prefix cache across turns, timed                                       |
| [Which model answers?](chapters/routing.md)                                      | main  | A router that passes a question on when the small model is unsure                                           |
| [Tools](chapters/tools.md)                                                       | main  | The tools, the call format and its parser, and tuning the model to call them                                |
| [The agent loop](chapters/the-agent-loop.md)                                     | main  | The loop: call, run tools, add results, repeat, with a step limit and a saved trace                         |
| [Designing an agent](chapters/designing-agents.md)                               | main  | The same task as a fixed workflow, a loop, and plan-first, comparing calls and tokens                       |
| [Splitting the work](chapters/splitting-the-work.md)                             | main  | A lead agent that hands subtasks to helpers with fresh prompts and reads their summaries                    |
| [Prompt injection](chapters/prompt-injection.md)                                 | main  | A planted instruction in a passage the search returns, and what it does to the agent                        |
| [Trust and guardrails](chapters/trust-and-guardrails.md)                         | main  | A tool allowlist, read-only tools, a confirmation step, and a file sandbox                                  |
| [Did it work?](chapters/testing-agents.md)                                       | main  | An eval set, checks in code, trace summaries, and running them all as tests                                 |
| [Reading both ways](chapters/encoders.md)                                        | side  | The model without its causal mask, trained to fill in blanks                                                |
| [Many experts](chapters/mixture-of-experts.md)                                   | side  | The MLP swapped for four experts with a router, comparing weights used per token and loss                   |
| [Remembering without attention](chapters/recurrent-models.md)                    | side  | A GRU on the same data, comparing loss and memory per token                                                 |
| [Seeing pictures](chapters/seeing-pictures.md)                                   | side  | Cutting a picture into patches and turning each into a vector, with the token count                         |
| [Painting from noise](chapters/diffusion.md)                                     | side  | A small diffusion model on 2D points, as in the Learn widget                                                |
| [Choosing actions](chapters/decision-models.md)                                  | side  | The transformer block reused to predict moves in a grid world                                               |
| [Recap: the whole picture](chapters/recap.md)                                    | main  | One command that rebuilds everything from the books to the agent                                            |
| [From message to reply](chapters/end-to-end.md)                                  | main  | One message traced through the harness and the model, every stage logged                                    |
| [Picking a model](chapters/picking-a-model.md)                                   | main  | The memory each version of the model needs, against a downloaded open model                                 |
| [Check yourself](chapters/quiz.md)                                               | main  | The whole test suite, and a checklist of what each step built                                               |

## Code

1. **`stores/mode.svelte.ts`**: the choice (`learn` or `build`), saved through
   `stores/root-choice.ts` like the theme and level; the inline script in `app.html` reads it,
   and `?mode=build`.
2. **`page/Mode.svelte`**: renders `build.svx` and `chapter.svx` in two containers with
   `data-mode`; `global.css` hides the one that doesn't match the root's `data-mode` with
   `display: none`, as it does for levels. Learn comes first in source order.
3. **`chapters/index.ts` and `config.ts`**: load `build.svx` and `build.ts` by slug, and set
   `BUILD_CHOICE` once any chapter has a Build step. Until then the toggle is hidden, as the
   level control was.
4. **The app bar** gains the toggle and hides the Explanations control in Build; **ChapterLayout**
   gains the "Build it" box and, in Build, the step's "You need" box in place of Ingredients.
5. **`page/Code.svelte`** and **`scripts/mdsvex-code.ts`**: snippets and command blocks with Copy.
6. **`workshop/`**: the package, its tests, fixtures, and reference run.
7. **Progress:** the rail marks Build steps done separately from chapters read.

## Phases

One pull request per phase; each passes every check in [quality.md](quality.md).

1. **Machinery.** The mode store, inline script, toggle, `?mode=build`, the two containers, the
   snippet plugin, `Code`, the in-page switches, `build.ts`, and the workshop skeleton with its CI
   job, all exercised on a test-only fixture page. The toggle stays hidden.
2. **Pilot: the first three Parts.** Download and clean the books, counting, sampling, bytes, BPE,
   embeddings, neurons, and the training loop: a full slice that ends with a trained window model.
   The book list is chosen and pinned. The toggle appears, and chapters without a step say "This
   chapter's Build step isn't written yet" with a link to the last one that is.
3. **The model.** Context and Putting it together: attention, the block, generation, the main
   training run (measured on the reference laptop, with the config fixed to fit the hour),
   quantization, speculative decoding, instruction tuning, quirks, and reasoning.
4. **Prompting and the harness.** Prompt engineering and Harnesses.
5. **Agents and safety.** Tool tuning, the loop, the designs, splitting the work, injection,
   guardrails, and evals.
6. **Side steps and the wrap-up.** Other kinds of models, and the four wrap-up steps.

## Security

- The site never runs the reader's code. It shows code and commands that CI has run.
- The download step contacts Project Gutenberg only, as its robot policy allows, reads plain text
  only, and checks every file's SHA-256 before using it.
- Dependencies are pinned with hashes. Checkpoints load with `weights_only=True`, so a checkpoint
  file can't run code.
- The harness's tools touch only the workshop's `workspace/` folder: paths are resolved and
  anything outside is refused. There is no shell, `eval`, or network tool. The injection step plants
  its instruction in a local file, never on the web.
- `?mode=build` and the saved choice are visitor-controlled: anything but `build` reads as Learn.

## Tests

- **Unit:** every `<Code>` reference resolves to a file and region; each `build.ts` lists only
  earlier steps in `needs`, and a step's modules import only modules of those steps; no Build step
  states a number the reference run doesn't contain (each step's `facts.test.ts` reads
  `reference/<slug>.json`); `parseMode` falls back to Learn.
- **Python, in CI:** `pytest workshop` on the fixtures with the tiny config (a few hundred
  training steps), in under five minutes. It downloads nothing.
- **End-to-end:** switching modes, saving, applying before hydration, `?mode=build`, the in-page
  switches, the Explanations control hidden in Build, axe and the 320 px check in both modes on
  every chapter with a Build step, and Copy buttons.
- **Lighthouse** stays at 95 or above in both modes. If Build's HTML makes Learn pages miss it,
  Build moves to its own prerendered route (`/<slug>/build`) and the toggle navigates instead,
  and the goal of switching without a reload is dropped.
- **The reference run** stays out of CI, like recordings: `python -m kitchen record` runs offline,
  and its outputs are committed.

## Specs that change

- [principles.md](principles.md): the two modes, and success criteria for Build.
- [architecture.md](architecture.md): the mode, `build.svx` and `build.ts`, the snippet plugin, and
  `workshop/`.
- [design.md](design.md): the toggle, the "Build it" and "You need" boxes, and code blocks.
- [components.md](components.md): `Mode` and `Code`.
- [models-and-data.md](models-and-data.md): the reference run, and the corpus and its rules.
- [sources.md](sources.md): Project Gutenberg's license and policies, and the papers Build steps
  cite.
- [quality.md](quality.md), [security.md](security.md), and [roadmap.md](roadmap.md).

## Open questions

- **The book list.** Which 20 to 30 books, and whether fairy tales and rhymes alone give enough
  varied text for the prompting steps.
- **A bigger model for comparison.** The routing, tools, and agent steps are clearer next to a
  model that can follow instructions, such as Qwen2.5-0.5B-Instruct, which the site already uses.
  That needs `transformers` as an optional extra and a download of about 1 GB. Proposal: an
  optional extra, never required, with every step complete without it.
- **Notebooks.** Whether to also offer each step as a Jupyter notebook. Proposal: no; one package
  run from the terminal is simpler to test and closer to real projects.
