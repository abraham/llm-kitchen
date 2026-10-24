# Explanation levels

Plan for letting each visitor read the site at one of three levels of detail, chosen in the app
bar; [roadmap.md](roadmap.md) points here. When a phase lands, its part moves into the spec it
belongs to and leaves this file. Phase 1, the machinery, is built and described in
[architecture.md](architecture.md#explanation-levels) and [design.md](design.md); the control
stays hidden until a chapter has passages for another level.

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

- Labels in the app bar are plain: "Simple", "Standard", and "In depth". The kitchen theme stays
  in the site's words and structure, not in a control whose options have to be understood at a
  glance. A native select can't show a description under each option; how the control explains
  the levels is decided in phase 3, when it becomes visible.
- Without a saved choice, the level is Standard. There's no "auto": nothing in the browser says
  which one a visitor wants.

## Writing a passage

Shared text stays plain Markdown. Passages that differ by level are wrapped in `page/At` (see
[architecture.md](architecture.md#explanation-levels)), and the chapter's `chapter.ts` lists the
levels it covers:

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

- Widgets, glossary terms, citations, and chapter links work inside `At` like anywhere else. A
  widget can sit inside `levels="standard deep"` when it's too much for Simple, as long as Simple
  still explains the idea in words.
- Search engines see all three levels; Standard comes first in source order where passages swap.

## Sharing

- **The level is never in the URL.** No query parameter, path, or hash sets it; a shared link
  opens at the reader's own level (Standard unless they've chosen another). Every chapter keeps one
  URL, so links, the canonical URL, and the prerendered pages don't multiply.
- **Social images and page metadata are Standard.** The generated social image, `og:title`, and
  description describe the chapter as Standard presents it, whatever level the sharer reads at.
  `scripts/build-og.ts` and `PageMeta` don't change.

## Glossary, recap, and quiz

- **Glossary:** each term may add a `simple` definition (shorter, no jargon) and a `deep` one (the
  precise version). `GlossaryPopover` shows the one for the current level, falling back to the
  standard definition.
- **Recap cards:** may take per-level points; most chapters keep one recap.
- **Quiz:** each question may be tagged with the levels it suits. The quiz shows the ones for the
  current level.

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

Phase 1's unit and end-to-end tests are in [architecture.md](architecture.md#explanation-levels).
Still to come:

- **Accessibility:** the axe pass in `quality.e2e.ts` runs at all three levels on the pilot
  chapters, then on every chapter once each has content.
- **Facts:** each chapter's `facts.test.ts` checks numbers wherever they appear, at any level.
- **Performance:** hidden passages add HTML; Lighthouse stays at 95 or above on every page.

## Phases

One pull request per phase; each passes every check in [quality.md](quality.md).

1. **Machinery (built).** `At`, the level store and shared helper, the inline script and CSS, the
   app bar control (hidden until a chapter lists a level), per-level citations and sources,
   coverage export, note, and test, and the e2e tests on a test-only fixture page.
2. **Glossary, recap, quiz.** Per-level definitions, recap points, and quiz tags, with fallbacks.
3. **Pilot content.** Simple and In depth passages for three chapters that span the site: one early
   ([Tokens](chapters/tokens.md)), one core ([Attention](chapters/attention.md)), and one harness
   chapter ([The agent loop](chapters/the-agent-loop.md)). MathML conversion lands here. The
   control becomes visible.
4. **Rollout.** The rest of the chapters, a Part at a time, each with its fact-check updated.
   Widgets get level-specific extras (In depth readouts, Simple hiding advanced controls) only where
   a chapter's passages call for them, through `At` inside the widget.
