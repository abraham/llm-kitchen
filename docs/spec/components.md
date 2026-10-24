# Components

How shared Svelte components are organized, what each folder may contain and import, the
conventions every component follows, and the common set widgets build from. Parts marked
**Planned** in [Status](#status) aren't built yet; [Migration](#migration) orders the work.

## Goals

- **A widget is mostly its idea.** The code in a chapter's widget is the concept it teaches: its
  state, its data, and its figure. Pickers, sliders, scroll boxes, live status lines, and prompt
  text come from shared components, so each is written, styled, and made accessible once.
- **The same thing looks and behaves the same everywhere.** A radio group, a slider readout, or a
  user message is identical across chapters, the way a `TokenChip` already is.
- **Accessibility is built in, not repeated.** Every control requires an accessible name, ids
  come from `$props.id()`, live regions exist before they change, and scroll boxes are focusable.
  A widget can't forget them because it doesn't write them.
- **Complete before JavaScript.** Components render their initial state in the prerendered HTML and
  touch browser APIs only after mounting, as [architecture.md](architecture.md) requires of pages.

## Folders

```
src/lib/components/
  ui/           generic controls and containers; know nothing about LLMs
  primitives/   concept visuals: one per idea in design.md (tokens, vectors, roles, ...)
  frame/        widget chrome: the frame, data source, loading, consent, stepping, looping
  page/         the chapter page and what prose embeds: shell, nav, references, glossary
  widgets/      whole widgets used by two or more chapters
```

| Folder        | Contents                                                                                                                                                               |
| ------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ui/`         | `Choice`, `Slider`, `Toggle`, `ScrollBox`, `Status`, `Compare`; the `scrollable` attachment; the `Concept` type                                                        |
| `primitives/` | `TokenChip`, `VectorStrip`, `ProbBars`, `SamplerWheel`, `NextWordFan`, `AttentionLines`, `LossCurve`, `ToolCallCard`, `PromptText`, `ChatLog`; `format.ts`, `roles.ts` |
| `frame/`      | `WidgetFrame`, `DataSourceBadge` (`data-source.ts`), `Loading`, `ModelConsent`, `StepController` (`stepper.svelte.ts`), `Scrolly`, `FrameLoop` (`loop.svelte.ts`)      |
| `page/`       | `ChapterLayout`, `ProgressNav`, `PageMeta`, `IngredientsBox`, `RecapCard`, `Sources`, `CitationScope`, `ChapterRef`, `Cite`, `GlossaryPopover`                         |
| `widgets/`    | `GlassBoxGenerator`                                                                                                                                                    |

Where a new component goes:

1. Used by one chapter: it stays in that chapter's folder.
2. A native element needs the same one or two declarations in several widgets: a rule in
   `global.css`, not a component (see [Global styles](#global-styles)).
3. Markup, ARIA wiring, or behavior repeated by a second chapter, with no concept in it: `ui/`.
4. A visual for a concept with a color and shape in [design.md](design.md): `primitives/`.
5. Something every widget wears or uses to step, load, or animate: `frame/`.
6. Something the chapter page or its prose renders outside widgets: `page/`.
7. A whole widget with its own state and data that a second chapter uses: `widgets/`. It moves back
   when only one chapter uses it.

## Layers

Imports point down this list. ESLint enforces it with one `layer()` entry per folder in
`eslint.config.js`, as for the rest of `src/lib` (see [architecture.md](architecture.md#layers)).

| Folder        | May import from `#lib/components/` | Never imports                                                                |
| ------------- | ---------------------------------- | ---------------------------------------------------------------------------- |
| `widgets/`    | `ui/`, `primitives/`, `frame/`     | chapters, `page/`                                                            |
| `page/`       | `ui/`                              | chapters, widgets, `primitives/`, `frame/`, dataset loaders (types are fine) |
| `frame/`      | `ui/`                              | chapters, widgets, `primitives/`, `page/`, dataset loaders (types are fine)  |
| `primitives/` | `ui/`                              | chapters, widgets, `frame/`, `page/`, dataset loaders (types are fine)       |
| `ui/`         | nothing outside `ui/`              | everything else in `#lib` except types                                       |

Chapters may import any component folder. `ui/` stays free of LLM vocabulary so its components
read as plain controls in tests and reviews; anything that knows what a token or a role is lives in
`primitives/`.

## Conventions

Every shared component:

- **Props:** typed in the `$props()` destructure, with defaults there. Generic components use
  `<script lang="ts" generics="T">`. A component exports a type only when callers build values of
  it (as `ProbBars` exports `Bar`).
- **One bindable value.** A control marks only the value it edits as `$bindable` (`value`,
  `checked`). Everything else is one-way.
- **Callbacks, not events.** Notifications are `on<thing>` callback props (`onselect`, `onreset`).
  No `createEventDispatcher`.
- **Snippets for content.** `children` for the main content; named snippets (`controls`, `option`,
  `column`) for the rest. No slots.
- **Required names.** Every control and region takes its accessible name as a required prop
  (`label` or `legend`). `hideLabel` keeps the name for assistive tech and hides it visually; there
  is no way to omit it.
- **Ids from `$props.id()`.** Never hard-coded, so two copies of a widget on one page don't
  collide. Radio `name`s derive from it too.
- **Concept colors by name.** A component that takes a color takes `concept: Concept`
  (`'token' | 'vector' | 'weight' | 'attention' | 'prob' | 'loss' | 'harness'`, from
  `ui/concept.ts`) and maps it to `--c-<concept>` tokens. No raw colors in props.
- **No styling props.** No `class` or `style` props. The parent positions a component through its
  own wrapper; variants are explicit props (`appearance`, `layout`).
- **Tokens only.** Scoped styles use the custom properties in `tokens.css` (`--space-*`,
  `--font-*`, `--c-*`, `--ink*`, `--surface*`, `--rule`, `--radius`). Literal pixels only for
  hairlines.
- **SSR-safe.** No browser globals while initializing. Browser-only setup goes in an attachment or
  an `$effect`; cleanup goes in the `$effect`'s teardown. `onDestroy` also runs during
  prerendering, so it never calls browser APIs.
- **Motion** reads `stores/motion-prefs.svelte.ts`; with reduced motion, durations are 0 and the
  component shows its end state.
- **No data access.** Components get data through props. Only widgets call `useDataset`.

## Global styles

A component exists to share markup and wiring. When the shared part is one or two declarations on a
native element, it goes in `global.css`, and widgets drop their copies:

| Rule                            | Declarations                                                                | Replaces scoped copies in |
| ------------------------------- | --------------------------------------------------------------------------- | ------------------------- |
| `select`                        | `font: inherit; max-width: 100%`                                            | 13 widgets                |
| `input[type='range']`           | `accent-color: var(--accent, var(--c-token))`                               | 12 widgets                |
| `button[aria-pressed='true']`   | the pressed look, in `--c-prob`                                             | 3 widgets                 |
| `table.data` and its `th`, `td` | collapsed borders, `0.85rem`, `tabular-nums` and right-aligned numeric `td` | 13 widgets                |
| `table.data td.heat`            | background mixed from `--c-prob-tint` by `--p` (0–1)                        | the heat-map tables       |

The existing `.label`, `.mono`, `.visually-hidden`, `.prose`, `.breakout`, and `button` rules stay
global.

## The common set

### ui/

**`Choice`** picks one value from a list. It replaces the radio fieldsets (21 widgets), the
`<select>` pickers (14), and the pick-one `aria-pressed` button rows (EndToEnd, ExpertRouter,
NameDecoder).

```ts
type Option<T> = { value: T; label: string; disabled?: boolean };
props: {
	legend: string;
	options: readonly Option<T>[];
	value: T; // $bindable
	appearance?: 'radios' | 'buttons' | 'select'; // default 'radios'
	hideLabel?: boolean;
	option?: Snippet<[Option<T>]>; // custom label content; radios and buttons only
};
```

- `radios` and `buttons` render a `<fieldset>` with a `<legend class="label">` and native radios,
  so arrow keys move the choice and screen readers announce "1 of 3". `buttons` styles the labels
  as a segmented row; the inputs stay radios. `select` renders a `<label>` and a `<select>`.
- Use `select` past about six options or when the labels are long; otherwise `radios`.
- Values are compared with `===`, so any type works (indices, slugs, objects from the data).

**`Slider`** sets a number. It replaces the label, range input, and readout in 13 widgets.

```ts
props: {
	label: string;
	value: number; // $bindable
	min: number;
	max: number;
	step?: number;
	format?: (value: number) => string; // readout and aria-valuetext; default String
	concept?: Concept; // sets --accent; default 'token'
	width?: number; // readout width in ch, reserved so the layout doesn't shift
	hideLabel?: boolean;
};
```

- The readout is an `<output>` tied to the input. Its `min-width` is in `ch` with
  `letter-spacing: normal`, because `ch` ignores inherited letter-spacing.

**`Toggle`** is a labeled checkbox (`label`, `checked` bindable). It replaces 5 widgets'
`<label class="toggle|check">`. A play/pause control is a button with `aria-pressed`, not a
`Toggle`.

**`ScrollBox`** is a focusable scrolling region: a `<div role="region">` named by its required
`label`, with the `scrollable` attachment and an optional `maxHeight`. The scrolling content
(`<pre>`, `<ol>`, `<table class="data">`) is its child. It replaces the 11 widgets that pair
`{@attach scrollable}` with their own overflow styles. `scrollable` stays exported for elements
that must scroll themselves.

- The attachment adds `tabindex="0"` when the page hydrates, so the prerendered HTML has no
  `tabindex`. That keeps Svelte's `a11y_no_noninteractive_tabindex` check meaningful everywhere
  else.

**`Status`** is the line that explains what just happened: a `<p aria-live="polite">` that is
always rendered, even when empty, so screen readers hear its first change. It replaces the
`aria-live` lines in 26 widgets. `children` is the text.

**`Compare`** lays out two or more labeled versions side by side and stacks them on narrow screens:
off and on, base and instruct, before and after.

```ts
props: {
	items: readonly T[];
	label: (item: T, index: number) => string; // each column's heading
	column: Snippet<[T, number]>;
	min?: string; // narrowest column before stacking; default '16rem'
};
```

- Each column is a `<section aria-labelledby>` with a small heading, in an
  `auto-fit, minmax(min, 1fr)` grid. It replaces the hand-built grids in BaseVsInstruct,
  ThinkingToggle, SpeculativeStepper, and CurveFitter.

### primitives/

**`PromptText`** renders the raw text a model reads, colored by who wrote each part. It replaces the
colored-span `<pre>` blocks in EndToEnd, PromptInspector, ChatTemplate, SystemPrompts, and
InjectionLab.

```ts
type PromptPart = { text: string; role: Role };
props: {
	parts: readonly PromptPart[];
	label: string; // the ScrollBox name
	legend?: boolean; // a key of the roles present, replacing the hand-built legends
	plain?: boolean; // one color, as InjectionLab's "what the model sees" toggle shows
};
```

**`ChatLog`** renders the same conversation as a chat app shows it: an `<ol>` of messages, each
labeled with its role in text. It replaces the `<ol class="chat">` lists in ChatTemplate,
PromptInspector, and EndToEnd.

`roles.ts` holds the `Role` type and one table both use. Roles aren't concepts in
[design.md](design.md), so this is the one place concept colors stand for something else; every
role is also named in text or set off by its template marker, so color is never the only cue.

| Role          | Written by                         | Color                       |
| ------------- | ---------------------------------- | --------------------------- |
| `marker`      | the chat template                  | token ink on token tint     |
| `system`      | the developer, sent by the harness | harness ink on harness tint |
| `user`        | the visitor                        | prob ink on prob tint       |
| `assistant`   | the model                          | vector ink                  |
| `tool-call`   | the model, for the harness         | harness ink                 |
| `tool-result` | the harness, from the tool         | harness tint, dashed edge   |
| `document`    | retrieved text the harness inserts | vector tint                 |
| `attack`      | an attacker, inside a document     | loss ink on loss tint       |

- This keeps the colors three of the five widgets already use. It changes SystemPrompts' user text
  (token to prob) and the tool result in PromptInspector (attention) and EndToEnd (loss), which were
  the outliers.

`format.ts` gains `formatCount(n)` (`toLocaleString('en-US')`), which 13 widgets call inline.

### frame/

**`FrameLoop`** (`loop.svelte.ts`) runs a step function once per animation frame until it returns
`false` or is paused. It replaces the hand-written `requestAnimationFrame` loops in CurveFitter,
DiffusionToy, and RecurrentMemory.

```ts
class FrameLoop {
	constructor(step: () => boolean); // create during component init
	readonly running: boolean;
	start(): void;
	stop(): void;
	toggle(): void;
}
```

- The constructor registers an `$effect` whose teardown stops the loop, so a widget can't leak a
  frame callback after it unmounts and nothing runs during prerendering.

The existing `WidgetFrame`, `StepController` and `Stepper`, `Loading`, `Scrolly`, `ModelConsent`,
and `DataSourceBadge` keep their APIs and move here from `layout/`.

## Not shared, on purpose

- **No table component.** The tables differ in what their cells hold (numbers, heat, buttons, token
  chips). A data-driven table would need a snippet per column and read worse than the markup.
  `table.data` and `ScrollBox` cover what they share.
- **No button component.** The global `button` rule and native `aria-pressed` and `disabled` are
  enough.
- **No card, badge, or stat component.** Each appears once or twice. They move to `ui/` if a second
  chapter needs the same markup.

## Testing

- Each `ui/` and `primitives/` component has a colocated `*.test.ts` that renders it with `render`
  from `svelte/server` in Vitest's Node environment and checks the prerendered markup: accessible
  names, roles, ids tied to labels, the initial value, and no `tabindex` in the server output.
  `Stepper`, `FrameLoop`, `format.ts`, and `roles.ts` have plain unit tests.
- `tests/unit/component-patterns.test.ts` fails when a chapter widget hand-writes something the
  common set provides: `<fieldset`, `<select`, `type="range"`, `type="checkbox"`, `aria-live`,
  `requestAnimationFrame`, or scoped `select`, `input[type='range']`, or `table` rules. Each pattern
  allows a short list of named exceptions, with the reason next to it.
- Behavior stays covered where it's visible: each chapter's `chapter.e2e.ts` and the axe pass in
  `quality.e2e.ts`. A migration that changes how a test finds a control (a button that becomes a
  radio) updates the locator to the role the visitor now meets.

## Migration

One pull request per step. Each one passes every check in [quality.md](quality.md), including the
local visual tests; any screenshot that changes is reviewed and its baseline updated in the same
pull request.

1. **Global styles.** Add the rules in [Global styles](#global-styles) and delete the scoped copies.
   No visible change.
2. **Folders.** Split `layout/` into `frame/` and `page/`, move `scrollable.ts` to `ui/`, add the
   ESLint layers, and update imports in chapters, `.svx` files, and routes (about 280 import lines,
   all mechanical). Update the source layout in [architecture.md](architecture.md).
3. **Controls.** `Choice`, `Slider`, and `Toggle`, then migrate their widgets. The pick-one button
   rows become `appearance="buttons"`.
4. **Containers.** `ScrollBox`, `Status`, and `Compare`, then migrate.
5. **Prompts.** `roles.ts`, `PromptText`, and `ChatLog`, then migrate. This is the only step with
   intended color changes (see the role table).
6. **Loops.** `FrameLoop` and `formatCount`, then migrate.
7. **Guard.** Add `component-patterns.test.ts` once nothing it checks is left, and list the common
   set in [design.md](design.md)'s shared elements.

When a step lands, its components move to **Built** below.

## Status

| Component                                                                                                                                      | Folder                  | Status              |
| ---------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------- | ------------------- |
| `WidgetFrame`, `StepController`, `Loading`, `Scrolly`, `ModelConsent`, `DataSourceBadge`                                                       | `layout/` → `frame/`    | Built; move planned |
| `ChapterLayout`, `ProgressNav`, `PageMeta`, `IngredientsBox`, `RecapCard`, `Sources`, `CitationScope`, `ChapterRef`, `Cite`, `GlossaryPopover` | `layout/` → `page/`     | Built; move planned |
| `scrollable`                                                                                                                                   | `layout/` → `ui/`       | Built; move planned |
| `TokenChip`, `VectorStrip`, `ProbBars`, `SamplerWheel`, `NextWordFan`, `AttentionLines`, `LossCurve`, `ToolCallCard`                           | `primitives/`           | Built               |
| `GlassBoxGenerator`                                                                                                                            | `widgets/`              | Built               |
| Global styles                                                                                                                                  | `global.css`            | Planned             |
| `Choice`, `Slider`, `Toggle`                                                                                                                   | `ui/`                   | Planned             |
| `ScrollBox`, `Status`, `Compare`                                                                                                               | `ui/`                   | Planned             |
| `PromptText`, `ChatLog`, `roles.ts`                                                                                                            | `primitives/`           | Planned             |
| `FrameLoop`, `formatCount`                                                                                                                     | `frame/`, `primitives/` | Planned             |
| `component-patterns.test.ts`                                                                                                                   | `tests/unit/`           | Planned             |
