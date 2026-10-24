# Roadmap

Work that isn't built yet. When something here is built, move its description into the spec it
belongs to and remove it here.

## Live models

- **Live attention.** The standard GPT-2 ONNX export used by Transformers.js has no attention
  outputs, so [Attention](chapters/attention.md) shows attention recorded for 5 sentences. A custom
  ONNX export with attention outputs would let visitors type their own sentence.
- **More live GPT-2 options:** the top guesses for the visitor's own sentence in
  [The guessing game](chapters/guessing-game.md), temperatures side by side in
  [Probability and sampling](chapters/probability-and-sampling.md), and timing generation with and
  without the KV cache in [Caching](chapters/caching.md) (if Transformers.js exposes the switch).
- **Live models for other kinds of models:** a small fill-mask encoder for
  [Reading both ways](chapters/encoders.md), and CLIP's text half for
  [Seeing pictures](chapters/seeing-pictures.md), so visitors can try their own sentences and
  captions.
- **T3, a chat model in the browser:** WebLLM on WebGPU with a ~0.5–1.5B instruct model (0.5–1 GB).
  It would give a live base vs. instruct comparison in
  [From predictor to assistant](chapters/predictor-to-assistant.md), a real chat in
  [The model is not the product](chapters/the-model-is-not-the-product.md), and live tool calling
  in the Tools and agents chapters, limited to the same in-browser toy tools.
- **T4, bring your own API key:** frontier output with top logprobs and tool calling, through the
  same `ModelProvider` interface. Rules when it's built:
  - keep the key in memory or `sessionStorage` only, never `localStorage`;
  - call the provider directly from the browser and never send the key anywhere else;
  - extend the CSP `connect-src` allowlist only for the providers supported;
  - warn clearly that the visitor's prompt goes to the provider;
  - never ship a key in the site.
- T3 and T4 both need WebGPU or provider test setups that CI's and local headless browsers don't
  have. A rate-limited serverless proxy for a hosted demo would leave the static scope and is a
  separate decision.

## New chapters

### Choosing actions (decision models)

A chapter at the end of Other kinds of models about models that pick actions instead of words.

- **Organization:** add _Choosing actions_ (`decision-models`) after
  [Painting from noise](chapters/diffusion.md), building on
  [Learning from mistakes](chapters/learning-from-mistakes.md),
  [Generating text](chapters/generating-text.md), and [The agent loop](chapters/the-agent-loop.md).
  It belongs in Other kinds of models because it changes what counts as a token. The Part grows to
  six chapters; the Wrap-up's numbers move up by one, derived from `curriculum.ts`.
- **Question:** "An agent picks actions by writing text. Could a model predict the actions
  directly?"
- **Key idea:** a run of a game becomes a sequence of tokens: the reward still to earn, what the
  player sees, and what it does, step after step. A small transformer trained on recorded runs
  predicts the next action the way GPT-2 predicts the next word. At run time you choose the reward
  to aim for, and the model acts like the runs that earned it: a Decision Transformer. Contrast
  with reinforcement learning, which learns by trial and error from rewards, and with the agent
  loop, where a language model describes an action in text and the harness carries it out.
- **Widget:** a small grid world (a start, a goal, and pits). A slider sets the target reward; the
  model plays the game step by step in the browser, with the (reward, state, action) tokens shown
  as a strip of chips under the grid. A low target wanders, a high one heads for the goal, and an
  impossible one shows what the model does outside its training data.
- **Data:** a recording script generates runs from a mix of random and scripted players, trains a
  tiny transformer offline, and ships its weights as JSON (computed in the browser, like the
  Painting from noise toy). Labeled as a toy.
- **Levels:** Simple keeps to "it copies runs that scored well"; In depth shows the token layout,
  the return-to-go arithmetic, and how a model trained on mixed-quality runs can still aim high.
- **Links:** Painting from noise's Next question leads into it, and its own leads into the Wrap-up.
  Add it to the recap paragraph and diagram, the closing box of
  [From message to reply](chapters/end-to-end.md), and a quiz question.
- **Sources:** Chen et al. 2021 (Decision Transformer), Reed et al. 2022 (Gato, one transformer
  for text, images, and actions), and Sutton and Barto 2018 (reinforcement learning).
- **Tests:** unit tests that the grid world's rewards and the token layout match the prose and
  that the shipped model reaches the goal for high targets; an e2e test that moves the slider and
  steps through a run; axe and phone-width checks.
- _Done when:_ the chapter, its spec, and its fact-check entries exist, the toy model reaches the
  goal for high targets and not for low ones, and curriculum.md, `curriculum.ts`, and the spec
  test agree.

## Content

- **Localization:** the site is English only. Translating means deciding whether to also swap the
  example corpora and re-record the data per language.
- **Expert review:** pending; see [sources.md](sources.md).

## Open questions

- None right now.
