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
- **No exceptions by default.** Nothing is excluded from a scan. An exception is a named rule on
  a named element, with the reason beside it.

## Built

[quality.md](quality.md#accessibility) describes what's built: one scan helper
(`expectAccessible`) with WCAG 2.0–2.2 A and AA plus axe's best practices; scans of every page and
the 404 page in both themes, on a phone with every disclosure open, and at Simple and In depth on a
desktop and a phone; chapters with stepped figures at their last step and each glossary popover
open; reflow at 320 px; WCAG text spacing; a Tab sweep of every page, forward and back; Enter and
Escape on every glossary popover; and forced-colors screenshots. Turning them on took headings that skipped a level in four widgets, a named corner
cell in a table, a `main` on the 404 page, a focusable scroll box in `FigureData`, and focusable
wide equations on phones.

## Checks still to add

### Exceptions

If a rule ever needs an exception, it goes in `tests/e2e/a11y.ts` as a `{ rule, selector, reason }`
entry, passed to axe as `exclude` for that rule only. A unit test checks that each entry has a
reason and that its selector matches something on some page, so stale exceptions are removed.

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
- Lighthouse's accessibility minimum rises from 95 to 100. Its audits are mostly axe's, so a page
  that passes the helper and scores under 100 points at an audit the helper doesn't run; the
  Lighthouse report names it.

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
- **No axe in forced colors.** It compares the author's colors, which forced colors replaces, so
  it reports contrast failures that aren't there; forced colors gets screenshots instead.
- **No `wcag2aaa`.** AAA contrast (7:1) would change the concept colors, which already pass AA in
  both themes ([design.md](design.md#concept-colors-and-shapes)).

## Phases

1. **Names and sources.** The ARIA snapshots, the `svelte-ignore` allowlist, the exception list
   with its test, the helper's own test, and Lighthouse at 100.

## CI

- New tests go in the existing e2e shards. If the slowest shard grows by more than a third, a
  fourth shard is added (and `ci-success` already covers it, since it `needs` the job, not each
  shard).

## Tests

- **Unit:** the exception list's reasons and selectors; the `svelte-ignore` allowlist.
- **End-to-end:** the helper fails on a fixture with a known violation (a button with no name) and
  passes once the fixture's exception names it, so the helper itself is tested; everything else
  in [Checks still to add](#checks-still-to-add).

## Specs that change

- [quality.md](quality.md): the Tests list and the Accessibility section describe ARIA
  snapshots, the allowlist, and exceptions; the Lighthouse minimum becomes 100 for accessibility.
- [principles.md](principles.md): the accessibility success criterion names WCAG 2.2 AA.
