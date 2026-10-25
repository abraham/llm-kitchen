# Try it visualizations

How the interactive figures in chapters (the widgets labelled "Try it") are rendered: where their
data comes from, how they draw, how they show up before JavaScript runs, how they move, and how
screen readers and phones get them. [components.md](components.md) has the shared components they
build from, and [design.md](design.md) the colors, shapes, and motion rules they follow.

## From prose to pixels

- A chapter's `chapter.svx` imports its widgets and places each between paragraphs. A widget lives
  in its chapter's folder, or in `components/widgets/` once a second chapter uses it
  (`GlassBoxGenerator`).
- Every widget renders inside `WidgetFrame`, a `<section class="widget breakout">` named by its
  title (`aria-labelledby`):
  - a header with the "Try it" label, the title, the `DataSourceBadge`, and a Reset button. Reset
    calls the widget's `onreset`, which puts its own state back to the start, and re-creates the
    frame's body (`{#key}`), so components inside it start over too. Every widget with state passes
    `onreset`; `RecordedRuns`, which shows fixed text, has nothing to reset and no button;
  - a body that holds the figure, with `overflow-x: auto`, so anything wider than the frame scrolls
    inside it and never widens the page;
  - an optional footer (`controls` snippet) for step buttons and other inputs, on a tinted strip.
- `.breakout` lets the frame grow past the ~68ch prose column, up to `--wide` (about 1100px).
- A widget's state is `$state` in its script; everything it draws is `$derived` from that state and
  its data, so a control changes the state and the figure follows. Nothing is drawn imperatively.

## Where the data comes from

The badge says which of four sources a widget shows (a widget with a live option shows two), and
the widget's code follows from it:

| Badge                        | Where the numbers come from                                                                                                                                                                                                                                                                |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Recorded · &lt;model&gt;** | A dataset in `static/data/`, read with `useDataset(id)` and rendered through `Loading`. The datasets a chapter shows on first view are fetched by the route and inlined in the page, so they're there synchronously; others load in the browser ([architecture.md](architecture.md#data)). |
| **Computed in your browser** | Pure functions in `math/` or `harness/`, called in `$derived`. The chapter's `facts.test.ts` runs the same functions to check the numbers its prose states.                                                                                                                                |
| **Live · &lt;model&gt;**     | A model in the inference worker, after the visitor asks for it (`ModelConsent`; [downloads.md](downloads.md)). The widget shows recorded data until then and keeps the same figure.                                                                                                        |
| **Made-up example**          | Hand-written values in the widget or its chapter's `data.ts`, for an idea no recording shows well (`QKVExplainer`, `TrainingStages`, `GenerationStepper`).                                                                                                                                 |

- Work too heavy for the main thread runs in a worker and the figure renders its result when it
  arrives: tokenizing ([workers.md](workers.md#the-tokenizer-worker)), live models, and the tiny
  model `TinyTrainer` trains. Short loops the visitor starts run in the page a frame at a time
  (`FrameLoop`).
- `Loading` renders data that's already here at once, a "Loading recorded data…" line while a fetch
  is pending, and the error (`role="alert"`) if it fails. It reserves 6rem, so a figure that loads
  late doesn't push the page much.

## How figures draw

There are three ways to draw, picked by what the figure is. No widget uses canvas, WebGL, or a
chart library.

- **HTML and CSS** for anything that is text or a list of things: token chips (`TokenChip`), vector
  cells (`VectorStrip`), probability bars (`ProbBars`), prompts and chats (`PromptText`,
  `ChatLog`), tool calls (`ToolCallCard`), and tables (16 widgets, styled by `table.data`). Text
  wraps, can be selected and copied, and is read as text.
  - `ProbBars` is a `<table>`: each row is a token (`<th>`) and its percentage, with the bar a CSS
    width beside the number, so the bars are also a readable table.
  - Shaded cells set `--p` and get their background from `td.heat` in `global.css`.
- **Hand-written SVG** for geometry: curves, maps, networks, arcs, grids, and wheels (19
  components, among them `LossCurve`, `AttentionLines`, `NextWordFan`, `SamplerWheel`,
  `EmbeddingMap`, `NeuronPlayground`, `LayerPlayground`, `ScalingLawChart`, `DecisionGrid`, and
  `KVCacheStepper`). Every chapter figure draws through `Figure` (`components/ui/`), which renders
  the `<svg>`, names it, and sizes it one of two ways (see [Sizes](#sizes)).
  - Values map to positions through scales from `math/scale.ts`: `scaleLinear` and `scaleLog`
    (map, `invert`, and `ticks(count)`), with `niceTicks` picking round steps of 1, 2, or 5. Paths
    are built as strings (`M x y L …`) from them. `Axis` (`components/ui/`) draws ticks, tick
    labels, gridlines, an axis line, and a title from a scale, the same in every chart.
  - Layout that needs care is computed too: `EmbeddingMap`'s `placeLabels` tries spots around each
    dot and skips labels that would overlap, keeping the important words with a leader line. At a
    narrower width fewer unimportant labels fit, so a phone shows fewer of them.
  - Strokes and fills come from scoped classes that use the concept tokens (`stroke: var(--c-loss)`),
    so switching theme recolors a figure without re-rendering it. Values that vary per element
    (opacity, stroke width) are `style:` directives.
  - Thin lines, direct labels instead of legends, and no gridlines unless the reading needs them
    ([design.md](design.md#direction)).
- **HTML controls over or beside an SVG** wherever the figure is something to click: the clickable
  words in `AttentionLines` are real `<button>`s positioned beside the arcs, not SVG shapes.

Concept colors and shapes are the ones in [design.md](design.md#concept-colors-and-shapes); a
figure never uses a concept's color for something else, and never color alone.

### Sizes

Text in a figure is never smaller than 11px on screen, at any width. `Figure` gets there two ways:

- **Redrawn** (`bind:width`, `height`, `max`): charts whose layout comes from scales. The figure
  measures the room it has (`bind:clientWidth`) and the widget redraws at that width in CSS pixels,
  up to `max`, so text sizes in CSS are the sizes on screen. The height is fixed, so a figure
  doesn't move the page when it hydrates and redraws; before then it's drawn at its starting width
  and scaled to fit that box. `ScalingLawChart`, `KVCacheStepper`, `RoutingCascade`,
  `LossLandscape`, `CurveFitter`, `LossCurve`, `EmbeddingMap`, `NextWordFan`, `QuantizeLab`,
  `FragileLab`, and `DecisionGrid`'s histogram redraw.
  - A redrawn figure can change layout when it's narrow: `NextWordFan` moves its prompt above the
    fan, as text, when the two don't fit side by side, and `ScalingLawChart` asks its axis for fewer
    ticks.
- **Scaled** (`viewBox`, optional `maxWidth`): diagrams with a fixed layout (`NeuronPlayground`,
  `LayerPlayground`, `BlockBuilder`, `AttentionMask`, `DiffusionToy`, `DecisionGrid`'s grid,
  `ContextBudget`'s map). The drawing scales to fit, and `Figure` sets `--min-text` to 11px in
  drawing units at the current scale, so text sized `max(12px, var(--min-text))` grows just enough
  to stay readable when the diagram shrinks.
- `AttentionLines` measures its own width for the same reason, and `SamplerWheel` is a fixed size.
- A figure hides what's drawn past its edges, as SVG does by default; `overflow` shows it, for end
  labels beside a line (`LossCurve`, `NextWordFan`).

## Before JavaScript runs

- Every page is prerendered, and every widget renders its starting state in that HTML: the first
  step, the default settings, and the recorded data inlined by the route. A visitor sees the
  finished figure before the page hydrates, and Lighthouse measures it as such.
- Widgets touch browser APIs only after mounting (in an `$effect` or attachment), so prerendering
  never runs them. Live models, tokenizer results, and anything measured from the layout appear
  after hydration, in place of the starting state.
- `quality.e2e.ts` checks that no prerendered page says "Loading recorded data". The root layout
  sets `data-hydrated` on `<html>` when the app has hydrated, and e2e tests wait for it before
  interacting.

## For screen readers and keyboards

- **Figures are images with a description of now.** `Figure` requires a `label`, which it renders
  as the SVG's `role="img"` name, and each widget builds it from the same state the drawing is:
  `LossCurve` says where the loss started and where it is now; `ScalingLawChart` what the curve
  shows. Drawn elements with a meaning (`TokenChip`, `VectorStrip`) and the SVGs outside `Figure`
  (`AttentionLines`, `SamplerWheel`) have their own `role="img"` and label; decorative icons are
  `aria-hidden`. The label changes with the figure.
- **Data is also text.** Tables, `ProbBars`' visually hidden caption and header row, and the
  `Status` line under a figure (a polite live region) say what changed in words. A chart whose
  numbers aren't in the prose or a table nearby offers them in `FigureData`, a closed "The numbers"
  disclosure holding a `table.data`: `ScalingLawChart` (each GPT-2 size and its predicted loss) and
  `KVCacheStepper` (the milliseconds for every new token, with and without the cache).
- **Every interaction has a control.** Anything the visitor can do by pointing at a figure can be
  done with a button, radio, slider, or select, which keyboards and screen readers reach. Picking a
  point in a plane goes through the `pointer` attachment (`components/ui/pointer.ts`): pointer
  events, so a mouse,
  pen, or finger works, reporting where the pointer is as fractions of the element, which the
  widget maps back to values with its scale's `invert`. The element sets `touch-action: none`, so
  dragging on a phone moves the point, not the page. Clicking or dragging in `LayerPlayground`'s
  output plane moves the input point; the two sliders beside it do the same. Clicking a word on the
  map in `EmbeddingMap` selects it, as the Word select does. Nothing depends on hover.
- **Stepping** (14 widgets) goes through `StepController`: Prev and Next buttons, ← and → (Home
  and End jump), and a visually hidden live region that reads the current step's description. The
  buttons use `aria-disabled` at either end, so focus and the arrow keys keep working.

## Motion

- **Stepped figures** change state, and the elements that move animate with CSS transitions that
  use the `--duration` (300ms) and `--ease` tokens. `tokens.css` sets `--duration` to 0 under
  `prefers-reduced-motion`, so those widgets jump to the new state with no code of their own.
- **Svelte motion** is used where CSS can't do it: `TokenToVector` morphs each token chip into its
  vector row with `crossfade` (shared keys), and `SamplerWheel` spins with a `Tween`. Both take
  their durations from `motion.duration(ms)` (`stores/motion-prefs.svelte.ts`), which is 0 under
  reduced motion.
- **Playback** (`DiffusionToy`, `DecisionGrid`, `ThinkingToggle`) and continuous loops (`FrameLoop`
  in `CurveFitter`, `DiffusionToy`, and `RecurrentMemory`) skip to the end state under reduced
  motion.
- **One path.** Script reads reduced motion only through `motion` (`motion.reduced`,
  `motion.duration(ms)`), and CSS only through `--duration`. ESLint rejects importing
  `prefersReducedMotion` anywhere else, and `tests/unit/figures.test.ts` rejects a component that
  names it or writes its own `prefers-reduced-motion` query.
- One main motion at a time, 200–600 ms ([design.md](design.md#motion)).

## On phones

- The frame spans the screen width, figures redraw or scale to fit with their text at 11px or more
  ([Sizes](#sizes)), and wide tables scroll sideways inside the frame's body or a `ScrollBox`.
  `quality.e2e.ts` checks every page at 375px for sideways scrolling and for SVG text rendered
  smaller than 11px.
- `StepController` hides its "or use ← → keys" hint on touch screens (`hover: none`).

## Tests

- **Numbers:** each chapter's `facts.test.ts` checks that the functions and data its widgets draw
  from produce what the prose says, and `math/scale.test.ts` checks the scales and ticks.
- **Markup:** shared `ui/` and `primitives/` components are rendered with `svelte/server` and their
  prerendered HTML checked for names, roles, and initial values ([components.md](components.md#testing));
  `ui/figures.test.ts` covers `Figure`, `Axis`, and `FigureData`.
- **Rules:** `tests/unit/figures.test.ts` fails on an SVG that is neither named (`role="img"` and a
  label) nor hidden, a chapter that writes `<svg>` instead of using `Figure`, and a component that
  reads reduced motion itself.
- **Behavior:** each chapter's `chapter.e2e.ts` drives its widgets the way a visitor does, finding
  controls by role and figures by their image names (for example
  `getByRole('img', { name: /Vector for cat/ })`). `interaction.e2e.ts` steps a recorded generation
  with the keyboard, with and without reduced motion.
- **Every page:** `quality.e2e.ts` runs axe in light and dark, checks the prerendered HTML, phone
  width and figure text size, and the JavaScript budget; the Lighthouse suite keeps performance and
  accessibility at 95 or above.
- **Looks:** `tests/visual/` keeps screenshots, locally only: one representative widget per Part in
  light and dark, and every widget with an SVG figure on a desktop and on a phone.

## Decisions

- **SVG, not canvas.** Every figure is small (one of the largest, `LayerPlayground`'s shaded plane,
  is 40 × 40 cells), so SVG costs nothing in speed and gives what canvas can't: it's in the
  prerendered HTML, it's sharp at any zoom, it's styled by the same tokens as the page (so themes
  and contrast tests cover it), its text is real text, and e2e tests can query it.
- **No chart library.** Each figure is a few dozen lines of scales and paths. A library would cost
  more of the 150 KB JavaScript budget ([quality.md](quality.md)) than all the figures together,
  and would bring its own look instead of the site's. `math/scale.ts` is the part of one the
  figures share, in under a hundred lines.
- **Redraw charts, scale diagrams.** A chart's layout comes from its scales, so drawing it at the
  real width costs nothing and keeps text, line widths, and dots their designed size. A diagram's
  layout is hand-placed, so it scales as a whole and only its text is held at a readable size.
- **Fixed heights for redrawn figures.** Only the width follows the room there is, so hydrating and
  redrawing never moves the content below.
- **HTML for text-shaped things.** Tokens, prompts, and bars of labelled values wrap, reflow, and
  read better as HTML than as positioned SVG text, and a bar chart that is a table needs no extra
  description.
