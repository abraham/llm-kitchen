# Is a model the right tool?

**Question:** That is how one model works, end to end. When is it the right tool for a job, and when
is something else better?

**Key idea:** A model writes likely text from its prompt and its weights, so it suits jobs where a
likely-sounding answer is a good one. Four questions, each from an earlier chapter, sort the rest:
would a likely answer be good, can you give it what it needs to know, can you check the result
quickly and live with a mistake, and is there a simpler exact tool. Most answers are "not on its
own" rather than "never": a model for the wording, tools for exact work, a harness for the facts,
and checks for the mistakes.

## Widgets

- `RightTool`: pick a preset task (rewording an email, multiplying, adding up 10,000 rows, a
  contract clause, and others) or answer the four questions for your own. Each answer that doesn't
  suit a model shows a recorded example from an earlier chapter and what to do instead, with links,
  and a one-line verdict.

## Data

No new recordings. The examples quote existing datasets (`agent/math-no-tools`,
`hallucination/samples`, `agent/context`, `routing/cascade`, `agent/chat`); the widget's text lives
in `src/lib/chapters/when-to-use/data.ts`, and `facts.test.ts` checks it against those datasets.

## Decisions

- Placed in the Wrap-up, after From message to reply and before Picking a model: first whether to
  use a model, then which one.
- Evidence is quoted rather than re-run, so the widget loads no data and each example links to the
  chapter that recorded it.
- The productivity claim cites a randomized experiment (Noy and Zhang 2023) rather than vendor
  figures; no prices or model rankings, which change too fast.
- [Levels](../levels.md): Simple keeps the four questions with one example each. In depth writes the
  checking rule as $a + c + p f < T$, shows why agreement between samples isn't a check of truth, and
  adds who gained most in the writing experiment.
