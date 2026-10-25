# Tools

**Question:** The prompt listed "tools". How can a model that only writes text use a calculator?

**Key idea:** Models are unreliable at exact work like arithmetic, because every digit is a predicted
token. A tool call is text in an agreed format: the model asks, the harness parses the text and runs
the tool, adds the result to the prompt, and calls the model again. The model never runs anything
itself. The Model Context Protocol (MCP) is a shared way for a harness to find tools offered by
other programs and pass calls to them; the model still only reads descriptions and writes calls in
its own format.

## Widgets

- `ToolsDemo`: "What is 1234 × 5678?" with tools off (the model guesses digits and gets it wrong)
  and on (it writes a calculator call, shown as a `ToolCallCard`, the harness runs it, and the model
  reads the result).

## Data

Recorded by `scripts/record/agent.py` (`static/data/agent/math-no-tools.json`,
`math-tools.json`): Qwen2.5-1.5B-Instruct.

## Decisions

- The Agents and Safety chapters show tool calls in a simplified, made-up format that is easy to read
  (`<call name>…</call>`), not a real provider's schema. Qwen's own JSON-in-`<tool_call>` output is
  converted to it, and the chapter says so.
- The toy tools run in the browser (`src/lib/harness/tools.ts`) and never use `eval` or the
  network.
- Live with the Large model tier ([downloads.md](../downloads.md#widgets)): `ToolsDemo` asks
  Qwen the visitor's own sum, without tools and then through one turn of the recording's harness
  with the toy calculator; the live model is Qwen2.5-0.5B-Instruct, not the recording's 1.5B (see [downloads.md](../downloads.md#what-can-be-downloaded)).
- Tool calls are presented as structured output, building on
  [Asking for steps and structure](steps-and-structure.md).
- MCP is described, not demonstrated: the toy tools are local functions, and the chapter says the
  model never sees the protocol. The spec is cited with an accessed date because it changes.
- [Levels](../levels.md): Simple keeps the calculator result and the harness's three steps in one
  sentence. In depth checks the model's long multiplication row by row, explains how Toolformer
  learned to call tools and Qwen's reserved tokens, and shows MCP's two messages.
