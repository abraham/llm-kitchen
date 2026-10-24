# Explanation levels

Plan for letting each visitor read the site at one of three levels of detail, chosen in the app
bar. None of this is built yet; [roadmap.md](roadmap.md) points here. When a phase lands, its part
moves into the spec it belongs to and leaves this file.

## Goals

- **One site, three depths.** The same chapters, widgets, and order at every level. A level changes
  how much each chapter explains, not what it covers, so [curriculum.md](curriculum.md) and
  `buildsOn` stay as they are.
- **Standard is today's text.** Nothing is rewritten to add the other two levels; they're written
  around it.
- **Switching is instant and stays put.** Changing the level re-renders nothing and loses no
  widget state, and the choice survives reloads, like the theme.
- **Complete before JavaScript.** Every level is in the prerendered HTML, and the right one shows
  on first paint, with no flash and no layout shift.
- **Every level is accurate.** A simpler explanation can leave things out, never get them wrong;
  deliberate simplifications are labeled as they are now (see [sources.md](sources.md)).

## The levels

| Level        | Key        | For                                       | Reads like                                                                                                                                                       |
| ------------ | ---------- | ----------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Simple**   | `simple`   | A first look, or less time                | Shorter. Everyday words and analogies, no symbols or formulas, numbers only when they're the point. Optional detours (history, edge cases) are left out.         |
| **Standard** | `standard` | Everyone, by default                      | The current text, following [principles.md](principles.md).                                                                                                      |
| **In depth** | `deep`     | Readers who want the math and the details | Standard, plus the equations behind each idea, how real implementations differ from the toy, and pointers into the papers. Absorbs the roadmap's "math sidebar". |

- Labels in the app bar are plain: "Simple", "Standard", and "In depth", each with a one-line
  description. The kitchen theme stays in the site's words and structure, not in a control whose
  options have to be understood at a glance.
- Without a saved choice, the level is Standard. There's no "auto": nothing in the browser says
  which one a visitor wants.

## How a chapter marks its levels

The shared text stays plain Markdown and is Standard. Passages that differ by level are wrapped in
one component, `page/At.svelte`:

```svx
<At levels="simple">

Each token gets a list of numbers that places it among other words with similar meanings.

</At>
<At levels="standard deep">

Each token gets a vector: 768 numbers, learned so that tokens used in similar ways end up close
together.

</At>
<At levels="deep">

Formally, the embedding is a lookup into a matrix $W_E \in \mathbb{R}^{50257 \times 768}$ …

</At>
```

- `levels` is one or more of `simple`, `standard`, `deep`. Unwrapped text shows at every level.
- `inline` renders a `<span>` instead of a `<div>`, for a swapped phrase inside a sentence.
- Simple usually _replaces_ a Standard passage (two `At` blocks side by side); In depth usually
  _adds_ one (`levels="deep"` alone). Either can do both.
- Widgets, glossary terms, citations, and chapter links work inside `At` like anywhere else. A
  widget can sit inside `levels="standard deep"` when it's too much for Simple, as long as Simple
  still explains the idea in words.

## Showing the right level

- The chosen level is a `data-level` attribute on `<html>`, like `data-theme`. The inline script in
  `app.html` sets it from `localStorage` (`llm-kitchen:level`, only if it's `simple` or `deep`;
  Standard saves nothing) before the page paints. Its CSP hash is already computed from the file.
- `At` renders its content always, with `data-levels="…"`. Global CSS hides any `[data-levels]`
  element whose list doesn't include the current level (Standard when there's no attribute). Hidden
  passages are `display: none`, so screen readers skip them too.
- `stores/level.svelte.ts` holds the choice for the app bar and anything that needs it in script.
  It and the theme store share one small helper for "a saved choice applied as a root attribute".
- The browser's find-in-page and the accessibility tree see only the current level. Search engines
  see all three; Standard comes first in source order where passages swap.

## Sharing

- **The level is never in the URL.** No query parameter, path, or hash sets it; a shared link
  opens at the reader's own level (Standard unless they've chosen another). Every chapter keeps one
  URL, so links, the canonical URL, and the prerendered pages don't multiply.
- **Social images and page metadata are Standard.** The generated social image, `og:title`, and
  description describe the chapter as Standard presents it, whatever level the sharer reads at.
  `scripts/build-og.ts` and `PageMeta` don't change.

## The app bar control

- Between the site name and the theme toggle: a native `<select>` labeled "Explanations" (visually
  hidden label, the current level showing), built with `ui/Choice` (`appearance="select"`). It
  fits beside the name and toggle at 320px.
- Changing it updates `data-level` and storage at once; nothing else re-renders. Focus and scroll
  position stay put: the passage at the top of the viewport is kept in view across the change (the
  control records it before switching and scrolls it back after).
- Before hydration the select shows Standard; it's corrected on hydration. The page itself is
  already right, because the inline script set the attribute.

## Citations and sources

Citations are numbered in order of first appearance, and a level hides some of them, so numbering
would skip.

- `Citations` (in `citations.svelte.ts`) learns each `Cite`'s levels from its enclosing `At`
  (context) and numbers sources separately for each level.
- `Cite` renders one number per distinct numbering, each tagged `data-levels`, so the visible
  number is always the right one.
- `Sources` renders one list per level, tagged the same way; each lists only what that level cites,
  in its order.

## Glossary, recap, and quiz

- **Glossary:** each term may add a `simple` definition (shorter, no jargon) and a `deep` one (the
  precise version). `GlossaryPopover` shows the one for the current level, falling back to the
  standard definition.
- **Recap cards:** may take per-level points; most chapters keep one recap.
- **Quiz:** each question may be tagged with the levels it suits. The quiz shows the ones for the
  current level.

## Coverage

A chapter can be partly written for a level and still read correctly, because unwrapped text is
shared. To keep that honest:

- Each chapter's `chapter.ts` exports `levels`: the levels it has passages for beyond Standard
  (`[]`, `['simple']`, `['deep']`, or both).
- `ChapterLayout` shows a one-line note under the heading when the current level isn't in that
  list ("This chapter reads the same at every level, for now").
- A unit test checks every chapter's `levels` matches the `At` blocks in its `chapter.svx`, and
  that every `At` names at least one level and only known ones.

## Writing rules

Added to [principles.md](principles.md) when the first chapter ships:

- **Simple:** no notation, no number that isn't the point, at most one analogy per idea, and every
  term defined on first use. Aim for about half the words of Standard. Never introduce a claim
  Standard doesn't make.
- **In depth:** equations follow the picture and the words, never replace them. Each equation
  names every symbol. Implementation notes say which model or paper they're true for. New sources
  are cited like any other claim and added to the chapter's fact-check list.
- **All levels:** the running example stays _"The cat sat on the"_; the chapter's question and the
  question that leads on stay the same.

## Math in In depth

In depth needs equations, which the site can't show today. Proposed: write TeX in `$…$` and
`$$…$$`, convert it to MathML at build time (a remark plugin, a new dev dependency), and ship no
math JavaScript or fonts; every supported browser renders MathML Core. The conversion and the
first equations ship together in phase 3.

## Tests

- **Unit:** `At` server-renders all levels with the right `data-levels`; the level store and its
  storage parsing; per-level citation numbering; coverage (above).
- **E2E:** the control switches levels and the right passages show; the choice survives a reload
  and is applied before hydration; Standard is the default; the passage at the top of the viewport
  stays in view across a switch; no CSP violations.
- **Accessibility:** the axe pass in `quality.e2e.ts` runs at all three levels on the pilot
  chapters, then on every chapter once each has content.
- **Facts:** each chapter's `facts.test.ts` checks numbers wherever they appear, at any level.
- **Performance:** hidden passages add HTML; Lighthouse stays at 95 or above on every page.

## Phases

One pull request per phase; each passes every check in [quality.md](quality.md).

1. **Machinery.** `At`, the level store and shared helper, the inline script and CSS, the app bar
   control (hidden until phase 3 ships content, so visitors never see a switch that does nothing),
   per-level citations and sources, coverage export and test, and the e2e tests on a test-only
   fixture chapter.
2. **Glossary, recap, quiz.** Per-level definitions, recap points, and quiz tags, with fallbacks.
3. **Pilot content.** Simple and In depth passages for three chapters that span the site: one early
   ([Tokens](chapters/tokens.md)), one core ([Attention](chapters/attention.md)), and one harness
   chapter ([The agent loop](chapters/the-agent-loop.md)). MathML conversion lands here. The
   control becomes visible.
4. **Rollout.** The rest of the chapters, a Part at a time, each with its fact-check updated.
   Widgets get level-specific extras (In depth readouts, Simple hiding advanced controls) only where
   a chapter's passages call for them, through `At` inside the widget.
