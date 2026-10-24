# Architecture

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
      parts.ts                   the Parts, in order (Roman numerals derived)
      curriculum.ts              one row per chapter: slug, title, part, buildsOn (slugs), description
      index.ts                   CURRICULUM, chapter(slug), label(slug), next(slug), the Slug type
    chapters/
      index.ts                   loads chapter.svx and chapter.ts by slug (import.meta.glob)
      <slug>/
        chapter.svx              the prose
        chapter.ts               the datasets its widgets show on first view
        *.svelte                 widgets only this chapter uses
        data.ts                  hand-written data only this chapter uses, if any
        facts.test.ts            the numbers and claims the prose states
        chapter.e2e.ts           its widgets in a browser
    components/
      primitives/                shared visual elements (see design.md); props in, events out
      widgets/                   widgets used by two or more chapters
      layout/                    chapter shell, WidgetFrame, StepController, ChapterRef, Cite, ...
    data/                        hand-written data shared by chapters and logic (the nursery rhymes)
    datasets/
      check.ts                   small typed checks for untrusted JSON
      parsers/                   one parser per dataset shape (trace, agent run, injection lab, ...)
      registry.ts                every recorded dataset: id, file, parser, script, and version
      load.ts                    fetchDataset (route loads) and loadDataset (browser, cached)
      use.ts                     provideDatasets, useDataset(s), and all/then for maybe-loaded data
      read.ts                    readDataset for tests and Node scripts
    models/                      ModelProvider, RecordedProvider, BrowserProvider, tokenizers
    workers/                     the inference and trainer workers, with typed messages
    math/                        pure numeric code: sampling, BPE, MLP and backprop, attention, ...
    harness/                     pure toy harness: tools, agent loop, caching, injection
    stores/                      progress, motion preferences
    glossary.ts                  terms, definitions, and the slug of the chapter that introduces each
    references.json              the bibliography
    site.ts                      name, tagline, description, origin, URL helpers
  styles/                        tokens.css, global.css
static/
  data/                          recorded datasets (canonical-model ones under a folder per model)
  vision/                        the pictures the CLIP recording draws
  og/                            generated social images (git-ignored)
models/canonical.json            the canonical small model
models/embedder.json             the embedding model
scripts/
  record/                        Python package: common.py plus one module per recording
  build-og.ts                    social images
tests/
  unit/, e2e/                    checks that span the site: curriculum and spec, citations,
                                 consistency, datasets, branding, hosting, quality
  visual/                        screenshots (local only)
```

## Layers

Imports only point down this list, enforced by ESLint (`@typescript-eslint/no-restricted-imports`
per folder in `eslint.config.js`; tests are exempt):

1. **Routes** load a chapter and its data and render the shell.
2. **Chapters** place prose and widgets. A chapter may import shared widgets and its own files, not
   another chapter's.
3. **Widgets** own interaction state (`$state`, steppers) and compose primitives. They get data
   from a dataset or a `ModelProvider` and computation from `math/` or `harness/`.
4. **Primitives and layout** render what they're given. They never import chapters, widgets, or the
   dataset loaders.
5. **Logic** (`math/`, `harness/`, `curriculum/`, and the dataset checks, parsers, and registry) is
   plain TypeScript: no Svelte, `$app`, UI, worker, or browser-model imports, and no browser
   globals.

A widget used by one chapter lives in that chapter's folder. It moves to `components/widgets/` when
a second chapter uses it, and back when only one does. How `components/` is organized, and the
conventions every shared component follows, are in [components.md](components.md).

## Curriculum and chapter identity

- `curriculum.ts` lists chapters in reading order. A chapter's number is its index, a Part's number
  its position in `parts.ts`; neither is written down anywhere in `src/`.
- `buildsOn`, the glossary, quiz questions, end-to-end stages, model-name parts, and the recap
  diagram all refer to chapters by slug.
- Prose refers to another chapter with `<ChapterRef to="attention" />`, which renders a linked
  "Ch N" with the title on hover (`through` makes a range, `title` appends the title, `bare` drops
  "Ch"). Widgets and data use `label(slug)`. A test fails on a literal "Ch" followed by a digit
  anywhere in `src/`.
- [curriculum.md](curriculum.md) keeps numbered tables for people; a test checks them against
  `curriculum.ts`.
- Moving a chapter: move its row in `curriculum.ts` and in curriculum.md. No files are renamed and no
  references are remapped.

## Chapters and routing

- A chapter's URL is `/<slug>` (`cleanUrls`, no trailing slash). `[chapter]/+page.ts` lists every
  slug in `entries()` and loads `chapters/<slug>/chapter.svx` through `import.meta.glob`.
- The route's `load` also fetches the datasets `chapter.ts` names, with SvelteKit's `fetch`, so the
  responses are inlined into the prerendered HTML and replayed when the page hydrates. The page
  passes them down with `provideDatasets`; widgets read them with `useDataset(id)` (or
  `useDatasets()` when the id depends on a prop) and get the data synchronously. Anything not
  preloaded falls back to `loadDataset(id)` in the browser, as the full embedding vectors do for the
  live option. `Loading` renders data that is already here immediately, and a loading line or the
  error otherwise.
- `ChapterLayout` renders the progress rail, the heading, the Ingredients box (from `buildsOn`), the
  prose, and the link to the next chapter.
- A test checks that every curriculum row has a folder with `chapter.svx`, and every folder a row;
  an e2e test checks that no prerendered page says "Loading recorded data".

## Data

### Datasets

- Every recorded file is a **dataset** in `datasets/registry.ts`: an id (`traces/the-cat-sat`,
  `agent/chat`, ...), its file under `static/data/`, the parser that checks and types it, the
  `scripts/record` module that writes it, and its version.
- Every file has the same envelope:
  `{ "dataset": id, "version": n, "script": "record/<module>.py", "models": [{ "id", "revision" }], "generatedAt", "data": … }`.
  `parseDataset` checks the id and version, then the shape of `data`, and returns typed data;
  fields the parser doesn't list are dropped. Widgets never declare their own types for recorded
  data or cast JSON; they import types from `datasets/parsers/`.
- `loadDataset(id)` fetches each file once and caches the parsed result. A parse error names the
  dataset and the path inside it, and `Loading` shows it.
- `tests/unit/datasets.test.ts` parses every file in `static/data/`, fails on files not in the
  registry or entries without a file, fails on a dataset nothing in `src/` uses, and keeps each
  chapter's first-view datasets under 100 KB gzipped. Tests read data with `readDataset(id)`.

### Recording scripts

- `scripts/record/` is one Python package, run from the repository root as
  `scripts/.venv/bin/python -m scripts.record <module>` (or `all`).
- `common.py` writes the envelope (finding each model and its revision in the data), looks up the
  revision of cached model files, reads datasets other modules recorded, and checks
  `models/canonical.json` against GPT-2's config.
- Each module keeps only what is particular to its recording: prompts, decoding settings and seeds,
  and the shape of its data.
- Where Python and TypeScript must agree (the toy tools, the chat template), a unit test replays
  the recorded inputs through the TypeScript code and compares the outputs.

### Hand-written data

Figures typed by hand (scale, Mixtral's sizes, model names, quiz questions, end-to-end stages) live
in the `data.ts` of the chapter that shows them, each with its citation id, and its `facts.test.ts`
checks the numbers the prose states. Data that logic or several chapters share (the nursery rhymes)
lives in `src/lib/data/`.

## Models

- `ModelProvider` (`tokenize`, `nextTokenDistribution`, `generate`, optional `attention` and
  `embed`) is how a widget with a live option gets model output. Its inputs take text or the exact
  tokens so far, since re-tokenizing generated text can split it differently. Each implementation
  reports a `DataSource` for the badge.
  - `RecordedProvider` answers from recorded traces and throws `NotAvailableError` for anything it
    has no recording for, so the widget can offer the live option.
  - `BrowserProvider` wraps a `BrowserModel` running in the inference worker after
    `ModelConsent`: GPT-2 for next tokens (with its tokenizer, trimmed to the context window) or
    MiniLM for embeddings.
- The live toggle swaps which provider a widget asks; nothing else in the widget changes.
- Widgets with no live option (a single recorded trace, agent sessions, the injection lab,
  reasoning runs) read their dataset directly.
- One shared inference worker serves both browser models; its request and response messages are
  discriminated unions shared with `inference-client.ts`. Training runs use `trainer.worker.ts`.
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
- `tests/unit/citations.test.ts` fails if a chapter uses an unknown id or an entry is never cited.

## Tests

- **Next to the code:** unit tests for `math/`, `harness/`, `models/`, and `curriculum/`; each
  chapter's `facts.test.ts` (where its prose states numbers) and `chapter.e2e.ts`.
- **In `tests/`:** checks that span the site: the curriculum and spec, chapter markup, citations,
  GPT-2 numbers against `canonical.json`, datasets, social images, hosting headers, accessibility,
  layout, prerendered data, the JavaScript budget, and screenshots. See [quality.md](quality.md).
- Playwright runs `tests/e2e/**/*.e2e.ts` and `src/**/*.e2e.ts`; Vitest runs `*.test.ts` in `src/`,
  `scripts/`, and `tests/unit/`. Moving a chapter to another Part moves no test files.
