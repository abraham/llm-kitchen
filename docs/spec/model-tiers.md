# Model tiers

Plan for choosing, once for the whole site, whether the "Try it" widgets show recorded content or
run real models in the browser; [roadmap.md](roadmap.md) points here. When a phase lands, its part
moves into the spec it belongs to ([Specs that change](#specs-that-change)) and leaves this file.

## Goals

- **Recorded by default.** Every widget shows recorded content until the visitor picks a tier, and
  the site downloads nothing until then.
- **Tiers, not models.** No single model covers every widget, so the choice is a tier: a set of
  models that covers some kinds of task. A widget asks for the kind of task it needs, never for a
  model, and runs live when the chosen tier covers it.
- **One choice, one download.** Picking a tier downloads all of its models at once, so every widget
  it covers works offline afterwards, and the choice holds on every page and visit.
- **The text still matches.** The prose quotes recorded numbers, so a live widget can always show
  its recording again.

## Tiers

| Tier                   | Kinds of task                                                           | Models                                                                                                                    | Download     | Needs                            |
| ---------------------- | ----------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- | ------------ | -------------------------------- |
| **Recorded** (default) | Every widget, from its recording                                        | None                                                                                                                      | 0            | Nothing                          |
| **Small**              | `next-token`, `embed`, `fill-mask`, `image-text`                        | GPT-2 small (8-bit, 128 MB), all-MiniLM-L6-v2 (24 MB), BERT base (8-bit, 112 MB), CLIP ViT-B/32 text half (4-bit, 128 MB) | About 419 MB | Any supported browser            |
| **Large**              | Small's, plus `chat` (an instruct model with a chat template and tools) | Small's models, plus Qwen2.5-1.5B-Instruct (4-bit weights, 16-bit activations, 1,222 MB)                                  | About 1.6 GB | WebGPU with 16-bit float shaders |

- Each model is the one, or the ONNX export of the one, that recorded the widgets it covers: GPT-2
  small (12 widgets), MiniLM, `google-bert/bert-base-uncased`, `openai/clip-vit-base-patch32`, and
  `Qwen/Qwen2.5-1.5B-Instruct` (about 13 widgets). Live results then differ from the recordings
  only by quantization and sampling.
- Sizes include the 27 MB ONNX Runtime once. Each model is pinned to a commit with every file's
  SHA-256, as GPT-2 and MiniLM are now ([downloads.md](downloads.md)).
- CLIP runs only its text half: the recording gains each picture's image embedding (512 numbers per
  picture), so captions the visitor types are compared against those without downloading the
  vision half.
- Large is a superset of Small, so a visitor on Large never needs Small too.
- Where WebGPU or `shader-f16` is missing, Large is disabled with the reason. A 4-bit model with
  32-bit activations (1,788 MB) would run there, but slowly enough that the widgets wouldn't feel
  live.

## The Models link in the app bar

- The Downloads link in the app bar becomes a **Models** link to `/downloads`, in the same place:
  an icon showing the current tier (a filled dot for Recorded, one chip for Small, a stack of chips
  for Large), named and titled "Models: Recorded" (or Small, or Large), with `aria-current="page"`
  on the page.
- While a tier downloads, the icon shows a thin progress ring; when a download fails, a small
  warning mark. Neither changes the link's size.
- It stays a link, not a menu: one tap reaches the page where the choice is made and explained,
  and the app bar stays as narrow as it is now.

## The Downloads page

The page becomes **Models** ("Models and downloads" as its title), with the tier choice first.

- **The choice:** a `Choice` of three radios, "Show recordings (default)", "Small: about 419 MB",
  and "Large: about 1.6 GB, needs a graphics card", each with one line on what it covers. Large is
  disabled, with the reason, without WebGPU and `shader-f16`.
- **Choosing a tier is the click that downloads it.** The radio's label gives the size. Picking
  Small or Large saves the choice and starts downloading every model in it that isn't cached, in
  the inference worker, one model after another. A progress bar under the choice shows MB done of
  MB total for the tier, and each model's card shows its own.
- **While it downloads,** widgets stay on recordings and say "Downloading the Small tier…" in their
  badge. When every model is cached, the tier is ready and covered widgets switch to live.
- **If a download fails,** the choice stays, the failed model's card says why with "Try again",
  and widgets stay on recordings with "Recorded · the Small tier didn't finish downloading".
- **Going back to Recorded** keeps the downloaded files, so switching back is instant. Each card
  keeps its Remove button, and "Remove all" clears every tier. Removing a model of the chosen tier
  sets the choice back to Recorded.
- **Storage:** before downloading, the page checks `navigator.storage.estimate()` and says so if
  the tier won't fit, without starting.
- Below the choice, the model cards from [downloads.md](downloads.md), grouped under the tier that
  first includes them, with their links to Hugging Face. The ONNX Runtime row stays.

## Widgets

- Each widget with a live option names the kind of task it needs, and gets a provider for it from
  `useProvider(capability)`: the live provider when the chosen tier covers it and is ready, the
  recorded one otherwise. A widget never imports a model.
- **Badges** say which, and why:
  - "Live · Small · GPT-2 small (8-bit)"
  - "Recorded · GPT-2 small" (the default)
  - "Recorded · not in the Small tier"
  - "Recorded · Downloading the Small tier…"
  - "Recorded · this widget has no live version" for widgets that replay sessions (agent runs, the
    injection lab, reasoning runs), shown only when a tier is chosen.
- **Show the recording.** A live widget has a "Show the recording" toggle beside its badge. On, it
  shows exactly what it shows under Recorded; off (the default under a tier), it runs live. It's
  per widget and per page view, not saved. A live widget also says, once, "Live results differ
  from the numbers in the text."
- **Live input.** Where a recording fixes the input (a prompt, a word, a caption), a live widget
  adds a field for the visitor's own, as `PromptVariants` and `EmbeddingMap` do now.
- `ModelConsent` goes: the choice on the Models page is the consent. Its progress and error lines
  become part of the badge and a shared `TierStatus` line under it.

## Code

1. **`models/tiers.ts`**: `TIERS`, built from configs in `models/*.json` (one per model, as
   `canonical.json` and `embedder.json` are), each with its kinds of task, its models, its total,
   and what it needs. `Capability` is `'next-token' | 'embed' | 'fill-mask' | 'image-text' |
'chat'`.
2. **`stores/model-tier.svelte.ts`**: the chosen tier (`llm-kitchen:models` in `localStorage`, read
   after hydration), its state (`recorded`, `checking`, `downloading` with progress, `ready`,
   `error`), and WebGPU support. It downloads a tier through the inference worker's `download`
   request, model by model. Widgets get their provider from `useProvider(capability)` in
   `models/live.svelte.ts`.
3. **Providers**: `ModelProvider` gains optional `fillMask`, `embedText` (CLIP), and `chat`
   (messages in, a streamed reply out, using the model's chat template and the in-browser toy
   tools only). `RecordedProvider` keeps answering from recordings; `BrowserProvider` covers every
   capability.
4. **The inference worker** gains `fill-mask`, `image-text`, and `chat` tasks, the last with
   streamed tokens as `progress` messages through `rpc.ts`. `verifiedFetch` and the cache cover
   every new model, pinned the same way.
5. **The app bar** replaces the Downloads link with the Models link; **the Downloads page** gains
   the choice and groups its cards by tier.
6. **Recordings**: `vision/clip` gains each picture's image embedding; `scripts.record check live`
   covers the new models.

## Phases

1. **Plumbing, with today's two models.** Built. [downloads.md](downloads.md) describes it: `TIERS`
   with Small holding GPT-2 and MiniLM, the store, the Models link, the choice on the page,
   badges, "Show the recording", and `useProvider` in `GlassBoxGenerator`, `EmbeddingMap`, and
   `PromptVariants`. `ModelConsent` is gone.
2. **Fill out Small.** Built. [downloads.md](downloads.md) describes it: BERT base and CLIP's text
   half pinned and checked (`models/encoder.json`, `models/clip.json`, `record check live`), the
   worker's `fill-mask` and `embed-text` tasks, `vision/clip-images`, live options in
   `FillTheBlank`, `PictureMatch`, `GuessTheWord`, and `RecordedRuns`, and the fake inference
   worker the end-to-end tests run against.
3. **Large.** Qwen2.5-1.5B-Instruct on WebGPU and the `chat` task. Live options for the chat
   template, base vs. instruct, system prompts, few-shot, and tool-calling widgets, in
   [From predictor to assistant](chapters/predictor-to-assistant.md),
   [Instructions, roles, and the system prompt](chapters/instructions-and-roles.md),
   [Learning from examples in the prompt](chapters/few-shot.md), and [Tools](chapters/tools.md).
4. **Bring your own API key** stays separate and later, as in [roadmap.md](roadmap.md).

## Security

- Downloads still happen only in the inference worker, from pinned commits, with every file
  checked; choosing a tier is the click that starts them.
- Chat runs only the in-browser toy tools (`harness/tools.ts`); a live model never gets network,
  file system, or `eval` access ([security.md](security.md)).
- The saved choice is visitor-controlled storage: anything but `small` or `large` reads as
  Recorded.

## Tests

- **Unit:** every tier's sizes and commits match its configs; every capability a widget asks for is
  covered by Recorded and by a tier; Large contains every Small model; `parseTier` falls back to
  Recorded.
- **End-to-end,** against a fake inference worker (a fixture build that answers `download` and the
  tasks from recordings), so CI downloads nothing:
  - the Models link shows the current tier and goes to the page;
  - choosing Small shows tier progress, then covered widgets show "Live · Small" and uncovered ones
    "Recorded · not in the Small tier";
  - "Show the recording" restores the recorded view;
  - Large is disabled without WebGPU;
  - the choice holds after a reload, and Recorded downloads nothing.
- Lighthouse, the JavaScript budget, axe, and screenshots stay measured on Recorded; the live code
  loads only once a tier is chosen.
- Real downloads stay out of CI: `record check live` checks every pinned commit and hash.

## Specs that change

- [downloads.md](downloads.md): the page's tier choice, tier states, and cards grouped by tier; the
  per-widget download replaced by the tier download.
- [models-and-data.md](models-and-data.md): tiers replace T2's per-widget consent; T3 becomes Large.
- [design.md](design.md): the Models link in the app bar.
- [visualizations.md](visualizations.md) and [components.md](components.md): badges, "Show the
  recording", `useProvider`, and `ModelConsent`'s removal.
- [workers.md](workers.md): the new tasks and streamed chat.
- [security.md](security.md), [quality.md](quality.md), and [roadmap.md](roadmap.md).
