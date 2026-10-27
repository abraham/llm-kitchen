# Instructions, roles, and the system prompt

**Question:** Chat models come with a system prompt. Does telling the model who to be change what it
can do?

**Key idea:** The system prompt is text in a slot at the start of the chat, read like any other text.
Instruction-tuned models were trained on conversations that follow instructions, so clear, specific
instructions about audience, length, and format are followed well. A persona changes style more
reliably than correctness; "you never make mistakes" doesn't make it so.

## Widgets

- `SystemPrompts`: the same questions with different system prompts (none, a persona, specific
  instructions) side by side, with the chat template showing where the system prompt goes.
- `RuleCount`: 12 short notes, each written under 1, 2, 4, 6, 8, and 10 rules a program can check.
  A table of rules kept and of notes that kept every rule, and one note's rules (kept or missed)
  with its reply.

## Data

Recorded by `scripts/record/prompts.py` (`static/data/prompts/system.json`): Qwen2.5-1.5B-Instruct,
greedy. `static/data/prompts/rules.json` (the `rules` job): the same model, greedy, with each rule
checked by code; `facts.test.ts` re-runs the checks on the stored replies.

## Decisions

- The rules can all be kept at once, so every miss is the model's. Each note starts the list at a
  different rule, so no rule is always first or last.
- The text reports what the recording shows: the share of rules kept didn't fall with more rules,
  but the chance of keeping all of them did. In depth explains why with $p^k$.
- This chapter introduces the system prompt itself, from the system slot in
  [From predictor to assistant](predictor-to-assistant.md)'s chat template.
  [The model is not the product](the-model-is-not-the-product.md) refers back to it.
- The template view is its own widget, with the system prompt highlighted, rather than the prompt
  inspector, which comes later.
- Live with the Large model tier ([downloads.md](../downloads.md#widgets)): `SystemPrompts` asks
  Qwen each system prompt's reply and the sums again, and takes the visitor's own system prompt;
  the live model is Qwen2.5-0.5B-Instruct, not the recording's 1.5B (see [downloads.md](../downloads.md#what-can-be-downloaded)).
- [Levels](../levels.md): Simple keeps the three results in words. In depth shows where the system
  prompt sits in the template, Qwen's default when none is given, and training an instruction
  hierarchy against prompt injection.
