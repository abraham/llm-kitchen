# Accessibility checks

Plan for the automated accessibility checks to cover every page in the states a visitor actually
sees, not only its first view on a desktop; [roadmap.md](roadmap.md) points here. When a phase
lands, its part moves into [quality.md](quality.md) ([Specs that change](#specs-that-change)) and
leaves this file.

## Goals

- **Every page, every state that matters.** Axe runs on every page, at desktop and phone width, in
  both themes, at each explanation level, with disclosures and popovers open, and with stepped
  figures at their last step, not just as a page first loads.
- **Beyond what axe sees.** Keyboard focus, reflow, and text spacing are WCAG 2.2 AA criteria axe
  can't judge from the DOM, so the browser checks them directly.
- **One way to scan.** Every test scans through one helper with one rule set, so a new check or
  rule applies everywhere at once and a failure reads the same in every file.
- **Failures say where.** A violation names the rule, what it means, and the elements, so it can
  be fixed without rerunning the test locally.
- **No exceptions by default.** Nothing is excluded from a scan. An exception is a named rule on
  a named element, with the reason beside it.

## What runs today

| Check                                 | Where                                  | Pages and states                                                                                         |
| ------------------------------------- | -------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| Svelte a11y warnings fail the build   | `npm run check` (`--fail-on-warnings`) | Every component; one `svelte-ignore a11y_*`, on `PatchCutter`'s picture                                  |
| Axe, WCAG 2.0–2.2 A and AA tags       | `quality.e2e.ts`                       | The menu, every chapter, and the Models page, at desktop width, light and dark, once widgets have loaded |
| Axe at Simple and In depth            | `quality.e2e.ts`                       | Chapters with passages for those levels, at desktop width                                                |
| Axe on fixture pages                  | `levels.e2e.ts`                        | `/fixtures/levels` and `/fixtures/recap-and-quiz` at each level                                          |
| Axe with live widgets                 | `live.e2e.ts`                          | Pages with a live widget under Small and Large, on a phone, with reduced motion                          |
| No sideways scrolling, figure text    | `quality.e2e.ts`                       | Every page at 375 px; figure text at least 11 px                                                         |
| Keyboard, reduced motion, live region | `interaction.e2e.ts`, `design.e2e.ts`  | Stepping with ← → and End, the glossary popover's Escape, one `aria-live` status                         |
| Color contrast of design tokens       | `tests/unit/tokens.test.ts`            | Every text-on-color pair at 4.5:1 and every concept color at 3:1, in both themes                         |
| Lighthouse accessibility at least 95  | `tests/lighthouse/pages.lh.ts`         | The menu, every chapter, and the Models page, simulated mobile                                           |

Each axe call repeats its own tag list and reports only rule ids and help text, except
`live.e2e.ts`, which reports elements too.

## Gaps

A probe of the current build on 2026-10-25, in Chromium, against every page, found:

| Check that doesn't run today         | Result                                                                                                                                                                                                                                                                                                                                             |
| ------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Axe `best-practice` rules            | `heading-order` on [From predictor to assistant](chapters/predictor-to-assistant.md), [Thinking before answering](chapters/reasoning-models.md), [Reading both ways](chapters/encoders.md), and [Recap: the whole picture](chapters/recap.md); `empty-table-header` on Thinking before answering; `landmark-one-main` and `region` on the 404 page |
| Axe on the 404 page                  | Not scanned at all; it has no `main`                                                                                                                                                                                                                                                                                                               |
| Axe at phone width, disclosures open | `scrollable-region-focusable` on a table in [Caching: reusing the work](chapters/caching.md)                                                                                                                                                                                                                                                       |
| Tabbing through every page           | 1,721 tab stops; every one shows a focus ring, and none is hidden under the sticky app bar (the skip link sits over the bar by design)                                                                                                                                                                                                             |
| Reflow at 320 px (WCAG 1.4.10)       | No sideways scrolling on any page                                                                                                                                                                                                                                                                                                                  |
| WCAG 1.4.12 text spacing, on a phone | No clipped text and no sideways scrolling                                                                                                                                                                                                                                                                                                          |
| Axe in forced colors                 | One `color-contrast` result, on [Text is just numbers](chapters/text-is-numbers.md); axe compares the author's colors, which forced colors replaces, so it isn't a real failure                                                                                                                                                                    |

So the extra checks cost a handful of fixes, and most of their value is in keeping the site this
way.

## Checks

### One scan helper

- `tests/e2e/a11y.ts` exports `expectAccessible(page, { include?, label? })`. It runs axe with the
  site's rule set, attaches the full results to the Playwright report as JSON, and fails with one
  line per violation: rule id, help text, and up to five element selectors.
- **The rule set** is `wcag2a`, `wcag2aa`, `wcag21a`, `wcag21aa`, `wcag22aa`, and `best-practice`.
  `best-practice` adds heading order, one `main`, content inside landmarks, and unique landmark
  names; Lighthouse already scores some of them. Experimental rules and `wcag2aaa` stay off.
- **Exceptions** live in the helper as `{ rule, selector, reason }` entries, passed to axe as
  `exclude` for that rule only. The list starts empty. A unit test checks that each entry has a
  reason and that its selector matches something on some page, so stale exceptions are removed.
- `quality.e2e.ts`, `levels.e2e.ts`, `design.e2e.ts`, `live.e2e.ts`, and chapter e2e files call the
  helper instead of `AxeBuilder`; a lint rule (`no-restricted-imports` outside `tests/e2e/a11y.ts`)
  keeps it that way.

### Pages and states

`PAGES` (in `tests/e2e/pages.ts`, shared by e2e and Lighthouse) is the menu, every chapter, the
Models page, and the 404 page; the fixture pages are scanned in `levels.e2e.ts` as now.

| State               | How it's reached                                                                                          | Pages                           |
| ------------------- | --------------------------------------------------------------------------------------------------------- | ------------------------------- |
| First view, desktop | Hydrated, nothing "Loading", in light and in dark                                                         | All                             |
| First view, phone   | 375 × 740, touch, light                                                                                   | All                             |
| Each level          | Simple and In depth, on a phone                                                                           | Chapters with passages for them |
| Opened              | Every `details` in `main` opened, then each glossary term's popover opened in turn and scanned on its own | Chapters                        |
| Stepped to the end  | Every `StepController` in turn: focus Next, press End, wait for "Step N of N"                             | Chapters with stepped figures   |
| Live                | As in `live.e2e.ts`, through the helper                                                                   | Pages with a live widget        |

Scanning a page in several states reuses one load: the test reaches each state in order and scans
after each. Stepped figures are scanned at their end because that's where the most marks, labels,
and table rows are drawn.

### Keyboard sweep

On every page at desktop width, a test presses Tab until focus returns to the start or leaves the
page, at most 400 times, and for each focused element checks that:

- it is visible: non-zero size, not `visibility: hidden`, and inside the viewport after the
  browser scrolls it there;
- it isn't covered by the sticky app bar: its top is below the bar's bottom unless it's in the bar
  or is the skip link (WCAG 2.4.11, Focus Not Obscured);
- it shows a focus indicator: an outline or a box shadow while focused (WCAG 2.4.7);
- focus moves forward: no element is reached twice in one sweep before the end, so there is no
  focus trap.

Shift+Tab from the footer link returns through the same elements in reverse. On the same pages, the
glossary popover test grows to every popover: Enter opens it, Escape closes it and returns focus to
its term.

### Reflow and text spacing

- **Reflow (WCAG 1.4.10):** the phone-width test also runs at 320 × 640 and fails on any sideways
  scrolling. The 375 px figure-text check stays as it is.
- **Text spacing (WCAG 1.4.12):** at 375 px, the test adds the criterion's spacing (line height
  1.5, letter spacing 0.12em, word spacing 0.16em, 2em after paragraphs) and fails if the page
  scrolls sideways or any element in `main` with `overflow: hidden` or `clip` now cuts off its
  text. Visually hidden text and SVG are skipped.

### Names that shouldn't change

Axe checks that a control has a name, not that the name is right. Playwright ARIA snapshots
(`toMatchAriaSnapshot`) pin the shared chrome, where a wrong name affects every page:

- the app bar, on a chapter;
- a chapter's header, Ingredients box, and footer (the next-chapter, edit, and share controls);
- the Models page's tier choice and one model card;
- the 404 page.

Widget regions aren't snapshotted: their text changes with every chapter edit, and each chapter's
own e2e test already finds controls by role and name.

### Source checks

- A unit test lists every `svelte-ignore a11y_*` comment in `src/` and compares the list to an
  allowlist in the test, each entry with its reason (today only `PatchCutter`'s picture, where a click
  picks a patch and the Patch slider does the same from the keyboard). A new ignore fails until it's added
  there, so it gets a reviewer's look.
- Lighthouse's accessibility minimum rises from 95 to 100 once the `best-practice` fixes are in.
  Its audits are mostly axe's, so a page that passes the helper and scores under 100 points at an
  audit the helper doesn't run; the Lighthouse report names it.

### Forced colors

Axe in forced colors reports colors the browser has already replaced, so it isn't run. Instead
the local visual suite gains forced-colors screenshots (`forcedColors: 'active'`, desktop, light)
of the menu, the Models page, and the pages with the most SVG figures ([Attention](chapters/attention.md),
[Scale](chapters/scale.md), [Embeddings](chapters/embeddings.md)), to review that figures, focus
rings, and the tier choice stay visible.

## What stays manual

Automated checks can't judge whether a figure's text description says what the figure shows,
whether alt text and labels make sense out of context, or how a screen reader reads a widget as it
changes. Before a release that adds or rewrites widgets, someone steps through the new widgets
with VoiceOver on macOS and iOS, using only the keyboard or touch.

## Decisions

- **Chromium only,** as for the other e2e tests ([quality.md](quality.md#browser-support)). Axe
  reads the DOM and computed styles, which rarely differ between engines for this site's markup.
  Engine-specific bugs are left to the manual pass.
- **Phone scans in light only.** Contrast is the only rule that differs by theme, and both themes
  are scanned at desktop width.
- **No `wcag2aaa`.** AAA contrast (7:1) would change the concept colors, which already pass AA in
  both themes ([design.md](design.md#concept-colors-and-shapes)).

## Phases

1. **Helper and rule set.** `tests/e2e/a11y.ts`, the shared `PAGES` with the 404 page, every axe
   call moved to the helper, `best-practice` on, and the fixes it needs: heading order in the four
   chapters, the empty table header, and a `main` on the 404 page.
2. **States.** Phone scans on every page, opened disclosures and popovers, stepped figures at
   their end, reflow at 320 px, text spacing, and the Caching table's scroll box made focusable.
3. **Keyboard and names.** The keyboard sweep, the ARIA snapshots, the `svelte-ignore` allowlist,
   Lighthouse at 100, and the forced-colors screenshots.

## CI

- New tests go in the existing e2e shards. If the slowest shard grows by more than a third, a
  fourth shard is added (and `ci-success` already covers it, since it `needs` the job, not each
  shard).
- Every failing scan attaches its axe JSON to the shard's uploaded report.

## Tests

- **Unit:** the exception list's reasons and selectors; the `svelte-ignore` allowlist.
- **End-to-end:** the helper fails on a fixture with a known violation (a button with no name) and
  passes once the fixture's exception names it, so the helper itself is tested; everything else
  in [Checks](#checks).

## Specs that change

- [quality.md](quality.md): the Tests list and the Accessibility section describe the helper, the
  states, the keyboard sweep, reflow, text spacing, ARIA snapshots, and the allowlist; the
  Lighthouse minimum becomes 100 for accessibility.
- [principles.md](principles.md): the accessibility success criterion names WCAG 2.2 AA.
- [components.md](components.md): scroll boxes stay focusable at every width, not just when they
  scroll on a desktop.
