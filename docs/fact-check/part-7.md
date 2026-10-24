# Fact-check: Part VII, Harnesses (Ch 23–26)

Claim checklist for the per-chapter fact-check (see [the spec](../spec/sources.md)). Tests:
each chapter's `facts.test.ts`, `src/lib/harness/agent.test.ts` (the browser's toy tools give
exactly the recorded results; the prompt segmenter loses nothing), each chapter's `chapter.e2e.ts`.

Data: real runs of Qwen2.5-1.5B-Instruct (greedy, pinned revision recorded in each file) by
`scripts/record/agent.py`, written to `static/data/agent/`, and of Qwen2.5-0.5B-Instruct and
Qwen2.5-1.5B-Instruct by `scripts/record/routing.py`, written to `static/data/routing/`.

## Ch 23. The model is not the product

| Claim                                                                                                         | Backing                                                                                                 |
| ------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| The prompt contains a system prompt, tool descriptions, earlier turns, and chat markers                       | Recorded prompt; segmenter test labels each part                                                        |
| A 31-character message became a 400-token prompt, then 493 on the second call                                 | Test (recorded token counts, Qwen tokenizer)                                                            |
| The model has no memory; the harness re-sends the conversation                                                | Each recorded prompt contains the full history (harness code)                                           |
| The earlier assistant turn is the model's own reply                                                           | `record/agent.py` generates it                                                                          |
| Qwen2.5 model family                                                                                          | Cite `qwen2024`                                                                                         |
| Simple: restates Standard in plainer words, with no new claims                                                | Reviewed against the Standard text                                                                      |
| In depth: tool descriptions 295 of 400 tokens; instructions 53, earlier exchange 22, message 8                | Qwen tokenizer, per part (record environment); test checks the tools part is over 70% of the characters |
| In depth: Qwen's template puts the descriptions in `<tools>` tags with calling instructions                   | Recorded prompt                                                                                         |
| In depth: the second call added 93 tokens: the call as the model's turn, the result in `<tool_response>` tags | Test                                                                                                    |

## Ch 24. Managing the context

Data: `record_context` in `scripts/record/agent.py`: a chat with no tools, six turns (a rhyme loved by
a named child, and "What happens in it?"), then "Which child in my class loves the rhyme about the
cat?" answered under each strategy, written to `static/data/agent/context.json`.

| Claim                                                                                                     | Backing                                                        |
| --------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------- |
| Six turns overflow a 600-token budget; each strategy fits                                                 | Test                                                           |
| The budget is deliberately small; the model can read far more                                             | Qwen2.5-1.5B-Instruct config: `max_position_embeddings` 32,768 |
| With everything kept, the model names Lily                                                                | Test (recorded answer)                                         |
| Dropping the oldest: the model says the conversation doesn't mention it                                   | Test (recorded answer)                                         |
| A model can as easily fill a gap with a confident guess                                                   | Ch 16 (hallucination)                                          |
| The summary kept "Lily" and the answer was right                                                          | Test                                                           |
| Retrieval by embedding similarity (MiniLM) picked the cat rhyme, and the answer was right                 | Test; cite `lewis2020`                                         |
| The map uses the Ch 5 projection                                                                          | `ContextBudget` projects with `minilm-map.json`'s PCA basis    |
| Simple: restates Standard in plainer words, with no new claims                                            | Reviewed against the Standard text                             |
| In depth: similarity is the cosine of 384-number MiniLM vectors; cat 0.49, the others 0.35–0.45           | Test (recomputed from the stored vectors)                      |
| In depth: the summary shrank the 149-token first exchange to a 30-token note                              | Test                                                           |
| In depth: the first reply says a cat catches a mouse, which the rhyme doesn't, and the summary repeats it | Test (recorded reply and summary against the rhyme text)       |

## Ch 25. Caching: reusing the work

Data: `scripts/record/caching.py` times GPT-2 small (float32, CPU) generating 500 greedy tokens
after "The cat sat on the", with and without its KV cache, three times each (median per token),
written to `static/data/caching/kv-cache.json`. The prompt-cache view is computed in the browser
(`src/lib/harness/cache.ts`) from the Ch 24 chat's recorded token counts, with a 400-token budget.

| Claim                                                                                                                    | Backing                                                         |
| ------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------- |
| A token's key and value depend only on earlier text (causal mask), so they can be kept                                   | Ch 9 mask; the cached and uncached runs pick the same tokens    |
| Without the cache, 24 to 139 ms per token; with it about 20; 43.2 s against 10.0 s                                       | Test (measured, this machine; labeled in the widget)            |
| Both runs picked the same 500 tokens; scores differed by at most 0.01                                                    | Script asserts equal tokens; test checks the difference         |
| 2 × 12 × 768 = 18,432 cached numbers per token for GPT-2 small                                                           | Test against `models/canonical.json`                            |
| Large models' caches run to gigabytes; keeping them small matters for serving                                            | Cite `pope2022`                                                 |
| Providers keep the KV cache for a prompt's exact start, for minutes to hours                                             | Cite `openai-prompt-caching`, `anthropic-prompt-caching`        |
| Cached tokens cost a tenth of the normal price or less; replies start sooner                                             | Cite both provider docs (0.1× reads, lower on some models)      |
| The match must be exact from the first token; any early change breaks the rest                                           | Cite both provider docs                                         |
| Put stable content first, append only; trimming or summarizing changes the prefix                                        | Cite `openai-prompt-caching` (optimization guidance)            |
| Appending reuses 2,342 of 2,975 tokens (79%); the time at the top reuses none                                            | Test (`cacheCalls`)                                             |
| Dropping sends 2,189 tokens but costs more than appending; summarizing costs least                                       | Test                                                            |
| Caching doesn't change the answer and isn't memory                                                                       | Cite both provider docs                                         |
| Minimum cacheable length (a few hundred to a few thousand tokens); writes cost extra                                     | Cite both provider docs; labeled as simplified in the widget    |
| Simple: restates Standard in plainer words, with no new claims                                                           | Reviewed against the Standard text                              |
| In depth: without the cache, n·p + n(n−1)/2 passes: 127,250 against 504 (252×), yet 4.3× the time                        | Test (`positionsProcessed`, recorded times)                     |
| In depth: one-token passes are mostly loading weights from memory, so extra tokens in a pass are cheap                   | Cite `pope2022`                                                 |
| In depth: with the cache the time per token crept from about 19 to 20 ms                                                 | Test                                                            |
| In depth: Qwen2.5-1.5B: 28 layers, 12 query heads sharing 2 key/value heads of 128: 14,336 numbers per token, not 86,016 | Cite `qwen2024` (Table 1, GQA); config `hidden_size` 1536; test |
| In depth: 2 bytes each: about 29 KB per token, 0.94 GB for 32,768 tokens                                                 | Test; config (bfloat16, 32,768 positions)                       |
| In depth: appending costs 633 + 234 = 867 full-price tokens, 29%; the time at the top costs 2,975                        | Test (`cacheTotals`, illustrative 0.1 price)                    |

## Ch 26. Which model answers?

Data: `scripts/record/routing.py`: Qwen2.5-0.5B-Instruct and Qwen2.5-1.5B-Instruct, greedy, answer 40
short questions under the system prompt "Answer with just the answer". Each answer is graded by code
against the accepted answers in the script, and its confidence is the geometric mean of the
probabilities the model gave its answer tokens. The cascade is replayed in the browser
(`src/lib/harness/routing.ts`).

| Claim                                                                                                | Backing                                                       |
| ---------------------------------------------------------------------------------------------------- | ------------------------------------------------------------- |
| Apps use several models; the harness decides which answers                                           | Cite `chen2023frugal`, `ong2024`                              |
| A router picks a model before answering; a cascade asks the small model first                        | Cite `ong2024` (routers), `chen2023frugal` (cascades)         |
| Bigger models do better                                                                              | Ch 12                                                         |
| The big model is about three times the small one's size                                              | Qwen2.5 sizes, cite `qwen2024`; test (parameter counts)       |
| The small model got 26 of 40 right, the big one 37                                                   | Test                                                          |
| At 60%: 15 passed on, 34 right, 70% of the cost; at 80%: 25 passed on, 37 right, 95%                 | Test (`cascade`)                                              |
| All 14 wrong small answers had confidence ≤ 79%, and so did 11 of the 26 right ones                  | Test                                                          |
| Sydney at 79% (wrong); Ankara at 25% (right)                                                         | Test                                                          |
| Cascades matched the best single model at a small fraction of its cost                               | Cite `chen2023frugal` (abstract: up to 98% cost reduction)    |
| Trained routers cut costs by more than half in some tests without lowering quality                   | Cite `ong2024` (abstract: "by over 2 times in certain cases") |
| Real prices are per token and set by providers; a cascade adds a wait                                | Labeled as simplified in the text                             |
| Simple: restates Standard in plainer words, with no new claims                                       | Reviewed against the Standard text                            |
| In depth: confidence is the geometric mean of the answer tokens' probabilities                       | `routing.py` (mean log probability)                           |
| In depth: 0.49 and 1.54 billion weights, r ≈ 3.12; cost (n + m r)/(n r): 32% at m = 0, 70% at m = 15 | Test                                                          |
