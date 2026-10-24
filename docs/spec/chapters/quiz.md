# Check yourself

**Question:** How much of all this stuck?

**Key idea:** None of its own; it checks the others.

## Widgets

- `Quiz`: multiple-choice questions in reading order, with at least one from every numbered Part. The visitor
  answers them all, then checks them at once. Each explanation links to the chapters that explain
  the answer, and the score lists the chapters to revisit for the questions missed.

## Data

Questions in `src/lib/chapters/quiz/data.ts`, each with the chapters it draws on. A unit test checks that
every numbered Part has at least one question.

## Decisions

- The quiz is its own chapter, last in the Wrap-up, rather than part of [the recap](recap.md).
- A new chapter that adds a big idea gets a question.
- [Levels](../levels.md): Simple rewords three questions (training, examples in a prompt, caching)
  without the terms its chapters drop. In depth adds four questions on In depth passages, and the
  heading counts them.
