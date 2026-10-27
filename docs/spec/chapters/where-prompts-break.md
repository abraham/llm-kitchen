# Where prompts break

**Question:** If wording matters this much, how much can harmless changes move the answer?

**Key idea:** The order of examples, their layout, and where a fact sits in a long prompt can all
change answers. An irrelevant sentence, or details spread over several turns, can too. These effects show up in large models too, and differ from model to model. Test
several versions of a prompt on real examples instead of trusting one wording.

## Widgets

- `FragileLab`: three changes, each on its own: the order of few-shot examples (all 24 orders of
  four), their layout, and the position of a key line in a list of 30, with the answers and a tally
  for each.
- `ProblemRuns` (twice): 24 short word problems, each run two or three ways (as written, with an
  irrelevant sentence, with that sentence plus an instruction to ignore it, or with the question first
  and the two facts in later turns). Shows the score for each way and one chosen conversation.

## Data

Recorded by `scripts/record/prompts.py` (`static/data/prompts/fragile.json`): GPT-2 small for example
order and layout, and Qwen2.5-1.5B-Instruct for a fact's position. `static/data/prompts/problems.json`:
Qwen2.5-1.5B-Instruct, greedy, on the word problems.

## Decisions

- The ignore instruction is reported as not helping this small model (17 of 24 against 18), even
  though Shi and colleagues found it helped larger ones.
- Multi-turn asks the bare question first, then one fact per turn, and asks for the answer format only
  in the first turn, so the early answers come from the model rather than from the prompt.
- Position uses a short list of 30 lines rather than a long multi-document prompt, so the effect
  shows as a handful of misses in the middle rather than a smooth U-shaped curve.
- The Next question turns to text in the prompt the visitor didn't write, which the Tools and
  agents Part answers.
- [Levels](../levels.md): Simple keeps one number per change. In depth shows that the worst orders
  all end with a positive example and explains contextual calibration, and notes that the position
  misses were confident ones.
