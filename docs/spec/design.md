# Design

## Direction

- **Feel:** warm and editorial, with the interactive figures as the main attraction (in the spirit of
  Bartosz Ciechanowski's explainers and Distill). A warm off-white page in light mode and a warm
  charcoal in dark mode, following `prefers-color-scheme`. Generous white space and almost no
  decoration. Concept colors appear only where their concept does, so they stay meaningful.
- **Kitchen theme in words and structure, not illustration:**
  - The landing page reads like a menu.
  - Each chapter opens with an "Ingredients" box (`IngredientsBox`) linking the earlier chapters it
    builds on.
  - The recap card (`RecapCard`) is styled as a recipe card.
  - No food illustrations competing with the figures.
- **Layout:**
  - Prose sits in a single ~68ch column (`.prose`). Widgets break out wider, up to ~1100px
    (`.breakout`).
  - Scroll-driven figures (`Scrolly`) sit in a sticky column beside the text on desktop. On phones
    they appear inline with Prev/Next buttons, and no interaction depends on hover.
- **Widget frame:** every widget uses `WidgetFrame`, with a "Try it" label, a reset button, step
  controls where it steps, and a `DataSourceBadge` showing where its data comes from: **Recorded ·
  &lt;model&gt;**, **Live · &lt;model&gt;**, **Computed in your browser**, or **Made-up example**.
- **Typography:** system fonts only: a serif for prose (Iowan Old Style or Charter on Apple devices,
  Georgia on Windows, Noto Serif on Android), the system monospace for tokens and numbers, and the
  system sans for buttons and labels. Nothing is downloaded, so text never reflows after first paint
  (web fonts loaded with `font-display: swap` caused layout shifts of 0.1 or more on a third of the
  pages). Social images still use Source Serif 4 and JetBrains Mono (`@fontsource-variable`, a dev
  dependency), so they render the same on every machine.
- **Charts:** hand-written SVG. Thin lines with direct labels instead of legends, and no gridlines
  unless needed.

## Concept colors and shapes

Each concept has one color, defined in `src/styles/tokens.css` (`--c-<concept>`, with `-ink` and
`-tint` variants) in light and dark versions:

| Concept                | Color  | Token           | Shape                |
| ---------------------- | ------ | --------------- | -------------------- |
| Text and tokens        | Amber  | `--c-token`     | Rounded chips        |
| Vectors and embeddings | Teal   | `--c-vector`    | Square cells         |
| Weights and neurons    | Violet | `--c-weight`    | Nodes                |
| Attention              | Pink   | `--c-attention` | Arcs and lines       |
| Probabilities          | Blue   | `--c-prob`      | Bars                 |
| Loss and error         | Red    | `--c-loss`      | Curves               |
| Harness and tools      | Slate  | `--c-harness`   | Dashed card outlines |

- Slate rather than green for the harness avoids the red/green pair color-blind visitors most often
  confuse, and a neutral color fits "the harness is ordinary code".
- **Never color alone:** the shape always carries the concept too.
- Every text-on-color pair passes WCAG AA contrast in both themes (`tests/unit/tokens.test.ts`).

## Shared elements

Built once in `src/lib/components/primitives/` and reused in every chapter that shows the concept:
`TokenChip` (a chip with the token ID in small mono text underneath), `VectorStrip` (a row of
colored cells), `ProbBars`, `SamplerWheel`, `NextWordFan`, `AttentionLines`, `LossCurve`, and
`ToolCallCard`. A token chip looks the same everywhere.

Transitions between representations use shared-element morphs (Svelte `crossfade` with shared keys,
plus `flip` for reordering), for example a token chip becoming a vector strip.

## Motion

- 200–600 ms easing, one main motion at a time.
- Every stepped animation is driven by `StepController`: Prev/Next buttons, ← and → keys, and scroll
  where the figure is scroll-driven.
- With reduced motion (the OS setting, read through `prefersReducedMotion` from `svelte/motion` in
  `stores/motion-prefs.svelte.ts`), durations drop to 0 and widgets jump to the end state.

## Branding

- **Name:** **LLM Kitchen** wherever a person reads it: page titles, the menu heading, the chapter
  header link, meta descriptions, and the README. The repo, package, Firebase project, code
  identifiers, and the `llm-kitchen:visited` storage key keep `llm-kitchen`, so saved progress
  survives. The name, tagline, description, and origin live in `src/lib/site.ts`.
- **Mark:** a bowl holding three ingredients in the token, vector, and attention colors. It is the SVG
  favicon (`src/lib/assets/favicon.svg`, adapting to dark mode with `prefers-color-scheme` inside the
  SVG), the 180px `apple-touch-icon.png`, and part of every social image. Each color scheme has its
  own `theme-color`.
- **Page metadata:** every page has `og:title`, `og:description`, `og:type` (`website` for the menu,
  `article` for chapters), `og:url`, `og:image` (with size and alt text), `og:site_name`,
  `twitter:card` (`summary_large_image`), and `<link rel="canonical">`, rendered by `PageMeta`.
  Absolute URLs use `SITE_ORIGIN` (https://llm.kitchen). Chapter titles and descriptions come from
  `curriculum.ts`, so no chapter writes its own tags.
- **Social images:** a 1200 × 630 PNG per page (the menu and each chapter) with the mark, "LLM
  Kitchen", the chapter number and title, and its Part, in the site's fonts and colors.
  `scripts/build-og.ts` renders them from one SVG template with resvg as the first step of
  `npm run build`, writing to `static/og/` (git-ignored). resvg ignores the variable font's weight
  axis, so headings are thickened with a matching stroke.
