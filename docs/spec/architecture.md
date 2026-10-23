# Architecture

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
    +layout.svelte, +layout.ts   chapter shell; prerender = true
    +page.svelte                 the menu (table of contents)
    [chapter]/+page.ts           loads the chapter by slug; entries() lists every written chapter
  lib/
    chapters/
      NN-slug.svx                one file per chapter, numbered as in curriculum.md
      meta.ts                    PARTS and the curriculum rows: number, title, slug, buildsOn, description
      index.ts                   loads chapter files with import.meta.glob
    components/
      primitives/                shared visual elements (see design.md)
      widgets/                   one or more per chapter (named in each chapter spec)
      layout/                    ChapterLayout, WidgetFrame, DataSourceBadge, StepController, Scrolly,
                                 IngredientsBox, RecapCard, ProgressNav, GlossaryPopover, Cite,
                                 Sources, ModelConsent, PageMeta, Loading
    data/                        hand-written data that tests check: scale, rhymes, model names,
                                 MoE figures, end-to-end stages, quiz
    harness/                     toy agent loop, tools, prompt caching, injection helpers
    math/                        softmax, sampling, bigram, BPE, PCA, hand-written MLP and backprop,
                                 attention, transformer sizes, quantization, speculative decoding,
                                 RNN, router, diffusion, chat templates
    models/                      ModelProvider, recorded and browser providers, tokenizers, loaders
    workers/                     inference.worker.ts (Transformers.js), trainer.worker.ts
    stores/                      progress.svelte.ts, motion-prefs.svelte.ts
    glossary.ts                  terms, definitions, and the chapter that introduces each
    references.json              the bibliography
    site.ts                      name, tagline, description, origin, and URL helpers
  styles/                        tokens.css, global.css
static/                          recorded data (see models-and-data.md) and generated social images
models/canonical.json            the canonical small model
scripts/                         recording scripts (Python) and build-og.ts
tests/                           unit/, e2e/, visual/
```

## Chapters and routing

- A chapter is a row in `meta.ts` plus `src/lib/chapters/NN-slug.svx`. Its URL is `/<slug>`
  (`cleanUrls`, no trailing slash). `curriculum.md` owns the order and numbers; see its "Changing
  the organization" for how to add or move a chapter.
- The menu lists every Part and chapter from `meta.ts`.
- `ChapterLayout` renders the progress rail, the "Ch N. Title" heading, `IngredientsBox` (from
  `buildsOn`), the chapter body, and an "Up next" link.

## Navigation and progress

- Reading is linear, with a progress rail (`ProgressNav`).
- Visited chapters are saved in `localStorage` under `llm-kitchen:visited`.

## Glossary

- Terms live in `src/lib/glossary.ts`, each with a definition and the chapter that introduces it.
- `GlossaryPopover` shows the definition on a term's first use and links to its chapter.
- A test checks that each term's chapter actually mentions the term.

## Citations

- Chapters cite with `<Cite id="..." />`, which renders a numbered footnote link. Each chapter ends
  with a `Sources` list generated from the ids it used.
- Entries live in `src/lib/references.json` (id, authors, title, year, venue, URL or DOI, and an
  accessed date for pages that change).
- `tests/unit/citations.test.ts` fails if a chapter uses an unknown id or an entry is never cited.
