# Explanation levels

Plan for letting each visitor read the site at one of three levels of detail, chosen in the app
bar; [roadmap.md](roadmap.md) points here. When a phase lands, its part moves into the spec it
belongs to and leaves this file. Phases 1 to 3 (the machinery; per-level glossary definitions,
recap points, and quiz questions; and the pilot chapters with equations) are built and described
in [architecture.md](architecture.md#explanation-levels), [design.md](design.md), and
[principles.md](principles.md#writing-for-each-level). Phase 4 remains.

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
  glance.
- Without a saved choice, the level is Standard. There's no "auto": nothing in the browser says
  which one a visitor wants.

## Writing a passage

Shared text stays plain Markdown. Passages that differ by level are wrapped in `page/At` (see
[architecture.md](architecture.md#explanation-levels)), the chapter's `chapter.ts` lists the
levels it covers, and the passages follow the
[writing rules](principles.md#writing-for-each-level). Tokens, Attention, and The agent loop are
the worked examples. In short:

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

## Tests

The tests so far are in [architecture.md](architecture.md#explanation-levels). As each chapter
gets passages, the axe and phone-width checks in `quality.e2e.ts` pick it up from its
`chapter.ts`, its `facts.test.ts` covers the numbers its passages state, and Lighthouse stays at
95 or above on every page.

## Phases

One pull request per phase; each passes every check in [quality.md](quality.md).

1. **Machinery (built).** `At`, the level store and shared helper, the inline script and CSS, the
   app bar control (hidden until a chapter lists a level), per-level citations and sources,
   coverage export, note, and test, and the e2e tests on a test-only fixture page.
2. **Glossary, recap, quiz (built).** Per-level definitions, recap points, and quiz tags, with
   fallbacks.
3. **Pilot content (built).** Simple and In depth passages for three chapters that span the site:
   one early ([Tokens](chapters/tokens.md)), one core ([Attention](chapters/attention.md)), and
   one harness chapter ([The agent loop](chapters/the-agent-loop.md)). MathML conversion, and the
   control is visible.
4. **Rollout.** The rest of the chapters, a Part at a time, each with its fact-check updated.
   Widgets get level-specific extras (In depth readouts, Simple hiding advanced controls) only where
   a chapter's passages call for them, through `At` inside the widget. Done so far: Part I
   (Prediction), Part II (Representation), Part III (Learning), and Part IV (Context).
