# Trust and guardrails

**Question:** If the model can be fooled, what stops a fooled agent from doing real damage?

**Key idea:** To the model, tool output is just more text, and prompt defenses alone don't stop it
from following that text. Safety has to come from the harness: permission prompts, tool allowlists,
sandboxes, and step limits.

## Widgets

- `InjectionDemo`: the agent is asked to summarize a (fake) web page whose hidden text tells it to
  delete the visitor's files. The visitor toggles guardrails (none, ask first, only safe tools, a
  step limit) and steps through what the agent does (`ToolCallCard`), with the page's text colored
  differently from the user's.

## Data

Recorded by `scripts/record/agent.py` (`static/data/agent/inject-*.json`): Qwen2.5-1.5B-Instruct
with the fake file system tool.

## Decisions

- The page's text fakes the end of the tool result and a new user message, which the recorded model
  followed; a plain "ignore your instructions" note didn't make it delete anything in testing.
  [Prompt injection](prompt-injection.md) explains why the fake message works.
- The file system is a toy in the browser; nothing real is ever deleted.
- [Levels](../levels.md): Simple keeps the four guardrails. In depth shows how the page fakes the
  end of the tool result, and what the allowlist run did against a guardrail written as code.
