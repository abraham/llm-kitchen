# Caching: reusing the work

**Question:** Every call re-sends the whole conversation, and the model reads all of it again. Does
it really redo all that work every time?

**Key idea:** Because of the causal mask, a token's keys and values depend only on the text before
it, so the model can store them: the KV cache. With the cache, each new token costs about the same;
without it, each costs more than the last, and the answer is the same either way. Providers keep the
cache for the exact start of a prompt between calls, so a harness that keeps its opening fixed and
only appends gets cheaper, faster calls; changing anything early invalidates everything after it.
The cache saves work; it doesn't change the answer, and it isn't memory between conversations.

## Widgets

- `KVCacheStepper`: steps through generation with the cache off and on. Off, every new token reruns
  the whole text so far; on, earlier tokens' keys and values are reused and only the new token is
  computed. A counter tallies the work for each, alongside measured time per token.
- `PromptCacheView`: the calls from a recorded agent session, each drawn as a bar of blocks (system
  prompt, tasks), with the part that matches an earlier call's start shaded as cached. The visitor
  makes the edits harnesses make (append a turn, change the system prompt, put the time at the top,
  drop or summarize old turns) and sees tokens reused and an illustrative cost.

## Data

- Work counts from GPT-2 small's config (`models/canonical.json`).
- Time per token measured offline on one laptop CPU by `scripts/build-caching.py`
  (`static/caching/kv-cache.json`), which also checks both runs pick the same tokens.
- Token counts from the recorded session in [Managing the context](managing-the-context.md).
- Provider rules (minimum length, discount, how long a cache lives) cite provider docs with accessed
  dates and are labeled as varying by provider; prices are round, illustrative numbers.

## Decisions

- Prompts are drawn as blocks rather than rows of token chips, since they are hundreds of tokens
  long, and the view shows tokens processed rather than time to first token.
- One-pass checking of many tokens refers back to [Guessing ahead](speculative-decoding.md).
- Live timing in the browser is on the [roadmap](../roadmap.md).
