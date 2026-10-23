# Architecture

This is the target architecture. Where the code doesn't match it yet, [Current gaps](#current-gaps)
says how; each gap closes by changing the code, not this spec.

## Goals

- **Moving a chapter is a one-line change.** Slugs identify chapters everywhere. Numbers are
  derived from reading order and only ever rendered, never stored, so renumbering touches
  `curriculum.ts` and [curriculum.md](curriculum.md) and nothing else.
- **A chapter is one folder.** Its prose, the widgets only it uses, its hand-written data, and the
  tests for the facts it states sit together, named by slug, so adding, moving, or deleting a
  chapter doesn't scatter edits across the tree.
- **Data is typed and checked end to end.** What a recording script writes is exactly what a widget
  reads, and a mismatch fails a test, not a visitor's page.
- **Recorded and live are interchangeable.** A widget that shows model output doesn't know whether
  it comes from a recording or a model running in the browser.
- **Logic is plain TypeScript.** Math, the toy harness, and data transforms have no Svelte or DOM
  imports, so they run and are tested in Node. Widgets hold interaction state and render.
- **Pages are complete before JavaScript runs.** Prerendered HTML shows every widget's first state,
  with its real data, so nothing flashes "Loading" or shifts the layout.

## Tech stack

| Concern                 | Choice                                                                                                                               | Why                                                                                                              |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------- |
| Framework               | **SvelteKit 3** with `@sveltejs/adapter-static` (every route prerendered, `404.html` fallback), configured in `vite.config.ts`       | Fully static output, file-based routing, and Vite for workers and WASM. SvelteKit 3 has no `svelte.config.js`.   |
| Imports                 | `#lib` and `#lib/*` subpath imports (`package.json` `imports`) instead of `$lib`                                                     | Works in Node scripts and tests without the SvelteKit alias.                                                     |
| Components              | **Svelte 5** runes (`$state`, `$derived`, `$effect`)                                                                                 | Small compiled output and fine-grained updates for widgets that change on every slider move.                     |
| Content                 | **mdsvex** `.svx` chapters                                                                                                           | Markdown prose with Svelte widgets inline.                                                                       |
| Animation               | `svelte/motion` (`Tween`, `Spring`), `svelte/transition` (`crossfade`, `fade`, `fly`), `svelte/animate` (`flip`)                     | Built in, interruptible, and no animation library to ship.                                                       |
| Charts and figures      | Hand-written SVG                                                                                                                     | The figures are small; no chart library is needed.                                                               |
| Scroll storytelling     | `IntersectionObserver` in `Scrolly`, driving `StepController`                                                                        | Scrolling and Prev/Next move the same steps.                                                                     |
| Tokenizer               | `gpt-tokenizer`                                                                                                                      | Real BPE tokenization in the browser with no model download.                                                     |
| In-browser models       | **Transformers.js** (`@huggingface/transformers`, ONNX on WebGPU or WASM) in a Web Worker                                            | Real logits and embeddings with no server.                                                                       |
| Styling                 | CSS custom properties in `src/styles/tokens.css`, base styles in `global.css`                                                        | One concept color system (see [design.md](design.md)).                                                           |
| Hosting                 | **Firebase Hosting**, deployed from GitHub Actions                                                                                   | See [deployment.md](deployment.md).                                                                              |
| Testing                 | Vitest for logic and data, Playwright for pages, widgets, accessibility, and screenshots                                             | See [quality.md](quality.md).                                                                                    |
| Formatting              | **Prettier** with `prettier-plugin-svelte`                                                                                           | One format for TS, JS, Svelte, CSS, JSON, Markdown, and YAML. `.svx` is excluded: Prettier has no mdsvex parser. |
| Linting and type checks | **ESLint** flat config (`typescript-eslint`, `eslint-plugin-svelte`, `eslint-config-prettier`) and `svelte-check --fail-on-warnings` | Catches bugs, type errors, and a11y warnings without fighting Prettier.                                          |

## Source layout

```
src/
  routes/
    +layout.svelte, +layout.ts   site shell; prerender = true
    +page.svelte                 the menu, from the curriculum
    [chapter]/+page.ts           loads a chapter's prose and first-view datasets by slug
  lib/
    curriculum/
      parts.ts                   the Parts, in order (numbers derived)
      curriculum.ts              one row per chapter: slug, title, part, buildsOn (slugs), description
      index.ts                   chapter(slug), number(slug), label(slug), next(slug), Part helpers
    chapters/
      <slug>/
        chapter.svx              the prose
        chapter.ts               the datasets its widgets need for their first view
        *.svelte                 widgets only this chapter uses
        data.ts                  hand-written data, if any
        facts.test.ts            the numbers and claims the prose states
        chapter.e2e.ts           its widgets in a browser
    components/
      primitives/                shared visual elements (see design.md); props in, events out
      widgets/                   widgets used by two or more chapters
      layout/                    chapter shell, WidgetFrame, StepController, ChapterRef, Cite, ...
    datasets/
      registry.ts                every recorded dataset: id, file, parser, and the script that writes it
      parsers/                   one parser per dataset shape (trace, agent run, injection lab, ...)
      load.ts                    loadDataset(id): fetch once, parse, return typed data
    models/                      ModelProvider, RecordedProvider, BrowserProvider, tokenizers
    workers/                     inference and trainer workers, with typed message protocols
    math/                        pure numeric code: sampling, BPE, MLP and backprop, attention, ...
    harness/                     pure toy harness: tools, agent loop, caching, injection
    stores/                      progress, motion preferences
    glossary.ts                  terms, definitions, and the slug of the chapter that introduces each
    references.json              the bibliography
    site.ts                      name, tagline, description, origin, URL helpers
  styles/                        tokens.css, global.css
static/
  data/<dataset>.json            recorded datasets, one file per registry entry
  og/                            generated social images (git-ignored)
models/canonical.json            the canonical small model
scripts/
  record/                        Python package: shared envelope and model helpers, one module per dataset
  build-og.ts                    social images
tests/                           cross-cutting checks only: curriculum, citations, consistency,
                                 datasets, branding, hosting, quality, visual
```

## Layers

Imports only point down this list, enforced by ESLint (`no-restricted-imports` per folder):

1. **Routes** load a chapter and its data and render the shell.
2. **Chapters** place prose and widgets. A chapter may import shared widgets and its own.
3. **Widgets** own interaction state (`$state`, steppers) and compose primitives. They get data
   from a dataset or a `ModelProvider` and computation from `math/` or `harness/`.
4. **Primitives and layout** render what they're given. They never fetch.
5. **Logic** (`math/`, `harness/`, `datasets/parsers/`, `curriculum/`) is plain TypeScript with no
   Svelte, DOM, or `$app` imports.

A widget used by one chapter lives in that chapter's folder. It moves to `components/widgets/` when
a second chapter uses it, and back when only one does.

## Curriculum and chapter identity

- `curriculum.ts` lists chapters in reading order. A chapter's number is its index, a Part's number
  its position in `parts.ts`; neither is written down anywhere in `src/`.
- `buildsOn`, the glossary, quiz questions, end-to-end stages, model-name parts, and the recap
  diagram all refer to chapters by slug.
- Prose refers to another chapter with `<ChapterRef to="attention" />`, which renders a linked
  "Ch N" with the title on hover. Widgets and data use `label(slug)` the same way. A test fails on a
  literal "Ch" followed by a digit anywhere in `src/` outside `ChapterRef` and `label`.
- [curriculum.md](curriculum.md) keeps numbered tables for people; a test checks them against
  `curriculum.ts`.
- Moving a chapter: move its row in `curriculum.ts` and in curriculum.md. No files are renamed and no
  references are remapped.

## Chapters and routing

- A chapter's URL is `/<slug>` (`cleanUrls`, no trailing slash). `[chapter]/+page.ts` lists every
  slug in `entries()` and loads `chapters/<slug>/chapter.svx` through `import.meta.glob`.
- The route's `load` also fetches the datasets `chapter.ts` names and passes them to the page, so
  they are serialized into the prerendered HTML. Widgets read them with `useDataset(id)` from
  context, falling back to `loadDataset(id)` for data needed only after an interaction (such as the
  full embedding vectors for the live option).
- `ChapterLayout` renders the progress rail, the heading, the Ingredients box (from `buildsOn`), the
  prose, the sources, and the link to the next chapter.
- A test checks that every curriculum row has a folder with `chapter.svx`, and every folder a row.

## Data

### Datasets

- Every recorded file is a **dataset** in `datasets/registry.ts`: an id, its file under
  `static/data/`, the parser that checks and types it, and the script module that writes it.
- Every file has the same envelope:
  `{ "dataset": id, "version": n, "script": "record/<module>.py", "models": [{ "id", "revision" }], "generatedAt", "data": … }`.
  The parser checks the id and version, then the shape of `data`, and returns typed data. Widgets
  never declare their own types for recorded data or cast JSON.
- `loadDataset(id)` fetches each file once, parses it, and caches the result. A parse failure shows
  an error state in `WidgetFrame` with the dataset id.
- `tests/datasets.test.ts` parses every file in `static/data/` with its parser, fails on files not
  in the registry or entries without a file, and fails on a dataset no chapter uses.
- First-view data is budgeted: the datasets a chapter loads in its route stay under 100 KB
  gzipped. Larger data loads on interaction.

### Recording scripts

- `scripts/record/` is one Python package run as `python -m record <dataset>` or `all`.
- Shared helpers write the envelope, pin model revisions, fix seeds, choose greedy or seeded
  sampling, and check `models/canonical.json` against the model's config before any GPT-2 run.
- Each dataset module only describes its prompts and what to record.
- Where Python and TypeScript must agree (the toy tools, chat templates, cache arithmetic), a unit
  test replays the recorded inputs through the TypeScript code and compares the outputs.

### Hand-written data

Figures typed by hand (scale, Mixtral's sizes, model names, quiz questions) live in the `data.ts`
of the chapter that shows them, each with its citation id, and its `facts.test.ts` checks the
numbers the prose states.

## Models

- `ModelProvider` (`tokenize`, `nextTokenDistribution`, `generate`, optional `attention` and
  `embed`) is the only way a widget gets model output. Each implementation reports a `DataSource`
  for the badge.
  - `RecordedProvider` answers from a dataset and throws `NotAvailableError` for anything it has no
    recording for, so the widget can offer the live option.
  - `BrowserProvider` runs a model in `workers/inference.worker.ts` after `ModelConsent`.
- The live toggle swaps the provider passed to the widget; nothing else in the widget changes.
- Recordings of whole harness runs (agent sessions, the injection lab, reasoning runs) aren't model
  output a live provider could produce on the fly, so their widgets read the dataset directly.
- Worker messages are discriminated unions shared by the client and the worker. One worker serves
  one model; long training runs use `trainer.worker.ts`.
- `models/canonical.json` stays the only place GPT-2's sizes and IDs are written.

## Navigation and progress

- Reading is linear, with a progress rail (`ProgressNav`).
- Visited chapters are saved in `localStorage` under `llm-kitchen:visited`, by slug, so moving a
  chapter keeps progress.

## Glossary

- Terms live in `src/lib/glossary.ts`, each with a definition and the slug of the chapter that
  introduces it.
- `GlossaryPopover` shows the definition on a term's first use and links to its chapter.
- A test checks that each term's chapter mentions the term.

## Citations

- Chapters cite with `<Cite id="..." />`, which renders a numbered footnote link. Each chapter ends
  with a `Sources` list generated from the ids it used.
- Entries live in `src/lib/references.json` (id, authors, title, year, venue, URL or DOI, and an
  accessed date for pages that change). Hand-written data cites the same ids.
- `tests/citations.test.ts` fails if a chapter uses an unknown id or an entry is never cited.

## Tests

- **Next to the code:** unit tests for `math/`, `harness/`, `datasets/parsers/`, and
  `curriculum/`; each chapter's `facts.test.ts` and `chapter.e2e.ts`.
- **In `tests/`:** checks that span the site: the curriculum and spec, citations, GPT-2 numbers
  against `canonical.json`, datasets, social images, hosting headers, accessibility, layout, the
  JavaScript budget, and screenshots. See [quality.md](quality.md).
- Moving a chapter to another Part moves no test files.

## Current gaps

Where the code differs from this spec today:

- **Stored chapter numbers.** Files are named `NN-slug.svx`; `buildsOn`, the glossary, quiz,
  end-to-end stages, model names, and the recap diagram store numbers; the prose has about 96
  literal "Ch N" references, and some widgets, data files, and code comments have more.
- **No chapter folders.** All 59 widgets share `components/widgets/`, the curriculum lives in
  `chapters/meta.ts`, hand-written data in `src/lib/data/`, and fact and e2e tests are grouped by
  Part (`tests/unit/part-N-facts.test.ts`, `tests/e2e/part-N.e2e.ts`).
- **Untyped data loading.** There is no dataset registry or envelope. `loadJson<T>` casts without
  checking, 18 widgets declare their own data types, and only traces have a parser.
- **Data loads after hydration.** `loadJson` stays pending during prerendering, so prerendered pages
  show loading states for every recorded widget.
- **Providers mostly unused.** Only `GlassBoxGenerator` uses `ModelProvider`; `PromptVariants` and
  `EmbeddingMap` call the browser model directly.
- **Standalone scripts.** Each `scripts/build-*.py` repeats model setup and writes its own format,
  and some header comments have drifted from what they record.
- **No enforced layers.** Import boundaries are convention only.
