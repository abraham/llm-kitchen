# Text is just numbers

**Question:** A computer can't read. So how does a model get from letters on a page to something it
can calculate with?

**Key idea:** Computers only work with numbers, so text must become numbers first. Unicode gives
every character a number (84 for _T_), and UTF-8 stores those numbers as bytes: one for basic
English letters, up to four for others.

## Widgets

- `TextToNumbers`: the visitor types text, and each character flips like a split-flap display to
  land on its code number, with its UTF-8 bytes.

## Data

Computed in the browser.

## Decisions

- It opens Representation, answering the question that ends
  [Probability and sampling](probability-and-sampling.md): text → numbers → tokens → vectors is one
  story.
