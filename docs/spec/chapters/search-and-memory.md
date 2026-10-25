# Search and memory

**Question:** Retrieval found the cat rhyme by its meaning. Is meaning always the best way to
search, and what can the harness keep once the chat is over?

**Key idea:** Keyword search finds a question's exact words, such as names and codes; search by
meaning finds the same idea in other words. Each misses what the other finds, so many systems run
both and merge the results by rank. A new chat starts empty: memory features save notes outside
the model and put them into later prompts, so a wrong note is repeated in every chat after.

## Widgets

- `SearchCompare`: pick one of five questions about the long chat from
  [Managing the context](managing-the-context.md). Three ranked lists show the six exchanges by
  keyword score (BM25, computed in the browser), by cosine similarity of MiniLM vectors, and merged
  by reciprocal rank fusion, with the exchange the question is about marked.
- `MemoryNotes`: what a new chat starts with: no notes, notes the model wrote when asked openly, or
  notes it wrote when asked for each child and rhyme. Shows the request, the notes and their size
  against the whole chat, and the new chat's answers to three questions, each marked against what
  the earlier chat said.

## Data

The chat is the one recorded by `scripts/record/agent.py` (`static/data/agent/context.json`). The
questions' vectors are recorded by `scripts/record/search.py` (`static/data/agent/search.json`)
with the same MiniLM revision, and the rankings computed in `src/lib/harness/search.ts`. The notes
and the new chats' answers are recorded by `scripts/record/memory.py`
(`static/data/agent/memory.json`) from the same chat.

## Decisions

- Split from [Managing the context](managing-the-context.md) so each chapter has one key idea and
  one main widget. It stays in Harnesses: both keyword search and notes saved by the harness need
  no tools.
- The search questions were chosen to show each method failing: "kitty" shares no word with any
  exchange, names and "crown" defeat MiniLM, and Leo's question defeats the merged list too. The
  text reports all five outcomes.
- Search by the agent itself (choosing when and what to search) is in
  [Designing an agent](designing-agents.md), since it needs tools.
- The memory notes are written by the same small model and kept even though both sets are wrong
  in places: open-ended notes invent an astronomy profile, specific notes swap two rhymes. The text
  uses them to show that a wrong note is repeated in every later chat. Memory the model manages
  itself is mentioned with MemGPT only.
- [Levels](../levels.md): Simple keeps the search results and the notes' outcomes, without BM25's
  details or the Anthropic figures. In depth gives the BM25 formula, reciprocal rank fusion with
  Leo's scores, and what notes cost.
