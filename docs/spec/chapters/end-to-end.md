# From message to reply

**Question:** Those are the pieces. In what order do they run when you send a message?

**Key idea:** Sending a message runs the harness first, then the model once per token, then the
harness again. The model's loop adds one token per run; the harness's loop adds one tool result per
call. Everything the model sees, including tool results, is one stream of tokens in a single prompt.
Other kinds of models swap one stage and keep the rest of the order.

## Widgets

- `EndToEnd`: one box diagram of the whole process for a single message, in the order it runs. Each
  box says what happens, shows the real input and output at that stage, and links to the chapters
  that explain it. The visitor steps through the stages (`StepController`, keyboard, reduced motion)
  or jumps to any box.
  - **Stages:** the message is typed; the harness builds the prompt; the provider reuses the cached
    start; text becomes tokens; tokens become vectors (plus positions); transformer blocks refine
    them; the last vector becomes a probability for every token; one token is picked; it is appended
    and the model runs again until an end-of-turn token (a reasoning model's scratch work and a
    drafter's guesses happen in this loop); the harness reads the reply and, for a tool call, checks
    it against its guardrails, runs it, adds the result, and calls the model again, trimming,
    summarizing, or retrieving when the conversation gets too long; the reply is shown.
  - **Loops drawn as loops:** the token loop is a framed group inside the model call, and the agent
    loop is a framed group around it, each with a labeled return line, on every screen size.
  - Tool results are colored as untrusted where they enter the prompt.
  - A closing box for other kinds of models: each swaps one stage (the attention mask, the MLP,
    what counts as a token, or the generation loop).

## Data

- Stages and their chapter links live in `src/lib/data/end-to-end.ts`.
- The running example is the recorded conversation from
  [The model is not the product](the-model-is-not-the-product.md) ("Finish this: The cat sat on
  the", one `search_rhymes` call, then the answer).
- Stages inside the model show GPT-2 small's recorded run on the same words, labeled as such, since
  Qwen's internals weren't recorded.

## Decisions

- It states nothing new: its claims are checked against the chapters it links.
- A unit test checks that every numbered Part except Other kinds of models is linked from at least
  one stage, and Other kinds of models from the closing box.
