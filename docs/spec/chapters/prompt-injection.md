# Prompt injection

**Question:** The harness fills the prompt with text from many places: tool results, web pages,
files. What if some of that text gives the model instructions of its own?

**Key idea:** The model reads the user's request and everything the harness adds as one stream of
tokens, and it was tuned to follow instructions. Nothing in that stream marks which words are the
user's and which came from a document, so text that reaches the context can steer the model. Direct
injection comes from the person typing; indirect injection hides in content the harness fetched,
often where the user never looks. Defenses written into the prompt lower the odds, but none stops
every attack.

## Widgets

- `InjectionLab`: a harness asks a model to summarize a short document carrying a hidden
  instruction. The visitor picks an attack and a defense and sees the exact prompt, colored by
  source (a toggle removes the colors to show what the model gets), the recorded reply, and a tally
  of how often the injection won for each pair.
  - **Attacks:** none, a plain instruction, a fake system notice, a fake new message from the user
    written with chat template markers, and an instruction hidden in an HTML comment.
  - **Defenses:** none, a warning in the system prompt, tags around the document, repeating the task
    after it, marking every word of the document (spotlighting by datamarking), and removing chat
    markers from it.

## Data

Recorded by `scripts/record/injection.py` (`static/data/injection/lab.json`): Qwen2.5-1.5B-Instruct,
greedy, over three documents (an email, a web page, and a review) for each attack and defense. Every
reply is graded by code.

## Decisions

- The injected goal is a false claim slipped into the summary: harmless, checkable by code, and like
  real attacks on summarizers. Asking for only a code word almost never worked (the model worked the
  word into its summary instead), and asking it to add a link worked only 3 times in 72.
- The lab shows the prompt in its own colored view rather than the inspector from
  [The model is not the product](the-model-is-not-the-product.md).
- Results come from one small model and are labeled as showing the mechanism, not real-world rates.
- What a steered model can then do is left to [Trust and guardrails](trust-and-guardrails.md).
