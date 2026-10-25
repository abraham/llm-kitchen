# Design

## Direction

- **Feel:** warm and editorial, with the interactive figures as the main attraction (in the spirit of
  Bartosz Ciechanowski's explainers and Distill). A warm off-white page in light mode and a warm
  charcoal in dark mode, following `prefers-color-scheme` unless the visitor picks light or dark
  in the app bar. Generous white space and almost no
  decoration. Concept colors appear only where their concept does, so they stay meaningful.
- **Kitchen theme in words and structure, not illustration:**
  - The landing page reads like a menu.
  - Each chapter opens with an "Ingredients" box (`IngredientsBox`) linking the earlier chapters it
    builds on.
  - The recap card (`RecapCard`) is styled as a recipe card.
  - No food illustrations competing with the figures.
- **Layout:**
  - Every page starts with an app bar (`AppBar`) that stays at the top of the viewport as the page
    scrolls (`--app-bar-height`; in-page links and the chapter rail sit
    below it): the site name on the left, linking to the menu, and on the right a Models link (an
    icon for the chosen model tier, named and titled "Models: Recorded" or the tier's name, with a
    progress ring while the tier downloads, to the page in [downloads.md](downloads.md)) and a
    theme toggle.
    The toggle steps through Auto (the system setting, the default), Light, and Dark; its name says
    which ("Theme: Light") and its icon shows it (half-filled circle, sun, or moon). Light and dark
    are saved (`stores/theme.svelte.ts`) and an inline script in `app.html` applies them before the
    page paints; Auto saves nothing. Colors are `light-dark()` pairs in `tokens.css`, and a choice
    sets `color-scheme` on the root and points the browser's `theme-color` at its page color.
  - The app bar also has an "Explanations" control (visually hidden legend) between the name and
    the other buttons: three radios in one bordered group, Simple, Standard, and In depth (see
    [architecture.md](architecture.md#explanation-levels)), each drawn as a density icon with more
    lines for more detail. Only the selected one shows its name beside its icon; the other two show
    the icon alone, keep their names for screen readers, and show them as a tooltip. Which one looks
    selected comes from the root's `data-level`, so it's right before the page hydrates. On the
    narrowest phones the site name truncates so every control stays on screen. The names
    have no descriptions; a chapter at a level it hasn't been written for says so under its
    heading. Changing it switches at once and keeps
    the block at the top of the content where it was; if the new level hides that block, the shared
    block before it stays put, so the replacement passage appears in the same place.
  - Every page ends with a footer (in `+layout.svelte`, outside `main`): "Made by Abraham
    Williams", with the name linking to `https://abrah.am/`, then "Source on GitHub", linking to
    the repository (`REPO_URL` in `site.ts`).
  - Prose sits in a single ~68ch column (`.prose`). Widgets break out wider, up to ~1100px
    (`.breakout`). On phones no interaction depends on hover, and figure text stays at 11px or more
    ([visualizations.md](visualizations.md#sizes)).
- **Widget frame:** every widget uses `WidgetFrame`, with a "Try it" label, a reset button, step
  controls where it steps, and a `DataSourceBadge` showing where its data comes from: **Recorded ·
  &lt;model&gt;**, **Live · &lt;tier&gt; · &lt;model&gt;** (beside a "Show the recording" switch),
  **Computed in your browser**, or **Made-up example**.
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
`ToolCallCard`. A token chip looks the same everywhere. Prompts use `PromptText`, `ChatLog`, and
`RoleKey`, which color each part by who wrote it from one table in `roles.ts`.

Controls and containers come from `src/lib/components/ui/` (`Choice`, `Slider`, `Toggle`,
`ScrollBox`, `Status`), so a picker or a slider looks and behaves the same in every widget. See
[components.md](components.md).

Transitions between representations use shared-element morphs: `TokenToVector` turns each token
chip into its vector row with Svelte's `crossfade` and shared keys. [visualizations.md](visualizations.md)
has how figures draw and move.

## Motion

- 200–600 ms easing, one main motion at a time.
- Figures animate in the first time they come into view: lines draw, bars grow, and the rest fades
  in, sweeping from the top left ([visualizations.md](visualizations.md#motion)).
- Every stepped animation is driven by `StepController`: Prev/Next buttons and ← and → keys.
- With reduced motion (the OS setting, read only through `motion` in
  `stores/motion-prefs.svelte.ts` and the `--duration` token), durations drop to 0 and widgets
  jump to the end state.

## Branding

- **Name:** **LLM Kitchen** wherever a person reads it: page titles, the menu heading, the chapter
  header link, meta descriptions, and the README. The repo, package, Firebase project, code
  identifiers, and the `llm-kitchen:visited` storage key keep `llm-kitchen`, so saved progress
  survives. The name, tagline, description, and origin live in `src/lib/site.ts`.
- **Mark:** hanami dango, three dumplings on a skewer: pink (the attention color), white, and green
  (the vector color), in the skewer's ink outline. It is the SVG favicon
  (`src/lib/assets/favicon.svg`, adapting to dark mode with `prefers-color-scheme` inside the
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
