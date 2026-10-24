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

| Folder        | Contents                                                                                                                                                                          |
| ------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ui/`         | `Choice`, `Slider`, `Toggle`, `ScrollBox`, `Status`; the `scrollable` attachment; the `Concept` type                                                                              |
| `primitives/` | `TokenChip`, `VectorStrip`, `ProbBars`, `SamplerWheel`, `NextWordFan`, `AttentionLines`, `LossCurve`, `ToolCallCard`, `PromptText`, `ChatLog`, `RoleKey`; `format.ts`, `roles.ts` |
| `frame/`      | `WidgetFrame`, `DataSourceBadge` (`data-source.ts`), `Loading`, `ModelConsent`, `StepController` (`stepper.svelte.ts`), `Scrolly`, `FrameLoop` (`loop.svelte.ts`)                 |
| `page/`       | `ChapterLayout`, `ProgressNav`, `PageMeta`, `IngredientsBox`, `RecapCard`, `Sources`, `CitationScope`, `ChapterRef`, `Cite`, `GlossaryPopover`                                    |
| `widgets/`    | `GlassBoxGenerator`                                                                                                                                                               |

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
  own wrapper; variants are explicit props (`appearance`, `layout`). The one hook is
  `--block-space`, which a container sets to control the spacing after controls.
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

| Rule                  | Declarations                                                        | Replaces scoped copies in |
| --------------------- | ------------------------------------------------------------------- | ------------------------- |
| `select`              | `font: inherit; max-width: 100%`                                    | 13 widgets                |
| `input[type='range']` | `accent-color: var(--accent, var(--c-token))`                       | 5 widgets                 |
| `table.data`          | width, collapsed borders, caption, header cells, right-aligned `td` | 5 widgets                 |
| `table.data td.heat`  | background mixed from `--heat` (default `--c-prob-tint`) by `--p`   | FewShot, ExpertRouter     |

- The `table.data` rules sit inside `:where()`, so they have no specificity and any scoped rule in a
  widget overrides them. Tables whose cells are centered grids or prose (KVCacheStepper,
  InjectionLab, ScaleExplorer, FragileLab, and others) keep their own rules.
- Buttons with `aria-pressed` keep their scoped looks: each one that has one also restyles the
  button's border and background, which a global rule can't beat without `!important`.

The existing `.label`, `.mono`, `.visually-hidden`, `.prose`, `.breakout`, and `button` rules stay
global.

## The common set

### ui/

**`Choice`** picks one value from a list. It replaces the radio fieldsets in 18 widgets and the
`<select>` pickers in 13.

```ts
type Option<T> = { value: T; label: string; disabled?: boolean };
props: {
	legend: string;
	options: readonly Option<T>[];
	value: T; // $bindable
	appearance?: 'radios' | 'select'; // default 'radios'
	layout?: 'wrap' | 'stack' | 'inline'; // default 'wrap'
	hideLabel?: boolean;
	option?: Snippet<[Option<T>]>; // custom radio label content
};
```

- `radios` renders a `<fieldset>` with a `<legend class="label">` and native radios sharing one
  name, so arrow keys move the choice and screen readers announce "1 of 3". `select` renders a
  `<label>` and a `<select>`.
- `wrap` puts the name above the options in a row; `stack` puts one option per line; `inline` puts
  the name beside the options.
- Use `select` past about six options or when the labels are long; otherwise `radios`.
- Values are compared with `===`, so any type works (indices, slugs, booleans).
- A widget that must react to a change, not just store it, uses a function binding:
  `bind:value={() => index, choose}`.

Not migrated, on purpose: the graded quiz (its options show right and wrong and lock after
checking); the checkbox groups in LayerPlayground and LiveTokenizer, which pick several; NameDecoder's
model list, which uses `<optgroup>`; and the pick-one buttons drawn inside figures (EndToEnd's
pipeline boxes, ExpertRouter's token cells, NameDecoder's name parts).

**`Slider`** sets a number. It replaces the label, range input, and readout in 11 widgets.

```ts
props: {
	label: string;
	value: number; // $bindable
	min: number;
	max: number;
	step?: number; // default 1
	format?: (value: number) => string; // the readout; default String
	valueText?: (value: number) => string; // aria-valuetext when it differs from the readout
	concept?: Concept; // sets --accent; default 'token'
	width?: number; // readout width in ch, reserved so the layout doesn't shift
	layout?: 'stack' | 'inline'; // label above or beside the track; default 'stack'
};
```

- The readout sits in the label, hidden from assistive tech, which hears `aria-valuetext` instead
  (set whenever `format` is). A reserved `width` is in `ch` with `letter-spacing: normal`, because
  `ch` ignores the label's letter-spacing.
- Not migrated: ContextWindow's slider, whose readout sits mid-sentence ("the last 3 words") beside
  preset buttons, and ResidualStream's, whose label reserves its widest wording.

**`Toggle`** is a labeled checkbox (`label`, `checked` bindable). It replaces the single checkboxes
in EmbeddingMap, ChatTemplate, and InjectionLab. A play/pause control is a button with
`aria-pressed`, not a `Toggle`.

`Choice` and `Slider` end with a bottom margin of `--block-space` (default `--space-3`), so a run
of them spaces itself like paragraphs. A row or grid of controls that spaces its children with
`gap` sets `--block-space: 0`.

**`ScrollBox`** is a focusable scrolling region: a `<div role="region">` named by its required
`label`, with the `scrollable` attachment. It replaces the scroll containers in 10 widgets, and
gives ExpertRouter's sideways-scrolling table the focusability it lacked.

```ts
props: {
	label: string;
	maxHeight?: string; // without one, it scrolls only sideways, for wide tables
	framed?: boolean; // a tinted, bordered panel, for a reply or a log
	children: Snippet;
};
```

- The scrolling content (`<pre>`, `<ol>`, a table, a reply) is its child, so a list keeps its list
  semantics. Text styles such as `white-space: pre-wrap` belong to that child.
- It has no outer margin; the widget spaces what comes after it.
- The attachment adds `tabindex="0"` when the page hydrates, so the prerendered HTML has no
  `tabindex`. That keeps Svelte's `a11y_no_noninteractive_tabindex` check meaningful everywhere
  else. `scrollable` stays exported for prompt text that must scroll itself (see `PromptText`).

**`Status`** is the line under a figure that says what it now shows: a `<p role="status">` (a
polite live region), always rendered so screen readers hear its first change. `lines` (default 2)
reserves that many lines so the page doesn't jump as the text changes length. It replaces the
`.readout` lines in 10 widgets; e2e tests find it with `getByRole('status')`.

- Live regions that are lists, tallies, or styled verdicts (ContextWindow's checks, InjectionDemo's
  files, ToolsDemo's verdict, and others) keep their own markup.

### primitives/

**`PromptText`** renders the raw text a model reads, colored by who wrote each part. It replaces the
colored-span `<pre>` blocks in EndToEnd, PromptInspector, ChatTemplate, SystemPrompts, and
InjectionLab.

```ts
props: {
	parts: readonly { text: string; kind: Role }[]; // the shape chatTemplate() returns
	label: string; // the region's name
	maxHeight?: string; // default '16rem'; 'none' to show it all
	plain?: boolean; // one color, as InjectionLab's "Color by source" toggle shows
	emphasis?: readonly Role[]; // roles set in bold, such as the part a widget is about
	after?: Snippet; // after the last part, such as ChatTemplate's cursor
};
```

- It is a `<pre role="region">` with the `scrollable` attachment rather than a `ScrollBox`, so the
  text keeps one box and one set of text styles. Each part's `<span>` carries `data-role`, which
  e2e tests select by.

**`ChatLog`** renders the same conversation as a chat app shows it: an `<ol>` of system, user, and
assistant messages, each labeled in text ("You", "Assistant"). It replaces the `<ol class="chat">`
lists in ChatTemplate, PromptInspector, and EndToEnd.

**`RoleKey`** is the key under a prompt: a swatch and a label per role, with `off` for roles not
shown yet. It replaces the hand-built legends in PromptInspector and InjectionLab.

`roles.ts` holds the `Role` type and the one table all three use, through `roleStyle(role)` (inline
text style) and `roleSwatch(role)`. Roles aren't concepts in [design.md](design.md), so this is the
one place concept colors stand for something else; every role is also named in text or set off by
its template marker, so color is never the only cue.

| Role                 | Written by                                | Color                       |
| -------------------- | ----------------------------------------- | --------------------------- |
| `marker`             | the chat template                         | token ink on token tint     |
| `system`             | the developer, sent by the harness        | harness ink on harness tint |
| `tools`              | the harness: the tool definitions         | harness ink, italic         |
| `harness`            | the harness, in a toy prompt              | harness ink                 |
| `history`            | earlier turns                             | muted ink                   |
| `user`, `message`    | the visitor (`message`: the latest one)   | prob ink                    |
| `assistant`          | the model                                 | vector ink                  |
| `call`               | the model: a tool call                    | harness ink                 |
| `result`, `document` | text from outside that the harness pastes | ink on vector tint          |
| `attack`             | an attacker, inside a document            | loss ink on loss tint       |

- This keeps the colors most of the widgets already used. SystemPrompts' user text moved from token
  to prob, and the tool result in PromptInspector (attention) and EndToEnd (loss) moved to vector
  tint, the color InjectionLab already gave pasted documents.
- Tinted swatches are outlined in their concept color; a swatch that is `off` is plain grey.

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
and `DataSourceBadge` keep their APIs.

## Not shared, on purpose

- **No table component.** The tables differ in what their cells hold (numbers, heat, buttons, token
  chips). A data-driven table would need a snippet per column and read worse than the markup.
  `table.data` and `ScrollBox` cover what they share.
- **No button component.** The global `button` rule and native `aria-pressed` and `disabled` are
  enough.
- **No card, badge, or stat component.** Each appears once or twice. They move to `ui/` if a second
  chapter needs the same markup.
- **No side-by-side layout component.** Only BaseVsInstruct and ThinkingToggle set versions side
  by side, and their columns are differently styled cards; a shared grid would need a styling hook
  per column to replace a few lines of CSS.

## Testing

- Each `ui/` and `primitives/` component is covered by a colocated test (`controls.test.ts` for
  `Choice`, `Slider`, and `Toggle`; `containers.test.ts` for `ScrollBox` and `Status`) that renders
  it with `render` from `svelte/server` in Vitest's Node environment and checks the prerendered
  markup: accessible names, roles, ids tied to labels, the initial value, and no `tabindex` in the
  server output. `Stepper`, `FrameLoop`, `format.ts`, and `roles.ts` have plain unit tests.
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
2. **Folders.** Split `layout/` into `frame/` and `page/`, move `scrollable.ts` to `ui/`, add the
   ESLint layers, and update imports in chapters, `.svx` files, and routes (about 280 import lines,
   all mechanical). Update the source layout in [architecture.md](architecture.md).
3. **Controls.** `Choice`, `Slider`, and `Toggle`, then migrate their widgets.
4. **Containers.** `ScrollBox` and `Status`, then migrate.
5. **Prompts.** `roles.ts`, `PromptText`, `ChatLog`, and `RoleKey`, then migrate. This is the only
   step with intended color changes (see the role table).
6. **Loops.** `FrameLoop` and `formatCount`, then migrate.
7. **Guard.** Add `component-patterns.test.ts` once nothing it checks is left, and list the common
   set in [design.md](design.md)'s shared elements.

When a step lands, its components move to **Built** below.

## Status

| Component                                                                                                                                      | Folder                  | Status  |
| ---------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------- | ------- |
| `WidgetFrame`, `StepController`, `Loading`, `Scrolly`, `ModelConsent`, `DataSourceBadge`                                                       | `frame/`                | Built   |
| `ChapterLayout`, `ProgressNav`, `PageMeta`, `IngredientsBox`, `RecapCard`, `Sources`, `CitationScope`, `ChapterRef`, `Cite`, `GlossaryPopover` | `page/`                 | Built   |
| `scrollable`                                                                                                                                   | `ui/`                   | Built   |
| `TokenChip`, `VectorStrip`, `ProbBars`, `SamplerWheel`, `NextWordFan`, `AttentionLines`, `LossCurve`, `ToolCallCard`                           | `primitives/`           | Built   |
| `GlassBoxGenerator`                                                                                                                            | `widgets/`              | Built   |
| Global styles                                                                                                                                  | `global.css`            | Built   |
| `Choice`, `Slider`, `Toggle`, `concept.ts`                                                                                                     | `ui/`                   | Built   |
| `ScrollBox`, `Status`                                                                                                                          | `ui/`                   | Built   |
| `PromptText`, `ChatLog`, `RoleKey`, `roles.ts`                                                                                                 | `primitives/`           | Built   |
| `FrameLoop`, `formatCount`                                                                                                                     | `frame/`, `primitives/` | Planned |
| `component-patterns.test.ts`                                                                                                                   | `tests/unit/`           | Planned |
