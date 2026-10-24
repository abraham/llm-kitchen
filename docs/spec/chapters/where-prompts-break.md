# Where prompts break

**Question:** If wording matters this much, how much can harmless changes move the answer?

**Key idea:** The order of examples, their layout, and where a fact sits in a long prompt can all
change answers. These effects show up in large models too, and differ from model to model. Test
several versions of a prompt on real examples instead of trusting one wording.

## Widgets

- `FragileLab`: three changes, each on its own: the order of few-shot examples (all 24 orders of
  four), their layout, and the position of a key line in a list of 30, with the answers and a tally
  for each.

## Data

Recorded by `scripts/record/prompts.py` (`static/data/prompts/fragile.json`): GPT-2 small for example
order and layout, and Qwen2.5-1.5B-Instruct for a fact's position.

## Decisions

- Position uses a short list of 30 lines rather than a long multi-document prompt, so the effect
  shows as a handful of misses in the middle rather than a smooth U-shaped curve.
- The Next question turns to text in the prompt the visitor didn't write, which the Tools and
  agents Part answers.
- [Levels](../levels.md): Simple keeps one number per change. In depth shows that the worst orders
  all end with a positive example and explains contextual calibration, and notes that the position
  misses were confident ones.
