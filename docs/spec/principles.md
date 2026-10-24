# Principles

LLM Kitchen is a static site that teaches how a large language model works. It starts with "guess
the next word", builds up to a full transformer generating text, shows how to prompt it, follows
the harness that turns that text generator into an assistant or agent, looks at other kinds of
models built from the same pieces, and ends by putting it all together. Each chapter adds one idea
and uses one main widget to show it.

## How it teaches

- **English only.** All prose, examples, corpora, and recorded runs are in English.
- **No prior knowledge.** Visitors need basic reading and arithmetic only. Math notation comes late,
  and always after a picture of the idea.
- **One idea per chapter.** Each chapter answers one question and ends by asking the next one (see
  [curriculum.md](curriculum.md)).
- **One running example.** The prompt _"The cat sat on the"_ appears throughout. Visitors watch the
  same sentence become bytes, then tokens, then vectors, then attention, then a prediction, then a
  chat message an agent answers.
- **Animation explains.** Every motion shows a transformation, such as a token turning into a
  vector. No decorative motion.
- **Try first.** Each chapter has a "try it" widget before the formal explanation.
- **Fully static.** The site works without a backend. Live models are opt-in extras, never needed to
  follow a lesson (see [models-and-data.md](models-and-data.md)).
- **Accessible.** Everything is keyboard-navigable, respects `prefers-reduced-motion`, and every
  animation has a text description and a step-through mode.
- **Accurate and cited.** Every factual claim and number links to a primary source (paper, model
  card, or official docs) or is checked by a test. Deliberate simplifications are labeled as such
  (see [sources.md](sources.md)).
- **Honest about data.** Every widget says whether it shows a recorded run of a real model, a live
  model, or a toy computed in the browser.

## Chapter structure

Every chapter has the same shape: **hook question → try-it widget → explanation and main
animation → live option (if useful) → recap card → sources → the question that leads to the next
chapter.** Each opens with an "Ingredients" box linking the earlier chapters it builds on.

## Writing for each level

A chapter can add Simple and In depth passages around its Standard text (see
[levels.md](levels.md)):

- **Simple:** no notation, no number that isn't the point, at most one analogy per idea, and every
  term defined on first use. Aim for about half the words of Standard. Never introduce a claim
  Standard doesn't make.
- **In depth:** equations follow the picture and the words, never replace them. Each equation
  names every symbol. Implementation notes say which model or paper they're true for. New sources
  are cited like any other claim and added to the chapter's fact-check list.
- **All levels:** the running example stays _"The cat sat on the"_; the chapter's question and the
  question that leads on stay the same.

## Success criteria

- A visitor with no ML background can, after finishing:
  - explain next-token prediction, tokens, embeddings, attention, and sampling;
  - explain why common prompting techniques work in terms of context and next-token probabilities;
  - explain how a harness turns a model into an agent, why repeated calls with the same opening are
    cheaper, and why text the model reads can hijack it;
  - say how encoders, mixture-of-experts, recurrent, vision, diffusion, and reasoning models differ
    from the standard model;
  - read a model's name and tell whether it fits their device.
- Every chapter works fully offline with recorded data. Live models are opt-in only.
- Lighthouse performance and accessibility are at least 95 on chapter pages without a live model.
- Every animation can be stepped through and respects reduced motion.
- Every chapter has passed its fact-check: claims are cited, tested, or labeled as simplifications.
