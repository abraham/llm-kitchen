# Did it work?

**Question:** One agent or several, how do you know the job was done right?

**Key idea:** A trace records every model call and tool call in a run, so you can see where a
failure began and what each step cost. An eval is a fixed set of tasks with a way to check each
result, run again after every change. Code can check answers with a known form and the end state,
such as which files are left; a model can grade free-form answers, but a grader has to be checked
too. Real use finds failures tests miss, runs vary when the model samples, and a benchmark score is
only about its own tasks.

## Widgets

- `RunTrace`: pick one of seven recorded runs. A table lists every model call in order: the tokens
  its prompt read (shaded by size), the tool call it asked for or its answer, and the tool's result.
  Totals give model calls, tool calls, tokens read in all, and whether the run ended with an answer
  or at the call limit.
- `TestSet`: the same seven runs as a test set. A table shows, for each, an answer check by code
  (does the final answer contain the expected text), an end-state check by code (are all the
  user's files still there), and a model grader's verdict. A toggle shows the grader a correct
  answer; a status line counts how often the grader agrees with the answer check. A picker shows
  one answer, the correct answer when given, and the grader's reply.

## Data

The seven runs are the agent recordings from `scripts/record/agent.py`
(`static/data/agent/<name>.json`), used by earlier chapters. The grades are recorded by
`scripts/record/grading.py` (`static/data/agent/grades.json`): Qwen2.5-1.5B-Instruct, greedy, asked
whether each finished run's final answer does what its task asked, once with only the task and the
answer and once also given a correct answer. Runs that stopped without an answer aren't graded. The
checks and totals are computed in the browser (`src/lib/harness/evals.ts`).

## Decisions

- The grader is the same small model as the agent, so it is often wrong: alone it passes all five
  answers, and with a correct answer it gets 3 of 5 right, mixing up the correct answer with the
  one it grades. The text says so and gives strong graders' agreement with people from the
  literature, rather than suggesting a 1.5B model is a fair judge.
- The code checks are the ground truth here because every task has a checkable answer. The text
  says why free-form tasks need a model grader instead.
- No timing is recorded, so traces show tokens, not seconds; the text mentions time per step.
- The chapter closes Safety because it replays the runs of the earlier chapters: tools,
  the loop, and the guardrails' effect on the user's files.
- [Levels](../levels.md): Simple keeps the trace, the eval, code checks, the grader's mistakes,
  watching real use, and GAIA, without the τ-bench and judge-bias figures. In depth adds how
  success on every one of k tries falls as pᵏ, and τ-bench's pass^k estimate.
