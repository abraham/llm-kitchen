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
  - a header with the "Try it" label, the title, the `DataSourceBadge`, and a Reset button that
    puts the widget's state back to the start (every widget but `RecordedRuns` passes `onreset`);
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
  `KVCacheStepper`).
  - Coordinates are computed in the script: small scale functions (`sx`, `sy`) map values to
    user units, and paths are built as strings (`M x y L …`). Layout that needs care is computed
    too: `EmbeddingMap`'s `placeLabels` tries spots around each dot and skips labels that would
    overlap, keeping the important words with a leader line.
  - Most figures size by `viewBox` with `width: 100%; height: auto`, so they scale with the frame,
    and their text, in user-unit font sizes, scales with them. `AttentionLines` measures its width
    instead (`bind:clientWidth`, 560 before it mounts) and draws at pixel size, so its words stay
    readable on a phone. `SamplerWheel` is a fixed size.
  - Strokes and fills come from scoped classes that use the concept tokens (`stroke: var(--c-loss)`),
    so switching theme recolors a figure without re-rendering it. Values that vary per element
    (opacity, stroke width) are `style:` directives.
  - Thin lines, direct labels instead of legends, and no gridlines unless the reading needs them
    ([design.md](design.md#direction)).
- **HTML controls over or beside an SVG** wherever the figure is something to click: the clickable
  words in `AttentionLines` are real `<button>`s positioned beside the arcs, not SVG shapes.

Concept colors and shapes are the ones in [design.md](design.md#concept-colors-and-shapes); a
figure never uses a concept's color for something else, and never color alone.

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

- **Figures are images with a description of now.** Each SVG and each drawn element with a meaning
  (`TokenChip`, `VectorStrip`) has `role="img"` and an `aria-label` built from the same state the
  drawing is: `LossCurve` says where the loss started and where it is now; `AttentionLines` names
  the three words the selected word attends to most, with their percentages. The label changes
  with the figure.
- **Data is also text.** Tables, `ProbBars`' visually hidden caption and header row, and the
  `Status` line under a figure (a polite live region) say what changed in words.
- **Every interaction has a control.** Anything the visitor can do by pointing at a figure can be
  done with a button, radio, slider, or select, which keyboards and screen readers reach. Clicking
  `LayerPlayground`'s output plane moves the input point as a shortcut; the two sliders beside it
  do the same. Nothing depends on hover.
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
- **Playback** (`DiffusionToy`, `DecisionGrid`) and continuous loops (`FrameLoop` in `CurveFitter`,
  `DiffusionToy`, and `RecurrentMemory`) skip to the end state under reduced motion.
  `DiffusionToy`, `DecisionGrid`, and `ThinkingToggle` read `prefersReducedMotion` directly rather
  than through the motion store.
- One main motion at a time, 200–600 ms ([design.md](design.md#motion)).

## On phones

- The frame spans the screen width, the figure scales down (or, for `AttentionLines`, redraws),
  and wide tables and figures scroll sideways inside the frame's body or a `ScrollBox`.
  `quality.e2e.ts` checks every page for sideways scrolling at 375px.
- `StepController` hides its "or use ← → keys" hint on touch screens (`hover: none`).
- `Scrolly`, the scroll-driven layout (text steps beside a sticky figure on wide screens, the figure
  inline with Prev and Next on narrow ones), exists in `frame/`, but no chapter uses it.

## Tests

- **Numbers:** each chapter's `facts.test.ts` checks that the functions and data its widgets draw
  from produce what the prose says.
- **Markup:** shared `ui/` and `primitives/` components are rendered with `svelte/server` and their
  prerendered HTML checked for names, roles, and initial values ([components.md](components.md#testing)).
- **Behavior:** each chapter's `chapter.e2e.ts` drives its widgets the way a visitor does, finding
  controls by role and figures by their image names (for example
  `getByRole('img', { name: /Vector for cat/ })`). `interaction.e2e.ts` steps a recorded generation
  with the keyboard, with and without reduced motion.
- **Every page:** `quality.e2e.ts` runs axe in light and dark, checks the prerendered HTML, phone
  width, and the JavaScript budget; the Lighthouse suite keeps performance and accessibility at 95
  or above.
- **Looks:** `tests/visual/` keeps screenshots of one representative widget per Part, in light and
  dark, locally only.

## Decisions

- **SVG, not canvas.** Every figure is small (one of the largest, `LayerPlayground`'s shaded plane,
  is 40 × 40 cells), so SVG costs nothing in speed and gives what canvas can't: it's in the prerendered HTML, it's sharp at any
  zoom, it's styled by the same tokens as the page (so themes and contrast tests cover it), its
  text is real text, and e2e tests can query it.
- **No chart library.** Each figure is a few dozen lines of scales and paths. A library would cost
  more of the 150 KB JavaScript budget ([quality.md](quality.md)) than all the figures together,
  and would bring its own look instead of the site's.
- **HTML for text-shaped things.** Tokens, prompts, and bars of labelled values wrap, reflow, and
  read better as HTML than as positioned SVG text, and a bar chart that is a table needs no extra
  description.
