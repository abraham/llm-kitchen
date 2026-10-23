# LLM Kitchen — Spec

These files describe the site as it is now. A pull request that changes what a spec says updates
that spec in the same pull request. Work that isn't built yet goes in [roadmap.md](roadmap.md).

| File                                     | Covers                                                                                         |
| ---------------------------------------- | ---------------------------------------------------------------------------------------------- |
| [principles.md](principles.md)           | Who the site is for, how it teaches, and what counts as success                                |
| [curriculum.md](curriculum.md)           | Parts, chapter order, numbers, titles, slugs, and what each chapter builds on                  |
| [chapters/](chapters/)                   | One file per chapter, named by slug: its hook, widgets, key idea, data, and design decisions   |
| [design.md](design.md)                   | Look and layout, concept colors and shapes, shared elements, motion, and branding              |
| [architecture.md](architecture.md)       | Tech stack, source layout, routing, navigation, glossary, and citations                        |
| [models-and-data.md](models-and-data.md) | Recorded data and live models: tiers, the canonical model, recording scripts, and safety rules |
| [quality.md](quality.md)                 | Checks, tests, accessibility, and performance budgets                                          |
| [deployment.md](deployment.md)           | Hosting, deploys, preview channels, headers, and caching                                       |
| [sources.md](sources.md)                 | How claims are backed: citations, fact-check lists, and the core sources                       |
| [roadmap.md](roadmap.md)                 | What isn't built yet, and open questions                                                       |

## Rules

- **Present tense.** A spec says what the site does and, when it isn't obvious, why. History lives in
  git and pull requests.
- **Chapter numbers only in curriculum.md.** Everywhere else, link a chapter by its spec file, e.g.
  [Attention](chapters/attention.md), so moving a chapter changes no other spec.
- **Chapter specs are named by slug,** which never changes.
- **Decisions stay with what they decide.** When a chapter or system differs from the obvious
  design, its spec says so and why, under "Decisions".

## Checked by tests

`tests/unit/curriculum.test.ts` checks that:

- curriculum.md's tables match `src/lib/curriculum/curriculum.ts`;
- every chapter has `chapters/<slug>.md`, headed with its title, and there are no extra files;
- no spec file other than curriculum.md mentions a chapter number ("Ch N");
- nothing in `src/` writes a chapter number either; numbers are derived from `curriculum.ts`.

The claim lists in [docs/fact-check/](../fact-check/README.md) are checked by each chapter's
`facts.test.ts`; see [sources.md](sources.md).
