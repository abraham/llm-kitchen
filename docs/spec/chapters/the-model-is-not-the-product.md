# The model is not the product

**Question:** In a chat app, code you never see writes most of the prompt. What does that code do?

**Key idea:** A chat app or agent is a model plus a harness: ordinary code around it. The harness
builds the prompt (system prompt, tool descriptions, earlier turns, and chat markers), calls the
model, and decides what to do with the output. The model has no memory; the harness re-sends the
conversation on every call.

## Widgets

- `PromptInspector`: the chat as the app shows it, next to the exact text the harness sends to the
  model for it, colored by where each part came from (system prompt, tool descriptions, earlier
  turns, chat markers, the visitor's message). Each kind can be shown or hidden.

## Data

Recorded by `scripts/record/agent.py` (`static/data/agent/chat.json`): Qwen2.5-1.5B-Instruct in a
small Python harness.

## Decisions

- The inspector shows a recorded conversation, not the visitor's own typing, since there is no live
  chat model yet (see [roadmap.md](../roadmap.md)).
- The system prompt itself was introduced in
  [Instructions, roles, and the system prompt](instructions-and-roles.md); this chapter refers back.
- [Levels](../levels.md): Simple keeps the 31 characters and 400 tokens and drops the list of parts
  to one sentence. In depth counts where the 400 tokens go and what the second call added.
