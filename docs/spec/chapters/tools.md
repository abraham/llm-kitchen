# Tools

**Question:** The prompt listed "tools". How can a model that only writes text use a calculator?

**Key idea:** Models are unreliable at exact work like arithmetic, because every digit is a predicted
token. A tool call is text in an agreed format: the model asks, the harness parses the text and runs
the tool, adds the result to the prompt, and calls the model again. The model never runs anything
itself.

## Widgets

- `ToolsDemo`: "What is 1234 × 5678?" with tools off (the model guesses digits and gets it wrong)
  and on (it writes a calculator call, shown as a `ToolCallCard`, the harness runs it, and the model
  reads the result).

## Data

Recorded by `scripts/record/agent.py` (`static/data/agent/math-no-tools.json`,
`math-tools.json`): Qwen2.5-1.5B-Instruct.

## Decisions

- The Harnesses chapters show tool calls in a simplified, made-up format that is easy to read
  (`<call name>…</call>`), not a real provider's schema. Qwen's own JSON-in-`<tool_call>` output is
  converted to it, and the chapter says so.
- The toy tools run in the browser (`src/lib/harness/tools.ts`) and never use `eval` or the
  network.
- Tool calls are presented as structured output, building on
  [Asking for steps and structure](steps-and-structure.md).
