# Recording pipeline

What's left of the plan for `scripts/record/`, the Python package that runs real models offline
and writes the datasets the widgets show (tier T0). The pipeline as built (jobs, lazily loaded
models, devices, offline mode, the generation cache, trials, `check`, `status`, code verdicts in
TypeScript, and hand grades) is described in
[models-and-data.md](models-and-data.md#recording-scripts). [roadmap.md](roadmap.md) points here.
When a part lands, it moves into the spec it belongs to and leaves this file.

## Status

`status` gains a column: whether a run now would be fully cached (nothing the job depends on has
changed). It needs each job to list its cache keys without running the models, which the jobs that
call a model through `run.model(spec)` can't do; for those it says "not cached".

## Python tests in CI

`scripts/tests/` runs with `pytest` in a CI job that downloads no model: the cache key (every field
changes it; key order doesn't), cache hits and `--fresh`, grade hashes and stale grades, dependency
order, `try` writing only to the scratch folder, and the envelope. The tests use a tiny stand-in
model built in the test, so they run in seconds. `pytest` is pinned in
`scripts/requirements-dev.txt`, and [quality.md](quality.md) lists the job.

## Open questions

- **Sharing the cache.** A cache committed or stored as a release artifact would let a second
  machine rerun every job without a GPU. Proposal: no; it would hold several hundred MB of replies
  nobody reviews, and `check` must regenerate anyway. Revisit if recording moves to CI.
- **A model as grader.** Hand grades could be drafted by a strong model and confirmed by a person.
  Proposal: not yet; [Did it work?](chapters/testing-agents.md) shows why a model's grades need
  checking, and the datasets are small enough to grade by hand.
