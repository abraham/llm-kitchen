# llm-kitchen — Plan

A static site that teaches how a large language model works. It starts with "guess the next word", builds up to a full transformer generating text, follows with the harness that turns that text generator into an assistant or agent, looks at other kinds of models built from the same pieces, and ends with how to write prompts that work, and why they do. Each chapter adds one idea, uses one main animation to reinforce it, and includes an optional live model demo where that helps.

---

## 1. Goals and principles

- **English only (v1).** All prose, examples, corpora, and recorded traces are in English.
- **Assume no prior knowledge.** Visitors need basic reading and arithmetic only. Introduce math notation late, and always show a picture of the idea first.
- **One idea per chapter.** Each chapter answers one question and ends by asking the next one.
- **Reuse one example.** The prompt _"The cat sat on the"_ appears in every chapter. Visitors watch the same sentence become bytes, then tokens, then vectors, then attention, then a prediction.
- **Use animation to explain.** Every motion should show a transformation, such as a token turning into a vector. Avoid decorative motion.
- **Let visitors try things first.** Each chapter has a "try it" widget before the formal explanation.
- **Keep it fully static.** The site must work without a backend. Live model features are optional extras and are never required to follow the lessons.
- **Support accessibility and reduced motion.** Respect `prefers-reduced-motion`, make everything keyboard-navigable, and give each animation a text description and a step-through mode.
- **Be accurate and cite sources.** Every factual claim and number links to a primary source (paper, model card, or official docs). Deliberate simplifications are labeled as such instead of being stated as fact.

---

## 2. Tech stack

| Concern                 | Choice                                                                                                                                                                                                                                                               | Why                                                                                                                                                                    |
| ----------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Framework               | **SvelteKit 3** + `@sveltejs/adapter-static` (every route prerendered), configured in `vite.config.ts`; `#lib` subpath imports instead of `$lib`                                                                                                                     | Fully static output, file-based routing, and Vite for workers and WASM.                                                                                                |
| Components              | **Svelte 5** (runes: `$state`, `$derived`, `$effect`)                                                                                                                                                                                                                | Small compiled output and fine-grained reactivity, which suits widgets that update on every slider change.                                                             |
| Content                 | **mdsvex** (`.svx` chapters)                                                                                                                                                                                                                                         | Markdown prose with Svelte widgets dropped inline.                                                                                                                     |
| Animation               | Svelte's built-in `svelte/motion` (`Tween`, `Spring`), `svelte/transition` (`crossfade`, `fade`, `fly`), and `svelte/animate` (`flip`). **D3** (scales and shapes only) for charts. Canvas or WebGL (via `regl`) only for dense visuals such as the embedding cloud. | Built-in, interruptible, and needs no extra animation library. `crossfade` handles the shared-element morphs.                                                          |
| Scroll storytelling     | `IntersectionObserver` plus a small step controller                                                                                                                                                                                                                  | Scrolling moves the animation through its steps, and Prev/Next buttons do the same.                                                                                    |
| Tokenizer               | `gpt-tokenizer` / `js-tiktoken`                                                                                                                                                                                                                                      | Real BPE tokenization in the browser with no model download.                                                                                                           |
| In-browser models       | **Transformers.js** (ONNX/WebGPU/WASM) and optionally **WebLLM**                                                                                                                                                                                                     | Lets the site show real logits, attention, and embeddings with no server.                                                                                              |
| Styling                 | CSS custom properties and a small design-token file                                                                                                                                                                                                                  | Gives each concept a consistent color (see §5).                                                                                                                        |
| Hosting                 | **Firebase Hosting**, deployed from GitHub Actions (`FirebaseExtended/action-hosting-deploy`) authenticated with [`abraham/firebase-wif`](https://github.com/abraham/firebase-wif)                                                                                   | Static hosting with CDN, headers (CSP) set in `firebase.json`, a temporary **preview channel** per pull request, and no long-lived deploy keys.                        |
| Testing                 | Vitest for logic, Playwright for widget smoke tests and visual snapshots                                                                                                                                                                                             |                                                                                                                                                                        |
| Formatting              | **Prettier** + `prettier-plugin-svelte`                                                                                                                                                                                                                              | One format for TS, JS, Svelte, CSS, JSON, Markdown, and YAML. Checked in CI. `.svx` chapters are excluded because Prettier has no mdsvex parser and would mangle them. |
| Linting and type checks | **ESLint** (flat config, `typescript-eslint`, `eslint-plugin-svelte`, `eslint-config-prettier`) and `svelte-check`                                                                                                                                                   | Catches bugs and type errors without fighting Prettier over style.                                                                                                     |
| CI                      | **GitHub Actions**                                                                                                                                                                                                                                                   | Every push and pull request runs format check, lint, type check, unit tests, build, and Playwright tests.                                                              |

---

## 3. Curriculum

The organization into Parts and chapters (order, numbers, titles, slugs, and what each chapter builds
on) is owned by [docs/CURRICULUM.md](CURRICULUM.md). This section describes what each chapter
contains, in the site's current order.

Every chapter has the same structure:
**Hook question → Try-it widget → Explanation and main animation → Live LLM option (if useful) → Recap card → Sources → The question that leads to the next chapter.**

### Part I — Prediction

**Ch 0. The guessing game**

- _Hook:_ "Finish this sentence: The cat sat on the ___"
- _Try it:_ The visitor types a guess and sees where it falls in GPT-2's recorded top 50 (rank and probability). No made-up "other people's guesses": there is no real survey data to show.
- _Animation:_ Many possible next words fan out from the blank, each with a bar showing how likely it is.
- _Key idea:_ An LLM is a machine that predicts the next piece of text, over and over.
- _Live option:_ The model completes the same prompt and shows its top 5 guesses with probabilities.

**Ch 1. Predicting by counting**

- _Try it:_ Build a **bigram model** from a tiny text (nursery rhymes). Then click "generate" and watch it produce gibberish that still looks a bit like the source.
- _Animation:_ A count table fills in cell by cell as a cursor moves through the text. The table then turns into probability bars.
- _Key idea:_ Prediction is "what usually comes next?", and counting is the simplest way to answer it.
- _Next question:_ "Why is the output bad? It only looks one word back."

**Ch 2. Probability and sampling**

- _Try it:_ Adjust **temperature** and **top-k** sliders on a probability distribution, then sample 20 times.
- _Animation:_ Bars sharpen or flatten as temperature changes. A spinner wheel whose slice sizes match the bars picks the next word.
- _Key idea:_ The model outputs a probability distribution, and something else decides which word to pick.
- _Live option:_ Run the same prompt at temperatures 0, 0.7, and 1.5 side by side.

### Part II — Representation

**Ch 3. Text is just numbers**

- _Try it:_ Type text and see each character turn into its code number (bytes and Unicode).
- _Animation:_ Letters flip like a split-flap display and land on their numbers.
- _Key idea:_ Computers only work with numbers, so the first step is turning text into numbers.

**Ch 4. Tokens: the model's alphabet**

- _Try it:_ Paste any text and see how GPT-style models split it into colored tokens with IDs.
- _Animation:_ A step-by-step **BPE** demo on a small corpus where the most frequent pair merges, the vocabulary grows, and the token count drops.
- _Key idea:_ Models read chunks of text that sit between single characters and whole words.
- _Fun fact:_ Why does "strawberry" make counting letters hard? Show how it gets split.
- _Live option:_ Compare tokenizers from different models (no model download needed).

**Ch 5. Meaning as position (embeddings)**

- _Try it:_ A 2D map of words. Pick a word (from the list or by clicking it) and see its nearest neighbors, computed from the full vectors. (Not dragging: moving a point in the 2D picture wouldn't change its real vector.)
- _Animation:_ Each token becomes a list of numbers, then a point on the map. Similar words drift together. The classic "king − man + woman ≈ queen" example is shown as an arrow.
- _Key idea:_ Each token becomes a vector, and nearby vectors have related meanings.
- _Live option:_ Embed the visitor's own words with a small embedding model (`all-MiniLM-L6-v2`, ~23 MB quantized plus ~27 MB for the ONNX runtime) and plot them on the map (projected to 2D with the same PCA basis).

### Part III — Learning

**Ch 6. A neuron**

- _Try it:_ Adjust the weights and bias on one neuron and see how its output changes.
- _Animation:_ Inputs flow along wires, each scaled by its weight, then summed and passed through an activation function.
- _Key idea:_ A neuron multiplies, adds, and squashes. Many neurons together form a network.

**Ch 7. Learning from mistakes**

- _Try it:_ Press "train" and watch a tiny network fit a curve. Then train a **tiny character-level model** live in the browser on the rhymes from Ch 1 (a hand-written MLP, under 50k parameters).
- _Animation:_ A ball rolls down a loss landscape (gradient descent). A loss curve falls next to sample text that gets better as it trains.
- _Key idea:_ Training means nudging the weights so that the correct next token becomes more likely.
- _Live option:_ The visitor trains the model themselves. This runs entirely in the browser and is the most hands-on demo on the site.

### Part IV — Context

**Ch 8. The context problem**

- _Hook:_ "The trophy didn't fit in the suitcase because **it** was too big." What does "it" refer to?
- _Animation:_ A fixed-size window slides over the text and misses the clue word.
- _Key idea:_ Good predictions need to use information from anywhere in the text so far.

**Ch 9. Attention**

- _Try it:_ Click a token and see which earlier tokens it "looks at". Line thickness shows the attention weight.
- _Animation:_ Each token sends out a **query** that is matched against every **key**. The resulting weights blend the **values**. Built up in three steps: first as a spotlight analogy, then as a dot-product grid, then as a softmax-weighted mix.
- _Key idea:_ Each token collects information from the tokens it finds relevant.
- _Live option:_ Real attention patterns from the canonical small model, with layer and head selectors. v1 records them (T0, all 144 heads for 5 sentences) because the standard ONNX export has no attention outputs; see Future improvements.

**Ch 10. The transformer block**

- _Animation:_ The block is assembled piece by piece: embeddings + position, attention, a small MLP, the residual "highway" connections, and normalization. The block is then copied N times to form a stack.
- _Try it:_ A "residual stream" view of the vector for "the" in "The cat sat on the", block by block, with the logit lens showing what the model would guess if it stopped at each block.
- _Key idea:_ A transformer stacks the same block many times, and each block refines the representation a little.

### Part V — Putting it together

**Ch 11. Generating text**

- _Try it:_ **Glass-box generation.** Step through generation one token at a time. Each step shows the tokens, the probability bars, the sampled token, and the token being appended to the input.
- _Animation:_ The full pipeline runs from left to right, using the same visual elements as earlier chapters (token chips → vectors → stack → bars → wheel).
- _Key idea:_ Generation is one forward pass, then pick a token, then append it, then repeat.
- _Live option:_ This is the main live demo. It runs a real small model with full step-through and lets the visitor override the chosen token.

**Ch 12. Scale**

- _Animation:_ An interactive log-scale comparison (bigram → tiny model → GPT-2 → modern frontier models) of parameter count, training tokens, and compute.
- _Key idea:_ The same recipe works much better at very large scale. Show charts illustrating scaling laws.

**Ch 15. From predictor to assistant**

- _Try it:_ Show the "chat" formatting that wraps a conversation, revealing that a chat is still just text being continued.
- _Animation:_ Three stages: pretraining (internet text) → instruction tuning (example conversations) → preference tuning (thumbs up/down nudging the model).
- _Live option:_ Give the same prompt to a **base** model and to an **instruct** model side by side. v1 shows recorded outputs (Qwen2.5-0.5B base and instruct, with and without the chat template, plus GPT-2); a live T3 version is a future improvement.

**Ch 16. Quirks and limits**

- Hallucination ("the most likely continuation is not the same as the truth"), knowledge cutoff, context limits, tokenization blind spots, and sensitivity to prompt wording.
- _Live option:_ Guided experiments the visitor can run against the live model.

**Ch 17. Thinking before answering (reasoning models)**

- _Hook:_ "Some models pause to 'think' before they answer. What is the thinking?"
- _Try it:_ The same small puzzles asked with thinking off and on, stepping through the tokens the model writes before its answer. A tally compares correct answers and tokens used.
- _Animation:_ The Ch 11 token loop, with a stretch of "scratch work" tokens before the answer that the harness hides from the chat bubble.
- _Key idea:_ A reasoning model is still a next-token predictor. It has been trained, often with rewards for answers that can be checked, to write out its working first, spending more tokens (and compute) on each answer.
- _Data:_ Recorded runs (T0) of a small open model with a thinking switch, such as Qwen3.

### Part VI — Prompt engineering

Prompt engineering is choosing the text a model continues. Everything in this Part follows from the earlier chapters: the prompt is the context (Ch 8), attention decides which parts of it matter (Ch 9), and every word shifts the probabilities of the next token (Ch 2). Each chapter shows a technique, then shows _why_ it works in those terms, and is honest about what is known to work and what is folklore.

Demos reuse models the site already records: GPT-2 small for the raw effect of wording on next-token probabilities (recorded, plus live via T2), and the Qwen2.5 instruct models also used in Part V and VII for instructions and system prompts (recorded, T0). No new downloads are needed.

**Ch 18. A prompt is the start of a document**

- _Hook:_ "Why does the same question get a better answer when you word it differently?"
- _Try it:_ Change one part of a prompt at a time ("Q: … A:" framing, a title, a sentence that sets the scene) and watch GPT-2's next-token bars move. The visitor can type their own variant in the live option.
- _Animation:_ The probability bars from Ch 2 shift as words are added to the prompt; the added words light up in the attention lines from Ch 9.
- _Key idea:_ A model doesn't "understand a request"; it continues a document. A good prompt makes the answer you want the most likely continuation.
- _Live option:_ Live GPT-2 (T2) on the visitor's own prompt variants.

**Ch 19. Learning from examples in the prompt (few-shot)**

- _Hook:_ "Show a model three examples of a made-up rule. Does it learn the rule without any training?"
- _Try it:_ A made-up task (e.g. turning words into their opposites, or a nonsense label for each animal) with 0, 1, 2, and 4 examples. A chart shows the probability of the right answer as examples are added.
- _Animation:_ Attention from the new question reaches back to the matching parts of the examples, the "copy the pattern" behavior of induction heads.
- _Key idea:_ The weights don't change; the examples are just context that attention can copy patterns from. This is in-context learning.
- _Data:_ Recorded probabilities and attention from GPT-2 small and a small instruct model (T0).

**Ch 20. Instructions, roles, and the system prompt**

- _Hook:_ "Does telling a model 'You are an expert' make it one?"
- _Try it:_ The same question with different system prompts (none, a persona, specific instructions about format and audience) side by side, with the chat template from Ch 15 showing where each piece goes.
- _Animation:_ The chat template from Ch 15 with the system prompt slot filled in different ways.
- _Key idea:_ Instruction-tuned models were trained on conversations that follow instructions, so clear, specific instructions work. A persona changes style more reliably than it changes correctness.
- _Data:_ Recorded runs of Qwen2.5-0.5B/1.5B-Instruct (T0).

**Ch 21. Asking for steps and structure**

- _Hook:_ "Why does 'Let's think step by step' help?"
- _Try it:_ The Ch 17 puzzles asked plainly, with "think step by step", and with a required answer format (e.g. a final line or JSON). A tally shows right answers and how often the output can be parsed by code.
- _Animation:_ The Ch 11 generation loop, with the working tokens feeding back into the context before the answer.
- _Key idea:_ Asking for steps gives the model room to write intermediate results it can build on (the same reason reasoning models think, Ch 17). Asking for a fixed format makes the output usable by programs; Ch 24's tool calls build on this.
- _Data:_ Recorded runs of a small instruct model (T0).

**Ch 22. Where prompts break**

- _Hook:_ "Why does reordering the examples change the answer?"
- _Try it:_ Swap the order of few-shot examples, change harmless formatting (spacing, labels), or move a key fact to the middle of a long prompt, and see the answers change.
- _Animation:_ A long context with the key fact sliding from the start to the middle to the end, and the answer's probability rising and falling.
- _Key idea:_ Small, meaningless changes can swing results, and facts in the middle of long prompts get used less. Good prompting means testing variants, not trusting one wording. Its Next question turns to prompts the visitor didn't write, which Part VII takes up.
- _Data:_ Recorded runs (T0).

### Part VII — Harnesses

The model only turns text into a next-token distribution. Everything else in a chat app or coding agent is ordinary code wrapped around it: the **harness**. Harness demos default to a scripted model (T0 traces of real runs). Their tools are toys that run in the browser: a calculator, a lookup over a small bundled corpus, and a fake file system. They never touch the network or the visitor's real files.

v1 records the runs with Qwen2.5-1.5B-Instruct in a small Python harness (`scripts/build-agent-traces.py`) whose tools mirror the browser ones (`src/lib/harness/tools.ts`; tests check they give identical results). The prompt inspector shows a recorded conversation rather than the visitor's own typing, since there is no live chat model yet.

**Ch 23. The model is not the product**

- _Hook:_ "When you chat with an assistant, what does the model actually see?"
- _Try it:_ A **prompt inspector**. The visitor types _"Finish this: The cat sat on the"_ into a chat box, then expands the exact text the harness sends to the model: system prompt, chat template markers (from Ch 15), earlier turns, and tool definitions, all colored by where they came from.
- _Animation:_ The visitor's short message gets wrapped layer by layer until it is a small part of a long prompt. The model's reply is then unwrapped back into a chat bubble.
- _Key idea:_ A harness is the code around the model. It builds the prompt, calls the model, and decides what to do with the output.

**Ch 24. Tools**

- _Try it:_ Ask _"What is 1234 × 5678?"_ with tools off and with tools on. With tools off, the model guesses digits token by token. With tools on, it writes a calculator call, the harness runs it, and the model reads the result.
- _Animation:_ The model's output text turns into a structured `ToolCallCard` (tool name + arguments). The harness runs the tool, and the result slides back into the context as new tokens.
- _Format:_ Part VII uses a simplified, made-up tool-calling format that is easy to read (e.g. `<call calculator>1234 * 5678</call>`), not a real provider's JSON schema. Recorded traces are converted to it, and live T3/T4 responses are mapped to it for display.
- _Key idea:_ A tool call is just text in an agreed format. The model never runs anything itself; the harness parses the text and acts on it.
- _Live option:_ T3 or T4 with a model that supports tool calling, limited to the same in-browser toy tools.

**Ch 25. The agent loop**

- _Try it:_ Give a small task ("Find which rhyme from Ch 1 mentions a cat and count its words") and step through the run: think, call a tool, read the result, repeat, then answer.
- _Animation:_ Two nested loops. The inner loop is the token loop from Ch 11. The outer loop is the harness loop: call the model, run tools, append results, call again. A step counter and a stop condition (final answer or step limit) sit on the outer loop.
- _Key idea:_ An agent is a model called in a loop by a harness that feeds tool results back in until the task is done.

**Ch 26. Managing the context**

- _Try it:_ A **context budget** bar. As the agent from Ch 25 keeps working, the bar fills. The visitor picks a strategy when it overflows: drop the oldest turns, summarize them, or retrieve only relevant snippets.
- _Animation:_ Retrieval reuses the embedding map from Ch 5. The question becomes a point, the nearest document chunks light up, and only those are copied into the prompt.
- _Key idea:_ The context window is finite (Ch 8, Ch 16), so the harness decides what the model gets to see. Retrieval, summaries, and memory notes are all ways of choosing text to put back in.

**Ch 27. Reusing the work (caching)**

- _Hook:_ "The agent from Ch 25 sent almost the same long prompt to the model on every step. Does the model really start from scratch each time?"
- _Try it:_ Two views of the same idea.
  - **Inside one reply (the KV cache):** step through the Ch 11 generation loop with the cache off and on. With it off, every new token reruns the whole text so far through every block. With it on, each token's keys and values (Ch 9) are stored as it is processed, and only the new token is computed. A counter tallies the work for each, and shows that the output is the same.
  - **Across calls (prompt caching):** the model calls from a recorded Part VII agent run, lined up as rows of token chips. The part of each call that matches the start of an earlier one is shaded as cached. The visitor makes the edits harnesses make: append a turn, change a word in the system prompt, put the time at the top, or drop the oldest turn (Ch 26). The shading, an illustrative cost, and the time to the first token update.
- _Animation:_ The Ch 9 attention grid gains one row per new token. Earlier tokens' keys and values sit on a "cache" shelf and are reused instead of recomputed; the new token still attends to all of them.
- _Key idea:_ With the causal mask (Ch 9), a token's keys and values depend only on the text before it, so they can be computed once and reused. Model providers keep that cache between calls for a prompt's exact opening, so a harness that keeps the start of its prompt fixed (system prompt, tool definitions, earlier turns) and only appends gets cheaper and faster calls. Changing anything early invalidates everything after it. The cache saves work; it doesn't change the answer, and it isn't memory that carries over between conversations.
- _Data:_ Work counts computed from GPT-2 small's config (`models/canonical.json`) and token counts from the recorded agent runs (T0). Provider caching rules (minimum length, discount, how long a cache lives, automatic or requested) are cited from provider docs with accessed dates and labeled as varying by provider; the cost view uses round illustrative prices.
- _Live option:_ Time live GPT-2 (T2) generating with and without its cache, if Transformers.js exposes the switch.

**Ch 28. Prompt injection**

- _Hook:_ "If a web page says 'Ignore your instructions', why would a model listen?"
- _Try it:_ A **prompt injection lab**. A harness asks a model to summarize an email or web page that contains a hidden instruction. The visitor picks an attack and a defense and sees the exact prompt (the Ch 23 inspector) and the recorded reply. A tally shows how often the injected instruction won for each pair.
  - **Attacks:** a plain "ignore your instructions", an instruction dressed as a system notice, a fake end of the document followed by a fake user turn written with the chat template markers from Ch 15, and text a person wouldn't see on the page (an HTML comment, white-on-white text, alt text).
  - **Defenses in the prompt:** none, a warning in the system prompt, delimiters around the untrusted text, repeating the task after it, marking every untrusted line, and the harness removing chat template markers from untrusted text.
  - The injected goal is harmless and checkable by code (e.g. end the reply with a code word), so the tally is graded automatically.
- _Animation:_ The user's request and the fetched page are colored by where they came from, then flatten into one row of token chips that attention (Ch 9) treats the same. A fake role marker in the page turns into the same tokens as a real one.
- _Key idea:_ The model reads one stream of tokens and was tuned to follow instructions (Ch 15). Nothing in that stream marks which words are the user's and which came from a document, so any text that reaches the context can steer the model. Direct injection comes from the person typing; indirect injection hides in content the harness fetched (Ch 24). Prompt defenses lower the success rate but none reach zero, so the damage depends on what the harness lets a steered model do: run tools, or render a link that sends data away. That is Ch 29.
- _Data:_ Recorded runs (T0) of Qwen2.5-1.5B-Instruct, already used in Part VII, over several documents per attack and defense pair. Results are from one small model and labeled as such.

**Ch 29. Trust and guardrails**

- _Try it:_ A **prompt injection** demo with real consequences. The agent reads a (fake) web page whose text tells it to delete all files (v1: the text fakes the end of the tool result and a new user message, which the recorded model followed; Ch 28 explains why). The visitor toggles guardrails and sees what changes.
- _Animation:_ Text from a tool result flows into the same context as the user's instructions, colored differently, but the model reads it all as one stream of tokens.
- _Key idea:_ To the model, tool output is just more text, and Ch 28 showed that prompt defenses alone don't stop it from following that text. The harness has to supply the safety: permission prompts, tool allowlists, sandboxes, and step limits.

### Part VIII — Other kinds of models

Everything so far has been one kind of model: a decoder-only transformer that reads text and predicts the next token. Part VIII shows how other models change one piece of that recipe and keep the rest, so each chapter starts from what changed ("same as Ch N, except…") and reuses the earlier widgets and visual elements. It closes with what these models share.

Demos follow the same tiers as before: recorded runs of real models by default (T0), computed toys trained or run in the browser where a real model is too big, and optional live models where a small one exists. Toy versions are labeled as simplified.

**Ch 30. Reading both ways (encoders)**

- _Hook:_ "GPT-2 fills in the blank at the end of a sentence. What if the blank is in the middle?"
- _Try it:_ Fill in _"The cat sat on the [MASK] and purred."_ with an encoder (BERT-style, masked language model) and with GPT-2, which can only use the words before the blank. Toggle the attention mask between "earlier tokens only" and "every token" on the Ch 9 attention grid.
- _Animation:_ The triangular causal mask from Ch 9 fills in to a full square. Arrows from later words now reach back to the blank.
- _Key idea:_ Encoders read the whole text at once, so they are good at understanding (search, classification, embeddings) but can't generate text one token at a time. The embedding model from Ch 5 is one.
- _Live option:_ A small fill-mask model via Transformers.js (T2), if its download is reasonable; otherwise recorded (T0).

**Ch 31. Many experts (mixture of experts)**

- _Hook:_ "How can a model have hundreds of billions of numbers but only use a fraction of them for each token?"
- _Try it:_ Watch the tokens of a sentence pass through a block whose MLP is split into several **experts**. A small **router** scores the experts for each token and sends it to the top 2. The visitor sees which expert each token went to and the count of total vs. active numbers.
- _Animation:_ The Ch 10 block, with its MLP replaced by a row of experts and a switch in front of it.
- _Key idea:_ Mixture-of-experts models grow their total size without growing the work per token: each token only runs through a few experts.
- _Data:_ Real figures (e.g. Mixtral 8x7B: 8 experts, 2 per token). Routing recorded from a small open MoE (e.g. OLMoE-1B-7B) if recording it is practical; otherwise a computed toy router, labeled as simplified.

**Ch 32. Remembering without attention (RNNs and state-space models)**

- _Hook:_ "Attention looks back at every earlier token. What if the model could only keep a short summary instead?"
- _Try it:_ A tiny character-level **recurrent** model, trained in the browser on the Ch 1 rhymes like Ch 7's model. Step through a sentence and watch its fixed-size memory (a `VectorStrip`) update one character at a time. A chart beside it compares memory use as the text grows: attention's grows with every token (the KV cache from Ch 27), the recurrent model's stays the same.
- _Animation:_ The Ch 8 sliding window is replaced by a single box that the text flows through, keeping only a summary.
- _Key idea:_ Recurrent and state-space models (such as Mamba) carry a fixed-size state instead of looking back at everything. That makes long texts cheap, at the cost of having to decide what to forget.

**Ch 33. Seeing pictures (vision and multimodal models)**

- _Hook:_ "How can a model that reads tokens look at a photo?"
- _Try it:_ Pick an image and cut it into a grid of patches. Each patch becomes a vector, like a token in Ch 5, and the patches go through the same transformer. Then explore a shared map of images and captions, where matching pictures and words land close together.
- _Animation:_ An image splits into tiles that line up into a row of `VectorStrip`s, the same row of vectors a sentence becomes.
- _Key idea:_ Anything that can be cut into pieces and turned into vectors can go through a transformer. Chat models that "see" put image tokens into the same context as text tokens.
- _Data:_ Recorded CLIP-style embeddings for a small set of bundled, openly licensed images and their captions (T0).
- _Live option:_ Embed the visitor's own caption with the text half of the model (T2) and see which images it lands near.

**Ch 34. Painting from noise (diffusion models)**

- _Hook:_ "Image generators don't draw one pixel at a time. So how do they work?"
- _Try it:_ A 2D toy: a cloud of random points steps back into a shape (a spiral, or the letters "LLM"), denoised by a tiny network trained in the browser with Ch 7's hand-written MLP. A slider moves through the denoising steps, and the visitor can retrain on a shape of their own.
- _Animation:_ Side by side, Ch 11's generation adds one token at a time from left to right, while diffusion refines the whole picture at once, a little at every step.
- _Key idea:_ Diffusion models learn to remove a little noise at a time. Starting from pure noise and repeating that many times produces a new image.

### Wrap-up

**Ch 35. Recap: the whole picture**

- One zoomable diagram that links each part back to its chapter, from bytes to the harness loop, with Part VIII's models shown as variations on the same pieces and Part VI's techniques shown as ways of shaping the context. A short quiz checks understanding.

---

## 4. Live LLM options

Use a tiered approach. The site always works, and visitors opt in to heavier features.

| Tier                                       | What it is                                                                                                                 | Cost / size                                                                                    | Gives us                                                                    | Used in                 |
| ------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------- | ----------------------- |
| **T0 — Recorded traces** (default)         | Pre-computed JSON of real model runs (top-k logprobs, attention, embeddings, tool-calling agent runs) for a set of prompts | ~KBs, instant                                                                                  | Accurate visuals from real models with zero setup                           | Every chapter           |
| **T1 — Tokenizer only**                    | `gpt-tokenizer` in the browser                                                                                             | ~1–2 MB                                                                                        | Live tokenization of any text                                               | Ch 4, 11, 14            |
| **T2 — Tiny in-browser model**             | Transformers.js: the canonical small model (**GPT-2 small**), plus `all-MiniLM-L6-v2` for embeddings                       | ~130 MB quantized GPT-2 (8-bit) or ~23 MB MiniLM, plus ~27 MB runtime, cached after first load | Real logits, attention, and embeddings for any prompt the visitor types     | Ch 0, 2, 5, 9, 11, 32   |
| **T3 — Larger in-browser chat model**      | WebLLM (WebGPU), e.g. a ~0.5–1.5B instruct model                                                                           | 0.5–1 GB, WebGPU required                                                                      | Base vs. instruct comparison, a chat that feels real, and live tool calling | Ch 13, 14, 22–25        |
| **T4 — Bring your own API key** (optional) | Visitor pastes their own key for a provider that returns logprobs                                                          | Visitor pays                                                                                   | Frontier-quality output with top logprobs and tool calling                  | Ch 2, 11, 12, 14, 22–25 |

**Rules**

- Every live widget has a T0 fallback with the same UI. The live model only replaces where the data comes from.
- Create one shared `ModelProvider` interface (`tokenize`, `nextTokenDistribution`, `attention?`, `embed?`, `generate`) with implementations for recorded traces, Transformers.js, WebLLM, and remote APIs.
- **Canonical small model:** GPT-2 small to start (best attention-visualization tooling). It is defined in one place, `models/canonical.json` (Hugging Face ID, tokenizer, layer and head counts, context length, display name), so switching to another model such as SmolLM2-135M is a config change plus re-running `build-traces.py`:
  - The T2 worker, the T0 trace builder, and widgets all read that file. No widget hard-codes a model name, vocabulary size, or layer/head count.
  - Traces are stored per model under `static/traces/<model-id>/`, so the old and new models' traces can sit side by side while switching.
  - Tokens shown with the canonical model (Ch 0, 2, 9, 11) use that model's own tokenizer, so token IDs always match the logits and attention.
- Before any download, show a **consent dialog with the download size**, check for WebGPU and fall back to WASM, run model inference in a **Web Worker**, and show a progress bar.
- Security for bring-your-own keys:
  - Keep the key in memory or `sessionStorage` only, never `localStorage`.
  - Call the provider directly from the browser and never send the key anywhere else.
  - Set a strict CSP `connect-src` allowlist. The CSP is emitted by SvelteKit (`csp` in `vite.config.ts`, hash mode, so its inline scripts are allowed without `'unsafe-inline'`), and `firebase.json` adds the header-only `frame-ancestors 'none'`.
  - Show a clear warning that this sends the visitor's prompt to the provider.
  - Never ship a key in the site.
- Harness demos (Part VII) only expose in-browser toy tools. Live models can call those tools but never get network, file system, or `eval` access, regardless of tier.
- Optional later step: a rate-limited serverless proxy for a hosted demo. This is outside the static scope, so treat it as a separate decision.

---

## 5. Visual and animation system

### Design direction

- **Feel:** warm and editorial, with the interactive figures as the main attraction. References: Bartosz Ciechanowski's explainers and Distill. Use a warm off-white page in light mode and a warm charcoal in dark mode (following `prefers-color-scheme`), generous white space, and almost no decoration. Concept colors appear only where their concept does, so they stay meaningful.
- **Kitchen theme in words and structure, not illustration:**
  - The site's name in prose, titles, and metadata is **LLM Kitchen**. `llm-kitchen` stays as the repo, package, and Firebase project name, and in storage keys.
  - A small mark (a simple pot or bowl shape in the concept colors) serves as the favicon and appears on the social sharing images.
  - Each chapter opens with an "Ingredients" box linking the earlier chapters it builds on.
  - The recap card is styled as a recipe card.
  - The landing page reads like a menu.
  - No food illustrations competing with the figures.
- **Layout:**
  - Text sits in a single ~68ch column. Widgets break out wider, up to ~1100px.
  - On desktop, scroll-driven animations sit in a sticky figure beside the text. On mobile they appear inline with Prev/Next buttons, and no interaction depends on hover.
- **Widget frame:** every widget uses the same `WidgetFrame`, with a "Try it" label, a reset button, step controls, and a `DataSourceBadge` showing **Recorded** or **Live · <model display name>**. The badge keeps it honest about which demos are real.
- **Typography:**
  - Serif for prose (Source Serif 4 or Literata), monospace for tokens and numbers (JetBrains Mono or IBM Plex Mono), and a plain system sans for buttons and labels.
  - Fonts are self-hosted variable fonts from `@fontsource-variable` (bundled by Vite with hashed names). Their `@font-face` rules use `unicode-range` subsets, so browsers only download the Latin files they need.
- **Charts:** thin lines with direct labels instead of legends, and no gridlines unless needed. Token chips have a thin outline and the token ID in small mono text underneath, and look the same in every chapter.

### Concept colors and shapes

- **Concept colors** (consistent across the site): text/tokens = amber, vectors/embeddings = teal, weights/neurons = violet, attention = pink, probabilities = blue, loss/error = red, harness/tools = slate. Slate rather than green avoids the red/green pair that color-blind visitors most often confuse, and a neutral color fits "the harness is ordinary code".
- **Never color alone:** each concept also has a shape, such as rounded chips for tokens, square cells for vectors, arcs for attention, bars for probabilities, and a dashed card outline for tool calls.
- Colors are defined in `tokens.css` with separate light and dark versions. Every text-on-color pair must pass WCAG AA contrast.

### Shared elements and motion

- **Shared visual elements**, built once and reused everywhere: `TokenChip`, `VectorStrip` (a row of colored cells), `ProbBars`, `SamplerWheel`, `AttentionLines`, `NeuronNode`, `LayerStack`, `LossCurve`, `ToolCallCard`, `ContextBudget`.
- **Transitions between representations** use shared-element morphs (Svelte `crossfade` with shared keys, plus `flip` for reordering): a `TokenChip` becomes a `VectorStrip`, which becomes a point in `EmbeddingMap`. These morphs carry the main teaching point.
- **Motion rules:**
  - 200–600 ms easing, one main motion at a time.
  - Every animation can be paused and stepped with ← and → and scrubbed by scrolling.
  - Reduced-motion mode shows the start and end states with a fade.

---

## 6. Site structure

```
llm-kitchen/
  vite.config.ts             # sveltekit() plugin options (SvelteKit 3 has no svelte.config.js): adapter-static, mdsvex, Vitest
  eslint.config.js           # flat config: typescript-eslint, eslint-plugin-svelte, eslint-config-prettier
  prettier.config.js         # Prettier config + prettier-plugin-svelte
  .prettierignore            # build/, .svelte-kit/, static/traces/, *.svx (no mdsvex parser; would mangle Svelte syntax)
  firebase.json              # hosting config: public dir = build/, security and caching headers, cleanUrls
  .firebaserc                # Firebase project alias
  .github/
    dependabot.yml           # npm and GitHub Actions updates
    workflows/
      ci.yml                      # format, lint, type check, unit tests, build, Playwright, ci-success
      firebase-hosting-pr.yml     # build, deploy a preview channel per PR
      firebase-hosting-merge.yml  # build, deploy to the live channel on merge to main
      links.yml                   # weekly external link check of references.json (opens an issue on failure)
  src/
    routes/
      +layout.svelte         # ChapterLayout shell, progress rail
      +layout.ts             # export const prerender = true
      +page.svelte           # landing / table of contents
      [chapter]/
        +page.ts             # load the matching .svx via import.meta.glob; entries() lists all slugs
        +page.svelte
    lib/
      chapters/              # 00-guessing-game.svx … 33-recap.svx
      components/
        primitives/          # TokenChip, VectorStrip, ProbBars, SamplerWheel, ...
        widgets/             # BigramBuilder, BPEStepper, EmbeddingMap, AttentionViewer, GlassBoxGenerator, TinyTrainer, PromptInspector, AgentStepper, ...
        layout/              # StepController, WidgetFrame, DataSourceBadge, IngredientsBox, RecapCard, ProgressNav, GlossaryPopover, Cite, Sources
      references.json        # bibliography: id, authors, title, year, venue, URL/DOI, accessed date
      site.ts                # site name ("LLM Kitchen") and origin, used for titles, canonical URLs, and Open Graph tags
      stores/                # progress.svelte.ts, motion-prefs.svelte.ts, model-tier.svelte.ts (rune-based shared state)
      models/                # ModelProvider + recorded/transformers/webllm/remote impls
      harness/               # toy agent loop, tool registry, in-browser toy tools
      workers/               # inference.worker.ts, trainer.worker.ts (imported with Vite `?worker`)
      math/                  # tiny tensor ops, softmax, sampling, PCA, hand-written MLP + backprop for Ch 7
    styles/tokens.css        # design tokens, concept colors (light + dark)
    styles/global.css        # base typography, .prose column, .breakout widths
  static/traces/<model-id>/  # pre-computed JSON traces (T0) per model, fetched on demand
  static/vectors/<model-id>/ # GPT-2 token/position embeddings and per-layer vectors (Ch 5, Ch 10)
  static/embeddings/         # MiniLM word map: 2D PCA positions, neighbors, PCA basis, full vectors (Ch 5)
  static/og/                 # 1200×630 social sharing images, one per page, generated at build time
  models/canonical.json      # canonical small model config, read by the site and build-traces.py
  scripts/
    build-traces.py          # generate T0 traces from real models offline (model from models/canonical.json)
    build-embeddings.py      # generate the Ch 5 embedding map with all-MiniLM-L6-v2
  tests/
```

- **Navigation:** a linear chapter flow with a progress rail. Progress is saved in `localStorage`, and a "skip ahead" glossary is available.
- **Glossary popovers:** the first use of each term links to its chapter.
- **Citations:** chapters cite with `<Cite id="..." />`, which renders a numbered footnote link. Each chapter ends with a `Sources` list generated from the ids it used. Entries live in `src/lib/references.json`. A unit test fails if a chapter uses an unknown id or if an entry is never cited.

### CI

`ci.yml` runs on every push to `main` and every pull request (including forks). Each check is an `npm run` script, so CI and local runs match:

| Script         | Command                                              | Fails when                                                                |
| -------------- | ---------------------------------------------------- | ------------------------------------------------------------------------- |
| `format:check` | `prettier --check .`                                 | Any file isn't Prettier-formatted (`npm run format` fixes it).            |
| `lint`         | `eslint .`                                           | Any lint error.                                                           |
| `check`        | `svelte-kit sync && svelte-check --fail-on-warnings` | Type errors or Svelte warnings (including a11y warnings).                 |
| `test`         | `vitest run`                                         | Any unit test fails.                                                      |
| `build`        | `vite build`                                         | Prerendering fails, e.g. a broken internal link or a chapter that throws. |
| `test:e2e`     | `playwright test` (Chromium) against `vite preview`  | A widget smoke test or visual snapshot fails.                             |

- Format, lint, type check, and unit tests run as one fast job. Build and Playwright run in a second job that uploads the Playwright report as an artifact on failure.
- A final `ci-success` job `needs` every other CI job and runs with `if: always()`. It fails if any needed job's result is `failure`, `cancelled`, or `skipped`, and passes only when all of them succeeded.
- Node version comes from `.nvmrc`. Dependencies install with `npm ci` and the npm cache. Playwright browsers are cached by version.
- Workflows use `permissions: contents: read` by default, pin third-party actions to full versions, and cancel superseded runs on the same branch with `concurrency`.
- `main` is branch-protected with `ci-success` as the only required status check, so adding, renaming, or splitting CI jobs doesn't require updating branch protection. New jobs must be added to its `needs` list.

### Deployment

- **Live:** every merge to `main` that passes CI builds the static site and deploys it to the Firebase Hosting live channel from the `production` GitHub environment, which only the default branch can use.
- **PR previews:** every pull request deploys to its own preview channel (e.g. `pr-42`). The action comments the preview URL on the PR and updates it on each push. Channels expire after 7 days. The preview job uses a separate `preview` environment that allows non-default branches.
- **Auth:** no service account keys or `FIREBASE_TOKEN`. Each deploy job has `id-token: write` and runs `abraham/firebase-wif` (pinned to a full version, updated by Dependabot), which exchanges the job's GitHub OIDC token for short-lived Google credentials. Its `credentials_json` and `project_id` outputs feed `FirebaseExtended/action-hosting-deploy`.
- **Setup:** `npx @abraham/firebase-wif setup` creates the workload identity pool and provider (trusting only this repo), a Hosting-only deploy service account, the `FIREBASE_WIF_PROVIDER` / `FIREBASE_WIF_SERVICE_ACCOUNT` repo variables, and the `production` environment. Run it again with `--environment preview --any-branch` for PR previews. `npx @abraham/firebase-wif status` checks the setup.
- **Fork PRs:** they can't get OIDC tokens, so the deploy step is guarded with `if: github.event.pull_request.head.repo.full_name == github.repository`. Fork PRs only build and test; a maintainer can push the branch to the repo if a preview is needed.
- **Caching:** hashed assets under `_app/immutable/` get `Cache-Control: public, max-age=31536000, immutable`. HTML and `static/traces/` JSON get short cache times so updates show up.

---

## 7. Milestones

Each chapter milestone (5–10, 14, 15, 18, and 20) includes the [per-chapter fact-check](#per-chapter-fact-check-part-of-every-chapter-milestone-510-14-15-18-and-20) for its chapters. Milestone 12 is a final review of those facts across the whole site.

1. **Foundation: scaffold and CI**
   - SvelteKit + adapter-static + mdsvex scaffold with the `[chapter]` route and one placeholder `.svx` chapter.
   - Prettier, ESLint, `svelte-check`, Vitest, and Playwright set up with `npm run` scripts.
   - `ci.yml` with `ci-success`, Dependabot, `.nvmrc`, and branch protection on `main`.
   - _Done when:_ the placeholder chapter prerenders and a PR shows a green `ci-success`.
2. **Foundation: deploys**
   - Firebase Hosting project, `.firebaserc`, and `firebase.json` (CSP, caching headers, `cleanUrls`).
   - Workload Identity Federation via `npx @abraham/firebase-wif setup` (`production` and `preview` environments).
   - `firebase-hosting-pr.yml` and `firebase-hosting-merge.yml`.
   - _Done when:_ a PR gets a working preview URL comment, and merging to `main` updates the live site.
3. **Foundation: design system**
   - `tokens.css` with light/dark themes and concept colors (contrast-checked), self-hosted subset fonts.
   - Chapter shell: `ChapterLayout`, `ProgressNav`, `IngredientsBox`, `RecapCard`, `GlossaryPopover`.
   - `WidgetFrame` and `DataSourceBadge`.
   - _Done when:_ the placeholder chapter uses the full chapter shell in both themes and passes an axe check.
4. **Foundation: interaction and data core**
   - `StepController` (scroll, Prev/Next buttons, ← and → keys) and reduced-motion support (`prefersReducedMotion` from `svelte/motion`).
   - Primitives: `TokenChip`, `ProbBars`, `SamplerWheel`.
   - `ModelProvider` interface, the recorded-trace (T0) provider, and `models/canonical.json`.
   - _Done when:_ a demo widget steps through a hand-written sample trace using all three primitives, with and without reduced motion.
5. **Part I (Ch 0–3)**
   - Bigram builder, temperature/top-k widget.
   - T0 traces pipeline (`build-traces.py`).
6. **Part II (Ch 4–5)**
   - BPE stepper, live tokenizer (T1), embedding map.
   - First T2 integration (embeddings in a worker).
7. **Part III (Ch 6–7)**
   - Neuron playground, gradient descent visual, in-browser tiny trainer (hand-written forward pass, backprop, and optimizer in `math/`, running in `trainer.worker.ts`; no TF.js).
8. **Part IV (Ch 8–10)**
   - Attention viewer (T0 recorded GPT-2 attention), transformer block assembly, residual stream with a logit lens.
9. **Part V (Ch 11–14)**
   - Glass-box generator (the main demo, T0 with recorded branches, plus live GPT-2 via T2), scale explorer and scaling-law chart, base vs. instruct (T0 recordings of Qwen2.5-0.5B base and instruct), quirks lab (the glass-box generator with recorded quirk prompts).
   - T3 (WebLLM) and T4 (bring your own key) were not built in this milestone; see Future improvements.
10. **Part VI (Ch 15–20)**
    - Prompt inspector, toy tools and tool registry, agent stepper (T0 traces of agent runs), context budget with retrieval, prompt injection demo, recap.
    - Live tool calling via T3/T4 is deferred with those tiers (see Future improvements).
11. **Polish**
    - Accessibility audit, performance budget (<150 KB JS on text-only pages), Playwright visual tests, mobile layouts, custom domain on Firebase Hosting.
    - v1: axe on every page in light and dark, a phone-width overflow check, and the JS budget (gzipped) run in CI (`tests/e2e/quality.e2e.ts`). Screenshot tests run locally only (`npm run test:visual`), since baselines differ by OS. Lighthouse (local, simulated mobile): performance 95–96, accessibility/best practices/SEO 100 on sampled chapters. The custom domain, https://llm.kitchen, was set up by hand in the Firebase console.
12. **Final fact review**
    - Re-check every chapter's claim checklist (from the per-chapter fact-check below) against the finished site. Confirm that the claims are consistent across chapters, e.g. the same GPT-2 numbers everywhere and no chapter contradicting an earlier simplification.
    - Re-verify time-sensitive facts, such as Ch 12's frontier-model figures and the providers' tool-calling behavior. Update the sources and "accessed" dates.
    - **Expert review:** someone with ML background reads each Part end to end for errors and misleading simplifications. Findings are fixed or logged as issues before launch.
    - Run the link check and fix or replace any dead sources.
    - _Done when:_ every claim checklist has been re-checked, the citation unit test and link check pass, and expert review has no open findings.
    - v1 status: see [docs/fact-check/README.md](fact-check/README.md). Everything except the expert review is done; the expert review needs a human reviewer.
13. **Cleanup**
    - Placeholder for miscellaneous fixes and polish found while reviewing v1 (wording, visuals, widget improvements).
14. **Part VII (Ch 20–25)**
    - Encoder fill-in-the-blank and attention-mask toggle, mixture-of-experts router, tiny recurrent model with a memory-use chart, image patches and an image–caption map, 2D diffusion toy, and a thinking on/off viewer.
    - New recording scripts in `scripts/` for the encoder, CLIP-style embeddings, and reasoning runs (and MoE routing, if practical), with their outputs under `static/`.
    - Move the recap to the end: rename `20-recap.svx` to `26-recap.svx` (the `recap` slug and URL stay the same), add Part VII to `PARTS` and the curriculum in `src/lib/chapters/meta.ts`, and add Part VII to the recap diagram and quiz. Update any "Ch 20" cross-references.
    - _Done when:_ every Part VII chapter has its widget, recap card, sources, and `docs/fact-check/part-7.md`, and the recap covers all seven Parts.
    - v1: all six chapters and the recap move are done; see [docs/fact-check/part-7.md](fact-check/part-7.md) for changes from this plan (recorded-only Ch 20 and 23, a toy router in Ch 21, simple drawn pictures in Ch 23, and ring/square/blob shapes in Ch 24).
15. **Part VIII (Ch 26–30)**
    - Prompt-variant explorer on GPT-2's next-token bars (T0 plus live T2), few-shot chart with attention to the examples, system-prompt comparison in the Ch 15 prompt inspector, step-by-step and output-format tally, and a prompt-sensitivity lab (example order, formatting, position in a long context).
    - A recording script in `scripts/` for the prompt variants, reusing GPT-2 small and the Qwen2.5 instruct models already downloaded, with outputs under `static/`.
    - Move the recap to the end again: rename `26-recap.svx` to `31-recap.svx` (the `recap` slug and URL stay the same), add Part VIII to `PARTS` and the curriculum in `src/lib/chapters/meta.ts`, point Ch 25's next question at Ch 26, and add Part VIII to the recap diagram and quiz.
    - _Done when:_ every Part VIII chapter has its widget, recap card, sources, and `docs/fact-check/part-8.md`, and the recap covers all eight Parts.
    - v1: all five chapters and the recap move are done; see [docs/fact-check/part-8.md](fact-check/part-8.md) for changes from this plan (the system-prompt comparison has its own template view rather than the Ch 15 prompt inspector, and the Ch 29 replies are graded by hand).
16. **Branding**
    - **Name:** the site is called **LLM Kitchen** everywhere a person reads it: page titles, the menu heading, the chapter header link, meta descriptions, and the README. Code identifiers, the repo, the Firebase project, and the `llm-kitchen:visited` storage key keep `llm-kitchen`, so visitors' saved progress survives.
    - **Favicon:** replace the default Svelte logo with the LLM Kitchen mark: an SVG favicon that reads at 16 px and adapts to dark mode (`prefers-color-scheme` inside the SVG), a 180 px `apple-touch-icon` PNG, and a `theme-color` per color scheme.
    - **Open Graph metadata:** every page gets `og:title`, `og:description`, `og:type` (`website` for the menu, `article` for chapters), `og:url`, `og:image` (with width, height, and alt text), `og:site_name` ("LLM Kitchen"), and `twitter:card` (`summary_large_image`), plus a `<link rel="canonical">`. Absolute URLs come from one site origin set in config (`src/lib/site.ts`), defaulting to the Firebase domain until the custom domain is live. Chapter titles and descriptions come from `meta.ts`, so no chapter writes its own tags.
    - **Social sharing images:** a 1200 × 630 PNG per page (the menu and each chapter), with the mark, "LLM Kitchen", the chapter number and title, and its Part, in the site's fonts and colors. Generated at build time from one SVG template by a script (no screenshots and no network), written under `static/og/`, and covered by the existing caching headers.
    - **Tests:** a unit test checks that every curriculum entry has a social image and a description of reasonable length; an e2e test checks that the menu and a chapter render the full set of tags with absolute URLs; the favicon and images are spot-checked visually.
    - _Done when:_ no visible "llm-kitchen" remains, the new favicon shows in light and dark browser tabs, and sharing any page's URL produces a card with the right title, description, and image (checked with a link preview validator on the PR preview).
    - v1: done. The mark is a bowl holding three ingredients in the token, vector, and attention colors. `scripts/build-og.ts` runs as the first step of `npm run build` (resvg, with the fontsource WOFF2 files unpacked to TrueType); its output is git-ignored. resvg ignores the variable font's weight axis, so headings are thickened with a matching stroke. Tag values and images point at `SITE_ORIGIN` (https://llm.kitchen), so on a PR preview the card's text is checkable but its image only resolves once the change is live.
17. **Cleanup**
    - Placeholder for miscellaneous fixes and polish found while reviewing v1 (wording, visuals, widget improvements).
18. **Caching and prompt injection (Ch 19–20)**
    - **Renumber first, in its own commit:** the two new chapters go into Part VI after Managing the context, so everything after it moves up by two: `19-trust-and-guardrails.svx` becomes `21-…`, Part VII becomes Ch 22–27, Part VIII becomes Ch 28–32, and the recap becomes `33-recap.svx`. Slugs and URLs don't change, so links and visitors' saved progress survive. Update `meta.ts` (order and `buildsOn` numbers) and every "Ch N" cross-reference in chapter prose, widgets, data comments, tests, and `docs/fact-check/`, using a script for the mapping and a manual review of each change (not every number after "Ch" is a cross-reference). All tests pass before the new chapters are added.
    - **Ch 19:** KV-cache stepper (work counts computed from GPT-2 small's config, plus live timing via T2 if Transformers.js exposes the cache switch) and a prompt-cache view over the recorded Part VI agent calls with visitor edits.
    - **Ch 20:** prompt-injection lab: an attack × defense grid of recorded Qwen2.5-1.5B-Instruct runs, shown in the Ch 15 prompt inspector, with a tally graded by code. A recording script in `scripts/` (reusing the downloaded model), with outputs under `static/injection/`.
    - **Links between chapters:** Ch 18's next question leads into caching; Ch 21 builds on Ch 20 for the mechanism and keeps its agent demo for the guardrails; Ch 24's memory chart names the KV cache; Ch 32 points at Ch 20. Add both chapters to the recap diagram and quiz.
    - **Fact-check:** add both chapters' claims to `docs/fact-check/part-6.md`, with the Part VI sources above. Provider caching rules change often, so they are cited with accessed dates and re-checked in the final fact review.
    - _Done when:_ both chapters have their widgets, recap cards, sources, and fact-check entries; every chapter number in the prose, tests, and docs matches the new curriculum; and the old chapter URLs still load the same chapters.
    - v1: done. The renumbering is its own commit, with a new test that each glossary term's chapter mentions it. Ch 19's KV-cache timing is measured offline on a laptop CPU by `scripts/build-caching.py` (no live timing yet), and its prompt-cache view is computed from the Ch 18 session. Ch 20's attacks try to slip a false claim into the summary (45 of 72 attacked runs succeeded; the best defense still let 6 of 12 through), recorded by `scripts/build-injection.py`. See [docs/fact-check/part-6.md](fact-check/part-6.md) for changes from this plan.
19. **Curriculum order**
    - Move the site to the order in [docs/CURRICULUM.md](CURRICULUM.md): Text is just numbers joins Representation (Ch 3), Thinking before answering joins Part V (Ch 15), Prompt engineering becomes Part VI (Ch 16–20), Harnesses Part VII (Ch 21–27), and Other kinds of models Part VIII (Ch 28–32). Slugs and URLs don't change.
    - **Renumber first, in its own commit,** following CURRICULUM.md's "Changing the organization": reorder `PARTS` and the rows in `meta.ts` with the new `buildsOn` lists, rename the chapter files (through temporary names, since the mapping isn't a simple shift), and remap every "Ch N" reference from the mapping table with a script and a review of each change. Tests and fact-check files named by Part follow their chapters: the reasoning claims move to `part-5`, Text is just numbers to `part-2`, and the Part VI, VII, and VIII files swap to match the new Parts.
    - **Then the content changes** CURRICULUM.md lists: the new openings for Ch 3 and Ch 15, the system prompt introduced in Ch 18, structured output in Ch 19 leading into tools in Ch 22, Ch 20's forward-looking Next question, the Next questions at every new Part boundary, and the recap's paragraph, diagram, and quiz in the new order.
    - **Keep the spec and the code in step:** a unit test checks that the Parts, numbers, titles, slugs, and builds-on lists in `meta.ts` match CURRICULUM.md's tables. Reorder §3 of this plan to match, and update CURRICULUM.md's Status.
    - _Done when:_ the site reads in the new order, every chapter's Next question is answered by the chapter after it, every chapter number in prose, tests, and docs matches the new curriculum, the old URLs still load the same chapters, and the spec test passes.
    - v1: done. The renumbering is its own commit; §3 of this plan now follows the new order. Besides the listed content changes, forward references that the move created (in Ch 11, 14, 22, and 25) were reworded, the system prompt's glossary entry now points at Ch 18, reasoning models sit with the model in the recap diagram, and the quiz follows the new order. The fact-check, unit, and e2e files named by Part moved with their chapters.
20. **End to end, and the quiz in its own chapter**
    - **Organization first:** add two chapters to the Wrap-up in [docs/CURRICULUM.md](CURRICULUM.md), after the recap: Ch 34 _From message to reply_ (`end-to-end`) and Ch 35 _Check yourself_ (`quiz`). Both are new, so no existing chapter is renumbered. Update `meta.ts` (rows and descriptions) to match; the spec test keeps them in step.
    - **Ch 34, From message to reply:** one box diagram of the whole process, in the order it runs, for a single message. The recap's diagram (Ch 33) shows what the pieces _are_; this one shows the order they run in.
      - **Stages, each a box linked to its chapter:** you type a message (Ch 21); the harness builds the prompt from the system prompt, tool definitions, earlier turns, and the chat template (Ch 13, 18, 21); the provider reuses the cached start of the prompt (Ch 25); the tokenizer turns text into token IDs (Ch 3, 4); each token becomes a vector plus its position (Ch 5); the stack of transformer blocks refines the vectors with attention and MLPs (Ch 6, 8–10); the last vector becomes a probability for every token (Ch 1, 2); one token is picked (Ch 2); it is appended and the model runs again, reusing the KV cache, until an end-of-turn token (Ch 11, 25), with a reasoning model's scratch work as part of this loop (Ch 15); the harness reads the reply and, if it is a tool call, checks it against its guardrails (Ch 27), runs it, adds the result, and calls the model again (Ch 22, 23); when the conversation grows too long, the harness trims, summarizes, or retrieves (Ch 24); the reply is shown to you.
      - **Loops drawn as loops:** the token loop sits inside the model call, and the agent loop sits around it, as in Ch 23. Text from tool results is colored as untrusted where it enters the prompt (Ch 26).
      - **A running example:** the recorded Ch 21 conversation ("Finish this: The cat sat on the", one `search_rhymes` call, then the answer), so every box shows the real input and output at that stage. Stages inside the model, where Qwen's internals weren't recorded, show GPT-2 small's recorded run on the same words, labeled as such.
      - **Interaction:** step through the stages (StepController, keyboard, reduced motion) or jump to any box; each box's caption says what happens and links back. On phones the diagram stacks vertically, with the loops as labeled return arrows.
      - **Other kinds of models** get one closing box: each swaps one stage (the attention mask, the MLP, what counts as a token, or the generation loop) and links to Ch 28–32.
    - **Ch 35, Check yourself:** the quiz moves out of the recap into its own chapter, extended so every Part I–VIII has at least one question. Each explanation links to its chapter, and the score lists the chapters to revisit for the questions missed.
    - **Recap (Ch 33):** drops the quiz and keeps the paragraph and the zoomable diagram. Its Next question leads into Ch 34, and Ch 34's leads into Ch 35.
    - **Tests:** a unit test that every Part I–VII is linked from at least one stage of Ch 34 and every Part I–VIII from at least one quiz question; e2e tests that step through Ch 34, follow a box's link, and complete the quiz on its new page; axe and phone-width checks for both pages.
    - **Fact-check:** Ch 34 states nothing new, so its claims are checked against the chapters it links (the same numbers and the same order of operations); add both chapters to `docs/fact-check/part-8.md` with the recap.
    - _Done when:_ Ch 34 walks one message through every stage with real data and links, Ch 35 holds the quiz with every Part covered, the recap no longer has a quiz, and CURRICULUM.md, `meta.ts`, and the spec test agree.
    - v1: done. Stage and quiz data live in `src/lib/data/end-to-end.ts` and `quiz.ts` so the unit test can check Part coverage. Ch 34's diagram shows each loop as a framed group with a labeled return line on every screen size; the in-model stages also link Ch 10 for GPT-2's position vectors, and the prompt stage links Ch 16. The quiz gained a temperature question (Ch 2) and a training question (Ch 7), for 12 in reading order. See [docs/fact-check/part-8.md](fact-check/part-8.md).
21. **Quantization and speculative decoding**
    - **Why:** model pages are full of names like `gemma-4-26B-A4B-it` and `gemma-4-E2B-it-qat-mobile-transformers` (see Google's [Gemma 4](https://huggingface.co/collections/google/gemma-4) and [Gemma 4 QAT Mobile](https://huggingface.co/collections/google/gemma-4-qat-mobile) collections). Most parts of those names are already taught (size, tuning, experts, pictures, diffusion), but two big ideas behind them are not: storing weights in fewer bits (`qat`, `Q4_0`, `w4a16`) and a small model drafting tokens for a big one (`-assistant`). Both become chapters in the main curriculum; milestone 22 then reads whole names.
    - **Organization first, following CURRICULUM.md's "Changing the organization":**
      - **Part V gains two chapters after Scale,** since both are about running a big model on real hardware: Ch 13 _Fewer bits per number_ (`quantization`, builds on 3, 12) and Ch 14 _Guessing ahead_ (`speculative-decoding`, builds on 2, 11, 12). Part V becomes Ch 11–17 (seven chapters, the most a Part may have), and its question widens to "How does the whole model write, run, and become an assistant?"
      - **The new numbers:** old Ch 13–35 move up by two: Part VI becomes Ch 18–22, Part VII Ch 23–29, Part VIII Ch 30–34, and the Wrap-up Ch 35–37 (recap, From message to reply, and the quiz). Slugs and URLs don't change. Record the old-to-new table in CURRICULUM.md like the milestone 18 mapping.
      - **Renumber in its own commit,** with a script from that table and a review of each change (prose, widgets, data comments, the glossary, the recap diagram and quiz, the end-to-end stage data, tests, and `docs/fact-check/`), all tests passing, before any new content. Historical notes in this plan keep their old numbers.
    - **Ch 13, Fewer bits per number (quantization):**
      - _Hook:_ "GPT-2 small has 124 million numbers. How much space does each one need?"
      - _Try it:_ round GPT-2 small's weights to 16, 8, 4, and 2 bits and watch the file size shrink and the next-token guesses for "The cat sat on the" hold, then drift, then break, next to the full-precision run from Ch 0. A `VectorStrip` shows one row of weights before and after rounding, with the grid of allowed values drawn in.
      - _Key idea:_ a weight is a number stored in some number of bits (bytes from Ch 3). Fewer bits means coarser rounding: memory falls by up to four times from 16 to 4 bits, and quality holds until the rounding gets too coarse. Quantization-aware training trains with the rounding in place, so a 4-bit model stays closer to the original.
      - _Memory rule of thumb:_ parameters × bits ÷ 8 bytes (124M at 16 bits ≈ 250 MB; a 31B model ≈ 62 GB at 16 bits, ≈ 16 GB at 4 bits), linked from Ch 12's scale chart.
      - _Data:_ recorded (T0) by `scripts/build-quantize.py` (round-to-nearest per row, no QAT), outputs under `static/quantize/`. _Live option:_ the site's live GPT-2 already runs an 8-bit ONNX export (`models/canonical.json`), so the chapter can point out that the live demos have used a quantized model all along, and compare it with the recorded full-precision run.
    - **Ch 14, Guessing ahead (speculative decoding):**
      - _Hook:_ "A big model writes one token per pass. Could a small model guess the easy ones?"
      - _Try it:_ step through a recorded run where a small drafter proposes several tokens and the big model checks them all in one pass, keeping the guesses it agrees with and replacing the first one it doesn't. A counter compares big-model passes with and without the drafter, and the final text matches the big model's own greedy output exactly.
      - _Key idea:_ in one pass, a transformer gives a next-token prediction at every position, not just the last (the same reason training is fast). That lets the big model verify many drafted tokens at the price of one pass. With sampling, an accept-or-resample rule keeps the output's probabilities exactly the big model's. Simplified: real systems also tune how far ahead to guess.
      - _Data:_ recorded (T0) by `scripts/build-speculative.py`: a small and a larger GPT-2 that share a tokenizer (e.g. DistilGPT-2 drafting for GPT-2 medium), greedy, on a few prompts that include easy and hard stretches, with accepted counts per step. Mention multi-token prediction drafters such as Gemma 4's `-assistant` models (78M–0.5B, up to about 3× faster per the model cards).
    - **Links between chapters:** Ch 12's Next question leads into Ch 13, Ch 13's into Ch 14, and Ch 14's carries Ch 12's old question ("a bigger base model is still just continuing text…") into From predictor to assistant. Ch 27 (caching) refers back to Ch 14 for one-pass checking. Ch 36's diagram notes at the token loop that a drafter can propose several tokens per big-model pass. Add both chapters to the recap paragraph and diagram, a quiz question for each, and glossary entries for quantization, quantization-aware training, and speculative decoding.
    - **Plan and spec:** add Ch 13 and Ch 14 to §3 of this plan under Part V, update CURRICULUM.md's tables, Part V question, mapping, and Status, and keep `meta.ts` and the spec test in step.
    - **Tests:** unit tests that the recorded quantization and speculative runs say what the prose says (file sizes, the bit width where the top guess changes, accepted counts, and the drafted output equal to the big model's greedy output), and that the quiz still covers every Part. E2e tests that step through Ch 13 and Ch 14; axe and phone-width checks for both pages.
    - **Fact-check:** both chapters go into `docs/fact-check/part-5.md` (with `tests/unit/part-5-facts.test.ts` and `tests/e2e/part-5.e2e.ts`). Add to Part V's core sources: Jacob et al. 2018 (quantization and quantization-aware training), Dettmers et al. 2022 (8-bit inference for large models), and Leviathan et al. 2023 and Chen et al. 2023 (speculative decoding). Gemma 4 drafter figures cite the model cards with accessed dates.
    - _Done when:_ quantization and speculative decoding are Ch 13 and Ch 14 with recorded demos, recap cards, sources, and fact-check entries; every chapter number in prose, tests, and docs matches the new curriculum and old URLs load the same chapters; and CURRICULUM.md, `meta.ts`, and the spec test agree.
22. **Picking a model: what the name tells you**
    - **Organization first:** add Ch 37 _Picking a model_ (`picking-a-model`) to the Wrap-up after From message to reply, building on Ch 12, 13, 14, 15, 27, 31, and 33 (Scale, Quantization, Speculative decoding, From predictor to assistant, Caching, Many experts, and Seeing pictures). The quiz moves from Ch 37 to Ch 38 (`37-quiz.svx` becomes `38-quiz.svx`; `/quiz` doesn't change); do that rename and the "Ch 37" remap in their own commit, with all tests passing. Update CURRICULUM.md and `meta.ts` to match.
    - **Ch 37, Picking a model:** reads whole model names with everything taught so far, using the Gemma 4 collections linked in milestone 21.
      - **Name decoder (main widget):** pick a real model ID, and each part of the name lights up with its meaning and a link to the chapter behind it:
        - **Family and generation** (`gemma-4`, `Qwen2.5`): who made it and which release; compare within a generation.
        - **Size** (`31B`, `12B`, `1.5B`): billions of parameters (Ch 12).
        - **Effective size** (`E2B`, `E4B`): per-layer embedding tables hold 5.1B numbers in E2B but are only looked up, like the token table in Ch 5, so each token costs about as much as a 2.3B model.
        - **Active size** (`26B-A4B`): a mixture of experts (Ch 31) with 25.2B parameters, about 3.8B of which (8 of 128 experts plus a shared one) run per token. All of it must fit in memory, but it runs nearly as fast as a 4B model.
        - **Tuning** (`-it`, `-Instruct`, or nothing): instruction-tuned, or the base model that only continues documents (Ch 15).
        - **Drafter** (`-assistant`): a drafter for speculative decoding (Ch 14).
        - **Quantization** (`-qat`, `Q4_0`, `w4a16`, `wNa8o8`): bits for weights and activations, and whether the model was trained for it (Ch 13).
        - **Target and file format** (`-mobile`, `-transformers`, `-ct`, `.gguf`): the hardware and software it is packaged for (phones, Hugging Face Transformers, vLLM's compressed tensors, llama.cpp). Same model, different packaging.
        - **A different kind of model** (`diffusiongemma`): generates by refining noise (Ch 34).
        - **Not in the name:** context length (128K tokens for E2B and E4B, 256K for the larger ones), inputs (audio only on E2B, E4B, and 12B), a thinking mode (Ch 17), and the license, all on the model card. The parameter count Hugging Face shows counts stored tensors, so it can differ from the name (E2B shows 5B; its QAT versions show 2B and 6B).
      - **Will it fit? (memory calculator):** pick a model and a precision and see the weights' memory next to a phone, a laptop, and a 24 GB graphics card, using Ch 13's rule. A context-length slider adds the KV cache (Ch 27), computed from each model's published config (layers, key-value heads, and head size). Labeled as simplified: real runtimes add some overhead.
      - **How to choose:** a closing checklist: the task (chat, tools, or fine-tuning), the inputs, the device's memory, the speed needed (active parameters, drafters), the context length, and the license. Benchmarks narrow the list; testing on your own prompts decides it (Ch 22).
    - **Links between chapters:** Ch 36's Next question leads into Ch 37, and Ch 37's into the quiz.
    - **Tests:** a unit test that the name parser splits every listed ID into the expected parts, each with an explanation and a chapter link where one exists; a unit test that the calculator matches the model cards (e.g. 30.7B at 16 bits ≈ 61 GB, at 4 bits ≈ 15 GB); an e2e test that decodes a name, follows a part's link, and changes the calculator's precision; axe and phone-width checks for the page.
    - **Fact-check:** add Ch 37 to `docs/fact-check/part-8.md` with the rest of the Wrap-up. Model-card numbers cite the Gemma 4 model cards and technical report (arXiv 2607.02770) with accessed dates; lineups and suffixes change often, so the decoder's list is dated and re-checked in the final fact review. Also cite the Gemma 4 QAT announcement and the GGUF format docs.
    - _Done when:_ Ch 37 decodes every part of the listed Gemma 4 names with links back to the chapters, the calculator shows real numbers, the quiz is Ch 38 at the same URL, and CURRICULUM.md, `meta.ts`, and the spec test agree.

### Per-chapter fact-check (part of every chapter milestone, 5–10, 14, 15, 18, and 20)

A chapter isn't done until its fact-check is done in the same PR:

- **Claim checklist:** `docs/fact-check/part-N.md` lists every factual claim and number in the Part's chapters (link it from the PR description). Each one is either backed by a `<Cite>` to a primary source, checked by a test, or rewritten as a labeled simplification ("Simplified: real models also…").
- **Numbers from the source:** model facts (GPT-2 small's layers, heads, vocabulary size, context length) come from `models/canonical.json` and the model's own config, with `build-traces.py` asserting they match. Any other figure cites the paper or model card it came from.
- **Demos match the prose:** Vitest checks that the widgets produce the numbers the text describes (e.g. the bigram counts, the BPE merges, the tokenizer split of "strawberry"). Recorded traces are spot-checked against a fresh run of the model.
- **Sources list:** the chapter ends with its `Sources` list, and the citation unit test passes.
- **Core sources each Part must cite** (at minimum):
  - Part II: Sennrich et al. 2016 (BPE) and Mikolov et al. 2013 (word vectors and analogies).
  - Part III: Rumelhart et al. 1986 (backpropagation).
  - Part IV: Levesque et al. 2012 (Winograd Schema Challenge, for the trophy/suitcase example) and Vaswani et al. 2017 (attention and transformers).
  - Part V: Radford et al. 2019 (GPT-2), Kaplan et al. 2020 and Hoffmann et al. 2022 (scaling laws), and Ouyang et al. 2022 (instruction and preference tuning).
  - Part VI: Schick et al. 2023 (Toolformer), Yao et al. 2023 (ReAct), Lewis et al. 2020 (RAG), Pope et al. 2022 (KV caching in transformer inference), the providers' prompt caching docs, Perez and Ribeiro 2022 and Greshake et al. 2023 (prompt injection), and Hines et al. 2024 (spotlighting) and Wallace et al. 2024 (instruction hierarchy) for the defenses.
  - Part VII: Devlin et al. 2019 (BERT), Shazeer et al. 2017 and Jiang et al. 2024 (mixture of experts, Mixtral), Hochreiter and Schmidhuber 1997 (LSTM) and Gu and Dao 2023 (Mamba), Dosovitskiy et al. 2021 (ViT) and Radford et al. 2021 (CLIP), Ho et al. 2020 (diffusion), and Wei et al. 2022 (chain of thought) and DeepSeek-AI 2025 (DeepSeek-R1).
  - Part VIII: Brown et al. 2020 (GPT-3, few-shot prompting), Olsson et al. 2022 (induction heads and in-context learning), Kojima et al. 2022 ("Let's think step by step"), Wei et al. 2022 (chain of thought), Lu et al. 2022 (example order), Sclar et al. 2024 (sensitivity to prompt formatting), and Liu et al. 2024 ("Lost in the Middle").

---

## 8. Success criteria

- A visitor with no ML background can explain "next-token prediction, tokens, embeddings, attention, sampling" and how a harness turns a model into an agent after finishing, including why repeated calls with the same opening are cheaper and why text the model reads can hijack it, and can say how encoders, mixture-of-experts, recurrent, vision, diffusion, and reasoning models differ from it, and can explain why common prompting techniques work in terms of context and next-token probabilities.
- Every chapter works fully offline with recorded traces. Live model features are opt-in only.
- Lighthouse scores ≥ 95 for performance and accessibility on chapter pages that have no live model.
- All animations can be stepped through and respect reduced motion.
- Every chapter passed its per-chapter fact-check and the final fact review: factual claims are cited or labeled as simplifications, and expert review has no open findings.

---

## 9. Open questions

- None right now.

---

## 10. Future improvements

- **Math sidebar:** a short, optional per-chapter panel with the equations behind each concept, for visitors who want them. Out of scope for v1.
- **Localization:** v1 is English-only (prose, example corpora, and recorded traces). Translating later means deciding whether to also swap the example corpora and re-record traces per language.
- **Live attention (Ch 9):** the standard GPT-2 ONNX export used by Transformers.js has no attention outputs, so v1 shows attention recorded from PyTorch for 5 sentences. A custom ONNX export with attention outputs would let visitors type their own sentence.
- **T3 and T4 tiers:** a WebLLM chat model (live base vs. instruct in Ch 13, live tool calling in Part VII) and bring-your-own-key providers. v1 covers these chapters with recorded runs (T0) and the live GPT-2 (T2). Both need a WebGPU or provider test setup that the CI and local headless browsers don't have.
- **Live Part VIII models (T2):** a small fill-mask encoder for Ch 28 and CLIP's text half for Ch 31, so visitors can try their own sentences and captions. v1 uses recordings.
