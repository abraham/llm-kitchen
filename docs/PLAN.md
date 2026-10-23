# llm-kitchen — Plan

A static site that teaches how a large language model works. It starts with "guess the next word", builds up to a full transformer generating text, and ends with the harness that turns that text generator into an assistant or agent. Each chapter adds one idea, uses one main animation to reinforce it, and includes an optional live model demo where that helps.

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

Every chapter has the same structure:
**Hook question → Try-it widget → Explanation and main animation → Live LLM option (if useful) → Recap card → Sources → The question that leads to the next chapter.**

### Part I — Prediction

**Ch 0. The guessing game**

- _Hook:_ "Finish this sentence: The cat sat on the ___"
- _Try it:_ The visitor types a guess and sees where it falls in GPT-2's recorded top 50 (rank and probability). No made-up "other people's guesses": there is no real survey data to show.
- _Animation:_ Many possible next words fan out from the blank, each with a bar showing how likely it is.
- _Key idea:_ An LLM is a machine that predicts the next piece of text, over and over.
- _Live option:_ The model completes the same prompt and shows its top 5 guesses with probabilities.

**Ch 1. Text is just numbers**

- _Try it:_ Type text and see each character turn into its code number (bytes and Unicode).
- _Animation:_ Letters flip like a split-flap display and land on their numbers.
- _Key idea:_ Computers only work with numbers, so the first step is turning text into numbers.

**Ch 2. Predicting by counting**

- _Try it:_ Build a **bigram model** from a tiny text (nursery rhymes). Then click "generate" and watch it produce gibberish that still looks a bit like the source.
- _Animation:_ A count table fills in cell by cell as a cursor moves through the text. The table then turns into probability bars.
- _Key idea:_ Prediction is "what usually comes next?", and counting is the simplest way to answer it.
- _Next question:_ "Why is the output bad? It only looks one word back."

**Ch 3. Probability and sampling**

- _Try it:_ Adjust **temperature** and **top-k** sliders on a probability distribution, then sample 20 times.
- _Animation:_ Bars sharpen or flatten as temperature changes. A spinner wheel whose slice sizes match the bars picks the next word.
- _Key idea:_ The model outputs a probability distribution, and something else decides which word to pick.
- _Live option:_ Run the same prompt at temperatures 0, 0.7, and 1.5 side by side.

### Part II — Representation

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

- _Try it:_ Press "train" and watch a tiny network fit a curve. Then train a **tiny character-level model** live in the browser on the rhymes from Ch 2 (a hand-written MLP, under 50k parameters).
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

**Ch 13. From predictor to assistant**

- _Try it:_ Show the "chat" formatting that wraps a conversation, revealing that a chat is still just text being continued.
- _Animation:_ Three stages: pretraining (internet text) → instruction tuning (example conversations) → preference tuning (thumbs up/down nudging the model).
- _Live option:_ Give the same prompt to a **base** model and to an **instruct** model side by side. v1 shows recorded outputs (Qwen2.5-0.5B base and instruct, with and without the chat template, plus GPT-2); a live T3 version is a future improvement.

**Ch 14. Quirks and limits**

- Hallucination ("the most likely continuation is not the same as the truth"), knowledge cutoff, context limits, tokenization blind spots, and sensitivity to prompt wording.
- _Live option:_ Guided experiments the visitor can run against the live model.

### Part VI — Harnesses

The model only turns text into a next-token distribution. Everything else in a chat app or coding agent is ordinary code wrapped around it: the **harness**. Harness demos default to a scripted model (T0 traces of real runs). Their tools are toys that run in the browser: a calculator, a lookup over a small bundled corpus, and a fake file system. They never touch the network or the visitor's real files.

v1 records the runs with Qwen2.5-1.5B-Instruct in a small Python harness (`scripts/build-agent-traces.py`) whose tools mirror the browser ones (`src/lib/harness/tools.ts`; tests check they give identical results). The prompt inspector shows a recorded conversation rather than the visitor's own typing, since there is no live chat model yet.

**Ch 15. The model is not the product**

- _Hook:_ "When you chat with an assistant, what does the model actually see?"
- _Try it:_ A **prompt inspector**. The visitor types _"Finish this: The cat sat on the"_ into a chat box, then expands the exact text the harness sends to the model: system prompt, chat template markers (from Ch 13), earlier turns, and tool definitions, all colored by where they came from.
- _Animation:_ The visitor's short message gets wrapped layer by layer until it is a small part of a long prompt. The model's reply is then unwrapped back into a chat bubble.
- _Key idea:_ A harness is the code around the model. It builds the prompt, calls the model, and decides what to do with the output.

**Ch 16. Tools**

- _Try it:_ Ask _"What is 1234 × 5678?"_ with tools off and with tools on. With tools off, the model guesses digits token by token. With tools on, it writes a calculator call, the harness runs it, and the model reads the result.
- _Animation:_ The model's output text turns into a structured `ToolCallCard` (tool name + arguments). The harness runs the tool, and the result slides back into the context as new tokens.
- _Format:_ Part VI uses a simplified, made-up tool-calling format that is easy to read (e.g. `<call calculator>1234 * 5678</call>`), not a real provider's JSON schema. Recorded traces are converted to it, and live T3/T4 responses are mapped to it for display.
- _Key idea:_ A tool call is just text in an agreed format. The model never runs anything itself; the harness parses the text and acts on it.
- _Live option:_ T3 or T4 with a model that supports tool calling, limited to the same in-browser toy tools.

**Ch 17. The agent loop**

- _Try it:_ Give a small task ("Find which rhyme from Ch 2 mentions a cat and count its words") and step through the run: think, call a tool, read the result, repeat, then answer.
- _Animation:_ Two nested loops. The inner loop is the token loop from Ch 11. The outer loop is the harness loop: call the model, run tools, append results, call again. A step counter and a stop condition (final answer or step limit) sit on the outer loop.
- _Key idea:_ An agent is a model called in a loop by a harness that feeds tool results back in until the task is done.

**Ch 18. Managing the context**

- _Try it:_ A **context budget** bar. As the agent from Ch 17 keeps working, the bar fills. The visitor picks a strategy when it overflows: drop the oldest turns, summarize them, or retrieve only relevant snippets.
- _Animation:_ Retrieval reuses the embedding map from Ch 5. The question becomes a point, the nearest document chunks light up, and only those are copied into the prompt.
- _Key idea:_ The context window is finite (Ch 8, Ch 14), so the harness decides what the model gets to see. Retrieval, summaries, and memory notes are all ways of choosing text to put back in.

**Ch 19. Trust and guardrails**

- _Try it:_ A **prompt injection** demo. The agent reads a (fake) web page whose text tells it to delete all files (v1: the text fakes the end of the tool result and a new user message, which the recorded model followed). The visitor toggles guardrails and sees what changes.
- _Animation:_ Text from a tool result flows into the same context as the user's instructions, colored differently, but the model reads it all as one stream of tokens.
- _Key idea:_ To the model, tool output is just more text. The harness has to supply the safety: permission prompts, tool allowlists, sandboxes, and step limits.

**Ch 20. Recap: the whole picture**

- One zoomable diagram that links each part back to its chapter, from bytes to the harness loop. A short quiz checks understanding.

---

## 4. Live LLM options

Use a tiered approach. The site always works, and visitors opt in to heavier features.

| Tier                                       | What it is                                                                                                                 | Cost / size                                                                                    | Gives us                                                                    | Used in                 |
| ------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------- | ----------------------- |
| **T0 — Recorded traces** (default)         | Pre-computed JSON of real model runs (top-k logprobs, attention, embeddings, tool-calling agent runs) for a set of prompts | ~KBs, instant                                                                                  | Accurate visuals from real models with zero setup                           | Every chapter           |
| **T1 — Tokenizer only**                    | `gpt-tokenizer` in the browser                                                                                             | ~1–2 MB                                                                                        | Live tokenization of any text                                               | Ch 4, 11, 14            |
| **T2 — Tiny in-browser model**             | Transformers.js: the canonical small model (**GPT-2 small**), plus `all-MiniLM-L6-v2` for embeddings                       | ~130 MB quantized GPT-2 (8-bit) or ~23 MB MiniLM, plus ~27 MB runtime, cached after first load | Real logits, attention, and embeddings for any prompt the visitor types     | Ch 0, 3, 5, 9, 11       |
| **T3 — Larger in-browser chat model**      | WebLLM (WebGPU), e.g. a ~0.5–1.5B instruct model                                                                           | 0.5–1 GB, WebGPU required                                                                      | Base vs. instruct comparison, a chat that feels real, and live tool calling | Ch 13, 14, 16–19        |
| **T4 — Bring your own API key** (optional) | Visitor pastes their own key for a provider that returns logprobs                                                          | Visitor pays                                                                                   | Frontier-quality output with top logprobs and tool calling                  | Ch 3, 11, 12, 14, 16–19 |

**Rules**

- Every live widget has a T0 fallback with the same UI. The live model only replaces where the data comes from.
- Create one shared `ModelProvider` interface (`tokenize`, `nextTokenDistribution`, `attention?`, `embed?`, `generate`) with implementations for recorded traces, Transformers.js, WebLLM, and remote APIs.
- **Canonical small model:** GPT-2 small to start (best attention-visualization tooling). It is defined in one place, `models/canonical.json` (Hugging Face ID, tokenizer, layer and head counts, context length, display name), so switching to another model such as SmolLM2-135M is a config change plus re-running `build-traces.py`:
  - The T2 worker, the T0 trace builder, and widgets all read that file. No widget hard-codes a model name, vocabulary size, or layer/head count.
  - Traces are stored per model under `static/traces/<model-id>/`, so the old and new models' traces can sit side by side while switching.
  - Tokens shown with the canonical model (Ch 0, 3, 9, 11) use that model's own tokenizer, so token IDs always match the logits and attention.
- Before any download, show a **consent dialog with the download size**, check for WebGPU and fall back to WASM, run model inference in a **Web Worker**, and show a progress bar.
- Security for bring-your-own keys:
  - Keep the key in memory or `sessionStorage` only, never `localStorage`.
  - Call the provider directly from the browser and never send the key anywhere else.
  - Set a strict CSP `connect-src` allowlist. The CSP is emitted by SvelteKit (`csp` in `vite.config.ts`, hash mode, so its inline scripts are allowed without `'unsafe-inline'`), and `firebase.json` adds the header-only `frame-ancestors 'none'`.
  - Show a clear warning that this sends the visitor's prompt to the provider.
  - Never ship a key in the site.
- Harness demos (Part VI) only expose in-browser toy tools. Live models can call those tools but never get network, file system, or `eval` access, regardless of tier.
- Optional later step: a rate-limited serverless proxy for a hosted demo. This is outside the static scope, so treat it as a separate decision.

---

## 5. Visual and animation system

### Design direction

- **Feel:** warm and editorial, with the interactive figures as the main attraction. References: Bartosz Ciechanowski's explainers and Distill. Use a warm off-white page in light mode and a warm charcoal in dark mode (following `prefers-color-scheme`), generous white space, and almost no decoration. Concept colors appear only where their concept does, so they stay meaningful.
- **Kitchen theme in words and structure, not illustration:**
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
      chapters/              # 00-guessing-game.svx … 20-recap.svx
      components/
        primitives/          # TokenChip, VectorStrip, ProbBars, SamplerWheel, ...
        widgets/             # BigramBuilder, BPEStepper, EmbeddingMap, AttentionViewer, GlassBoxGenerator, TinyTrainer, PromptInspector, AgentStepper, ...
        layout/              # StepController, WidgetFrame, DataSourceBadge, IngredientsBox, RecapCard, ProgressNav, GlossaryPopover, Cite, Sources
      references.json        # bibliography: id, authors, title, year, venue, URL/DOI, accessed date
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

Each chapter milestone (5–10) includes the [per-chapter fact-check](#per-chapter-fact-check-part-of-every-chapter-milestone-510) for its chapters. Milestone 12 is a final review of those facts across the whole site.

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
    - v1: axe on every page in light and dark, a phone-width overflow check, and the JS budget (gzipped) run in CI (`tests/e2e/quality.e2e.ts`). Screenshot tests run locally only (`npm run test:visual`), since baselines differ by OS. Lighthouse (local, simulated mobile): performance 95–96, accessibility/best practices/SEO 100 on sampled chapters. The custom domain is a manual Firebase console step.
12. **Final fact review**
    - Re-check every chapter's claim checklist (from the per-chapter fact-check below) against the finished site. Confirm that the claims are consistent across chapters, e.g. the same GPT-2 numbers everywhere and no chapter contradicting an earlier simplification.
    - Re-verify time-sensitive facts, such as Ch 12's frontier-model figures and the providers' tool-calling behavior. Update the sources and "accessed" dates.
    - **Expert review:** someone with ML background reads each Part end to end for errors and misleading simplifications. Findings are fixed or logged as issues before launch.
    - Run the link check and fix or replace any dead sources.
    - _Done when:_ every claim checklist has been re-checked, the citation unit test and link check pass, and expert review has no open findings.
    - v1 status: see [docs/fact-check/README.md](fact-check/README.md). Everything except the expert review is done; the expert review needs a human reviewer.

### Per-chapter fact-check (part of every chapter milestone, 5–10)

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
  - Part VI: Schick et al. 2023 (Toolformer), Yao et al. 2023 (ReAct), Lewis et al. 2020 (RAG), and Greshake et al. 2023 (prompt injection).

---

## 8. Success criteria

- A visitor with no ML background can explain "next-token prediction, tokens, embeddings, attention, sampling" and how a harness turns a model into an agent after finishing.
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
- **T3 and T4 tiers:** a WebLLM chat model (live base vs. instruct in Ch 13, live tool calling in Part VI) and bring-your-own-key providers. v1 covers these chapters with recorded runs (T0) and the live GPT-2 (T2). Both need a WebGPU or provider test setup that the CI and local headless browsers don't have.
