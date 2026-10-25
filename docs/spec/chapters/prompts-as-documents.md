# A prompt is the start of a document

**Question:** Knowing how the model works, how do you write prompts that work with it?

**Key idea:** A model doesn't "understand a request"; it continues a document. Every word in the
prompt shifts the next-token probabilities, through attention to the earlier text. A good prompt
makes the answer you want the most likely continuation.

## Widgets

- `PromptVariants`: change one part of a prompt at a time (a sentence that sets the scene, "Q: … A:"
  framing, an unfinished sentence) and watch GPT-2's next-token bars move (`ProbBars`), with the
  words the last token attends to shaded. The live option runs the visitor's own variants.

## Data

- Recorded by `scripts/record/prompts.py` (`static/data/prompts/wording.json`): GPT-2 small's next-token
  guesses for each variant and the last token's attention, averaged over all heads, with the first
  token left out and shown separately.
- Live (T2): GPT-2 small, once the visitor chooses the Small model tier.

## Decisions

- [Levels](../levels.md): Simple keeps the numbers that carry the point (_bed_ from 7% to 22%,
  _Paris_ six times as likely). In depth explains why the first token soaks up attention (a
  sink, and why the widget leaves it out) and what a next-token probability does and doesn't count.
