# Making things up

**Question:** A model states made-up answers as confidently as true ones. How can a harness tell?

**Key idea:** A model writes likely text, not checked facts, so it can answer confidently when it
doesn't know. Sampling the same question several times exposes many guesses: known facts come back
the same each time, guesses scatter. Agreement isn't truth, though: a model that learned something
wrong repeats it every time. Allowing "I don't know" helps, but tests that score it like a wrong
answer teach models to guess. Made-up names, like software packages, are an attack surface, so
facts that matter get checked with code, sources, or a person.

## Widgets

- `SampleCheck`: pick one of 11 questions (four well-known, four less well-known, three about a
  book, a chemist, and a town invented for the chapter). A table groups the ten sampled answers,
  counts each, and marks it right, wrong (made up, for invented questions), or declined, as graded
  by code. A line under the table gives the answer at temperature 0. A toggle switches to a system prompt that allows "I don't know". A status line says
  whether the consistency check (at least 8 of 10 the same) passes the top answer on, flags it, or
  reports that the model declined; readouts total right, wrong, and declined across all questions
  and how many of each the check flags.

## Data

`scripts/record/hallucination.py` (`static/data/hallucination/samples.json`): Qwen2.5-1.5B-Instruct
answers each question once greedily (temperature 0) and ten times, sampled with its generation settings (temperature 0.7, top-p 0.8,
top-k 20) and seed 1, under two system prompts: a short-answer prompt, and the same with "If you
are not sure of the answer, say "I don't know"." Code grades each answer against accepted answers
and a pattern for declining. Grouping, the check, and the entropy are computed in the browser
(`src/lib/harness/hallucination.ts`).

## Decisions

- The chapter opens Safety: made-up answers need only sampling and a harness, and a model can
  mislead without any attacker. Prompt injection follows as the case where someone else's text
  misleads it.
- Short answers ("a name, a place, or a number") make samples comparable by exact text. The text
  says semantic entropy groups by meaning with a second model instead.
- The Tour de France question is kept because the model is consistently wrong: it shows the
  check's blind spot, so agreement isn't presented as truth.
- The invented names were made up for the chapter, so any specific answer is wrong by construction.
- [Levels](../levels.md): Simple keeps the court case, the ten samples and what they catch and miss,
  "I don't know", why guessing pays, package hallucinations, and what helps, without the benchmark
  count. In depth adds the entropy of the answers, semantic entropy, the break-even confidence
  p > t with a t/(1 − t) penalty, and the singleton bound for birthdays.
