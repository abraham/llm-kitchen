# Recap: the whole picture

**Question:** How do all the pieces fit together?

**Key idea:** A language model predicts the next token, nothing more, and does it very well at scale.
What looks like a chat, a memory, or an agent is a harness calling that model in loops. Most quirks,
from made-up facts to miscounted letters, follow from those two facts. Other models swap one piece
(the attention mask, the MLP, or what counts as a token) and keep the rest of the recipe. A prompt is
the start of a document: everything in it shifts the next token, so test it.

## Widgets

- `WholePicture`: one zoomable diagram, from bytes to the harness loop, with each part linking back
  to the chapter that explains it. Reasoning models sit with the model; prompt engineering appears
  as ways of shaping the context; other kinds of models appear as variations on the same pieces.

## Data

A hand-drawn diagram; GPT-2 numbers in it come from `models/canonical.json`.

## Decisions

- The recap shows what the pieces _are_; [From message to reply](end-to-end.md) shows the order they
  run in. The quiz is its own chapter, [Check yourself](quiz.md).
- A new chapter is added to the recap paragraph and diagram.
- [Levels](../levels.md): Simple restates the one-paragraph summary in plainer words. In depth
  puts the earlier In depth formulas together into GPT-2 in a few lines.
