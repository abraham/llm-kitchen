# Model downloads

How the visitor chooses between recordings and a tier of live models, and how the models download,
stay cached in the browser, and become available to the widgets that run them, from the Models page
linked in the app bar. [models-and-data.md](models-and-data.md#live-model-rules) has the rules every
live model follows, [workers.md](workers.md#the-inference-worker) the worker that runs them, and
[model-tiers.md](model-tiers.md) the plan for the tiers' later models.

## Goals

- **Nothing downloads without a click.** Widgets show recordings until the visitor chooses a tier
  on the Models page, whose label says how big it is.
- **One choice, one download.** Choosing a tier downloads all of its models, and the choice holds
  on every page and visit. A widget asks for a kind of task, never for a model.
- **Download once.** A model's files stay in the browser after the first download, across pages,
  tabs, and visits, until the visitor removes them or the browser clears space.
- **Know what's there.** The app bar, every widget, and the Models page show the same state for the
  chosen tier and its models: downloading, ready, running, or failed.
- **Nothing hidden.** The Models page lists every model the site can download, how big it is,
  where it comes from, and links to its exact files on Hugging Face.
- **The text still matches.** The prose quotes recorded numbers, so a live widget can always show
  its recording again.

## What can be downloaded

| Model                           | Does                                                         | Size   | Files                                                                          | Used in                                                                                                                                                                                                                                                                                                                                  |
| ------------------------------- | ------------------------------------------------------------ | ------ | ------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| GPT-2 small (8-bit)             | Predicts the next token                                      | 128 MB | `Xenova/gpt2` at its pinned commit                                             | [The guessing game](chapters/guessing-game.md), [Probability and sampling](chapters/probability-and-sampling.md), [Generating text](chapters/generating-text.md), [Quirks and limits](chapters/quirks-and-limits.md), [A prompt is the start of a document](chapters/prompts-as-documents.md), [Reading both ways](chapters/encoders.md) |
| all-MiniLM-L6-v2                | Turns a sentence into a point                                | 24 MB  | `Xenova/all-MiniLM-L6-v2` at its pinned commit                                 | [Meaning as position](chapters/embeddings.md)                                                                                                                                                                                                                                                                                            |
| BERT base (8-bit)               | Fills in a blank, reading both sides                         | 112 MB | `Xenova/bert-base-uncased` at its pinned commit                                | [Reading both ways](chapters/encoders.md)                                                                                                                                                                                                                                                                                                |
| CLIP ViT-B/32 text half (4-bit) | Turns a caption into a point it can compare with pictures    | 128 MB | `Xenova/clip-vit-base-patch32`'s text model and tokenizer at its pinned commit | [Seeing pictures](chapters/seeing-pictures.md)                                                                                                                                                                                                                                                                                           |
| Qwen2.5-0.5B-Instruct (4-bit)   | Chats in its template, follows instructions, and calls tools | 793 MB | `onnx-community/Qwen2.5-0.5B-Instruct` at its pinned commit                    | [From predictor to assistant](chapters/predictor-to-assistant.md), [Instructions, roles, and the system prompt](chapters/instructions-and-roles.md), [Learning from examples in the prompt](chapters/few-shot.md), [Tools](chapters/tools.md)                                                                                            |
| ONNX Runtime (shared)           | Runs every model                                             | 27 MB  | The site's own hashed assets                                                   | Every live widget                                                                                                                                                                                                                                                                                                                        |

- `src/lib/models/downloads.ts` exports `DOWNLOADS`, one entry per model, built from
  `models/canonical.json`, `embedder.json`, `encoder.json`, `clip.json`, and `assistant.json`: id,
  display name, what it does, the kind of task it runs, the original model (`huggingFaceId`), the
  ONNX repository (`onnxId`), the pinned commit (`onnxRevision`), the file list with SHA-256s
  (`onnxFiles`), the size (`onnxMB`), and the slugs of the chapters that use it.
- `CANONICAL_LIVE`, `MINILM`, `BERT_LIVE`, `CLIP_TEXT`, and `ASSISTANT_LIVE` are entries of
  `DOWNLOADS`, so a tier and the Models page can't disagree about a model. A new live model gets a
  config in `models/`, an entry in `DOWNLOADS`, and a place in a tier; `record check live` covers
  every config.
- CLIP downloads only its text half, with 4-bit weights (`onnx/text_model_q4.onnx`, `dtype` in its
  config): the 8-bit file loses colors, so "a crimson star" matched a green one. Qwen2.5-0.5B-Instruct has 4-bit
  weights and 32-bit activations (`q4`, one file of about 790 MB) and runs on WebGPU, or on the
  processor where there's none. The 1.5B model the recordings use doesn't work in the browser: its
  16-bit-activation export (`q4f16`) writes only "!!!!" on WebGPU (0.5B's writes nonsense too), and
  its 1.8 GB `q4` file runs out of memory as it loads. Every other model is 8-bit. CLIP's recording,
  `vision/clip-images`, has each picture's unit-length image embedding and CLIP's logit scale, so
  a caption typed in the browser is matched against the pictures without the vision half; it loads
  only when the widget runs live.
- The runtime isn't a model and has no state: it's part of the site's build, downloads the first
  time a model runs, and the browser keeps it with the site's other long-cached files
  ([deployment.md](deployment.md)). It's listed so the sizes add up to what the visitor downloads.

## Tiers

`src/lib/models/tiers.ts` exports `TIERS`, the choices on the Models page in order. A tier covers
some kinds of task (`Capability`), each with one model from `DOWNLOADS`.

| Tier                   | Kinds of task                                    | Models                                                                     | Download                       |
| ---------------------- | ------------------------------------------------ | -------------------------------------------------------------------------- | ------------------------------ |
| **Recorded** (default) | Every widget, recorded                           | None                                                                       | 0                              |
| **Small**              | `next-token`, `embed`, `fill-mask`, `image-text` | GPT-2 small (8-bit), all-MiniLM-L6-v2, BERT base (8-bit), CLIP's text half | About 419 MB, with the runtime |
| **Large**              | Small's, plus `chat`                             | Small's models, plus Qwen2.5-0.5B-Instruct (4-bit)                         | About 1.2 GB, with the runtime |

- Large is a superset of Small, so a visitor on Large never needs Small too.
- `tierModels(tier)` lists a tier's models once each, and `tierMB(tier)` adds their sizes and the
  runtime once.
- `stores/model-tier.svelte.ts` (`modelTier`) holds the choice, saved as `llm-kitchen:models` in
  `localStorage` (nothing is saved for Recorded) and read after hydration by the app bar.
  `parseTier` reads anything but a known tier as Recorded, since the visitor controls that storage.
- **The tier's state** comes from its models: `recorded`; `checking` while any cache check is
  pending; `downloading` with MB done of the tier's total; `ready` once every model is cached (or
  the browser has no cache, so each model downloads as it starts); `error` when a model's download
  failed or the tier won't fit. A cached model that fails to start is the widget's problem, not the
  tier's.
- **Choosing a tier** saves it and downloads its missing models one after another, stopping at the
  first failure. First it compares their size with `navigator.storage.estimate()`, and if they
  won't fit it says how much is needed and free, without starting. A page loaded with a tier saved
  resumes the download, so a tier interrupted by a reload finishes.
- **Going back to Recorded** keeps the files, so choosing the tier again is instant. Removing a
  model of the chosen tier, or Remove all, sets the choice back to Recorded.

## States

`BrowserModel.status` has one of these states. There is one `BrowserModel` per model per tab
(`browserModel(spec)`), so every widget on a page, the Models page, and the next chapter after a
client-side navigation all see the same one.

| State         | Means                                                                  | Shown on the Models page                           |
| ------------- | ---------------------------------------------------------------------- | -------------------------------------------------- |
| `checking`    | The cache hasn't been read yet (also the prerendered HTML)             | "Checking…"                                        |
| `missing`     | At least one listed file isn't in the cache                            | "Not downloaded" ("Waiting to download" in a tier) |
| `downloading` | Files are downloading; `fraction` of the model's size                  | Progress bar with MB done of MB total              |
| `downloaded`  | Every listed file is in the cache; the model isn't running in this tab | "Downloaded" and Remove                            |
| `loading`     | Starting the model from the cache in the inference worker              | "Downloaded, and starting in this tab"             |
| `ready`       | Running in this tab, on `webgpu` or `wasm`                             | "Downloaded, and running in this tab" and Remove   |
| `error`       | The last download or start failed, with a message                      | The message, and "Try again" for the chosen tier's |

- A failed download keeps the files that finished and passed their check, so trying again fetches
  only the rest.
- `checking` resolves in a few milliseconds: it's one `match` per listed file, with no network. It
  runs when the tier store or the Models page asks for the model, and again when the tab becomes
  visible, since another tab may have downloaded or removed it. Only a model that's `checking`,
  `missing`, or `downloaded` changes state; one that's downloading, starting, running, or failed
  keeps it, and only `cached` (whether the files are there) updates.
- The state lines are `role="status"` regions, so a screen reader hears "Downloaded" or "Download
  failed" without moving focus. Progress uses `<progress>` with the model's or tier's name as its
  label.

## Widgets

A widget with a live option calls `useProvider(capabilities, recordedModel)`
(`models/live.svelte.ts`) during initialization, with the kind of task it needs or a list of them,
and gets a `LiveOption`: whether the chosen tier covers every task, how far their models have got,
and `provider` (or `providerFor(capability)`), a `BrowserProvider` while the widget runs live and
`null` otherwise, when the widget uses its recording. It never imports a model. Once the tier is
ready, `useProvider` starts the models in the inference worker; the choice on the Models page is
the click that allows it. A widget with several tasks is live only when all of its models are.

| Widget                                                                                                                   | Tasks                     | Live input                                                                                      |
| ------------------------------------------------------------------------------------------------------------------------ | ------------------------- | ----------------------------------------------------------------------------------------------- |
| `GuessTheWord` ([The guessing game](chapters/guessing-game.md))                                                          | `next-token`              | The start of a sentence, whose next word the visitor guesses                                    |
| `RecordedRuns` ([Probability and sampling](chapters/probability-and-sampling.md))                                        | `next-token`              | A beginning, continued at temperatures 0, 0.7, and 1.5 side by side, a token at a time          |
| `EmbeddingMap` ([Meaning as position](chapters/embeddings.md))                                                           | `embed`                   | A word, placed on the map                                                                       |
| `GlassBoxGenerator` ([Generating text](chapters/generating-text.md), [Quirks and limits](chapters/quirks-and-limits.md)) | `next-token`              | A beginning, and any token picked, at any temperature                                           |
| `PromptVariants` ([A prompt is the start of a document](chapters/prompts-as-documents.md))                               | `next-token`              | A prompt                                                                                        |
| `FillTheBlank` ([Reading both ways](chapters/encoders.md))                                                               | `fill-mask`, `next-token` | A sentence with one `___`: BERT fills it, GPT-2 continues the words before it                   |
| `PictureMatch` ([Seeing pictures](chapters/seeing-pictures.md))                                                          | `image-text`              | A caption, matched against the 12 pictures                                                      |
| `ChatTemplate` ([From predictor to assistant](chapters/predictor-to-assistant.md))                                       | `chat`                    | The chat already in the widget, sent to Qwen; its reply is written after the cursor             |
| `BaseVsInstruct` ([From predictor to assistant](chapters/predictor-to-assistant.md))                                     | `next-token`, `chat`      | A prompt for GPT-2, and Qwen with and without its template; the base Qwen column stays recorded |
| `SystemPrompts` ([Instructions, roles, and the system prompt](chapters/instructions-and-roles.md))                       | `chat`                    | A system prompt of the visitor's own; the sums table is asked again live                        |
| `FewShot` ([Learning from examples in the prompt](chapters/few-shot.md))                                                 | `chat`, `next-token`      | A word and its right answer, a new row the models score                                         |
| `ToolsDemo` ([Tools](chapters/tools.md))                                                                                 | `chat`                    | A sum, answered without tools and then through the harness with the calculator                  |

Live, a widget asks the model for everything it shows, the recorded inputs too, so the numbers
change as soon as it goes live.

| Option state  | Badge                                               | `TierStatus` line under the widget                                                                  |
| ------------- | --------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| `recorded`    | Recorded · GPT-2 small                              | The widget's purpose, and a "Choose a model tier" link to the Models page                           |
| `uncovered`   | Recorded · not in the Small tier                    | The tier has no model for it, with a link to the Models page                                        |
| `downloading` | Recorded · downloading the Small tier…              | Tier progress, MB done of MB total                                                                  |
| `failed`      | Recorded · the Small tier didn't finish downloading | The message (an alert) and a link to the Models page                                                |
| `starting`    | Recorded · starting GPT-2 small (8-bit)…            | "Starting GPT-2 small (8-bit) in your browser…"                                                     |
| `stopped`     | Recorded · GPT-2 small (8-bit) didn't start         | The message (an alert) and "Try again", which starts the models again                               |
| `live`        | Live · Small · GPT-2 small (8-bit)                  | Where it runs (graphics card or processor), and "Live results differ from the numbers in the text." |

- A widget with several models names them all: "Live · Small · BERT base (8-bit) and GPT-2 small
  (8-bit)". A long badge wraps rather than widening the page on a phone.
- **Show the recording.** A live widget's `WidgetFrame` (its `live` prop) has a "Show the
  recording" switch beside the badge. On, the widget shows exactly what it shows under Recorded,
  with the Recorded badge; off (the default), it runs live. It's per widget and per page view, not
  saved.
- **Live input.** The fields in the table above show only while the widget runs live.
- **Chat.** The live model is Qwen2.5-0.5B-Instruct, while most recordings are 1.5B's, so live
  replies are weaker than the text's. Qwen replies greedily, as the recordings did, so asking again
  gives the same reply. The
  reply streams in as it's written. Scores (`FewShot`) are the chance of every token of the right
  answer after the prompt, as `record/prompts.py` computes them. `ToolsDemo` runs the recording's
  harness once: Qwen gets the calculator's schema in its template, the page reads its
  `<tool_call>` (`parseToolCall` in `harness/agent.ts`, the same rule as `record/agent.py`), runs
  the toy calculator, and gives Qwen the result. Live tools are only the in-browser toys.
- `ChatTemplate` is computed, not recorded, so under Recorded and until it's live its badge stays
  "Computed in your browser"; its `TierStatus` line still shows the tier's state.

## The Models page

- **Route:** `/downloads` (`src/routes/downloads/+page.svelte`), prerendered like every page. It
  isn't a chapter: it has no number, isn't in the curriculum, and has no levels. A static route wins
  over `[chapter]`, and a unit test checks no chapter slug is `downloads`.
- **App bar link:** a Models link before the theme toggle on every page. Its icon shows the chosen
  tier (a filled dot for Recorded, a chip for Small, a stack of chips for Large); its accessible
  name and tooltip are "Models: Recorded" (or Small, or Large), with ", downloading N%" or
  ", download failed" added while that's so; and
  it has `aria-current="page"` on the Models page. While the tier downloads, a thin progress ring
  circles the icon, and after a failure a small warning mark sits on its corner; neither changes the
  link's size. It's a link, not a button or menu, so it works without JavaScript and opens in a new
  tab.
- **Heading and intro:** "Models" (the page title is "Models and downloads"), then a short
  paragraph: widgets replay recorded runs; choosing a tier runs real models in your browser instead,
  downloaded from Hugging Face and kept until you remove them or the browser clears space.
- **The choice:** a `Choice` of radios, "Show recordings (default)", "Small: about 419 MB", and
  "Large: about 1.2 GB", each with a line on what it covers. Under it, the tier's state: "Checking…", a progress bar with
  MB done of the tier's total, the error with "Try again", or "The Small tier is ready: the widgets
  it covers run live."
- **One card per model** (a `section` labelled by its name), grouped under a heading for the first
  tier that includes it:
  - name and what it does;
  - size, and the pinned commit's first 7 characters;
  - the chapters that use it, linked;
  - its state and at most one action: progress when `downloading`, **Remove** when the files are
    cached, **Try again** when its download for the chosen tier failed; each button's name ends
    with the model's (visually hidden), so "Remove all-MiniLM-L6-v2". There's no per-model
    download: the tier choice is the download;
  - two links: **Original model** to `https://huggingface.co/{huggingFaceId}` (the model card, its
    license, and its authors) and **Files used here** to
    `https://huggingface.co/{onnxId}/tree/{onnxRevision}` (the exact commit the site downloads).
- **The runtime row:** size, and that it comes from this site the first time a model runs. No action.
- **Footer:** the total size of the downloaded models in this browser, and **Remove all** when any
  is downloaded.
- **Without JavaScript or the Cache API:** the prerendered page lists every model with its size and
  links. Where `caches` doesn't exist (some private windows), the states say "This browser doesn't
  keep downloads", a chosen tier is ready at once, and each model downloads as it starts, on each
  visit.
- Removing a model that's `ready` deletes its files; it keeps running in this tab until the tab
  reloads, and its card says so.
- Downloading here doesn't start a model, so the page never holds one in memory.

## How a download works

- Only the inference worker fetches model files. The page's `connect-src` is `'self'`, and only the
  inference worker's policy allows Hugging Face ([workers.md](workers.md#security)).
- The worker gets a new request, `{ type: 'download', model }`. It fetches each listed file of the
  model that isn't already cached, at the pinned commit, through `verifiedFetch`, and stores it in
  the cache only after its SHA-256 matches. Progress counts bytes across the model's files, so the
  bar moves once, from 0 to the model's size.
- `load` reads the model's files through the same cache. `BrowserModel.load` on a model that isn't
  `downloaded` sends `download` first, then `load`; a file evicted in between downloads as the
  model starts. Where there's no cache, it sends only `load`, and Transformers.js downloads the
  files as it starts. `BrowserModel.load` and `BrowserModel.download` are the only callers of these
  requests; the tier store calls `download`, and `useProvider` calls `load`.
- A request for a model that's already downloading joins the same download rather than starting a
  second one, in the worker and in `BrowserModel`.

## The cache

- One Cache API store, `llm-kitchen-models` (`MODEL_CACHE` in `src/lib/models/model-cache.ts`),
  in the site's origin. The page and the worker open the same store.
- **Keys** are each file's pinned URL, `https://huggingface.co/{onnxId}/resolve/{onnxRevision}/{path}`,
  whatever revision Transformers.js asked for (it asks for `config.json` at `main`). The worker sets
  `env.useBrowserCache = false` and gives Transformers.js a custom cache (`env.useCustomCache`,
  `env.customCache`) that maps every key to its pinned URL, so the page can find a model's files
  from its config alone.
- **Only checked files go in.** The worker streams each file into `cache.put`; `verifiedFetch` errors
  the body at its end if the SHA-256 doesn't match, and then `put` stores nothing. Transformers.js
  writes a file only after reading all of it through the same check. Neither writes a file that
  isn't listed. The page only reads (`match`, for state) and deletes (Remove).
- **Downloaded** means every path in `onnxFiles` has an entry. A new pinned commit changes every key,
  so a model whose commit changes shows as `missing` until it downloads again.
- **Cleanup:** when the worker first opens the cache it deletes entries that aren't a current listed
  file (older commits), and deletes Transformers.js's default `transformers-cache` store, which
  earlier builds wrote to, so the same model isn't stored twice.
- **Eviction:** the site doesn't ask for persistent storage. Under storage pressure the browser may
  clear the cache; the model then shows as `missing` and downloads again when asked.
- **Private windows:** Chrome keeps a private window's cache in memory, and `cache.put` can refuse a
  big file with `UnknownError` (it refused a 1.2 GB one), though `storage.estimate()` reports room. The
  worker turns that into "This browser couldn't store … ; a private window may not have room for
  it", so the Large tier fails with a reason; a hash mismatch fails as `NetworkError` and keeps
  its own message.

## Security

- Downloads stay behind a click (choosing a tier), from one origin, at a pinned commit, with every
  file checked ([security.md](security.md#models)).
- The cache only holds checked files written by the worker. Anything else on the origin that could
  write to it could also run script, so reading cached files without re-hashing them adds no risk;
  re-hashing 128 MB on every start would cost seconds.
- The Models page's external links are built from `models/*.json`, not from `references.json`:
  `https://huggingface.co/` URLs, checked by `downloads.test.ts`.

## Tests

- **Unit** (`src/lib/models/downloads.test.ts`, `tiers.test.ts`, `model-cache.test.ts`):
  - every live model is in `DOWNLOADS`, with the size, commit, and files of its config;
  - every chapter slug in `DOWNLOADS` exists, and none is `downloads`;
  - Hugging Face links are `https://huggingface.co/` URLs built from the config;
  - Recorded comes first and downloads nothing; every kind of task a widget asks for is covered by
    a tier with a model in `DOWNLOADS`; a tier's size is its models plus the runtime once; Large
    contains every Small model; `parseTier` reads anything
    unknown as Recorded;
  - `parseToolCall` reads every recorded agent step as the recording harness did
    (`harness/agent.test.ts`);
  - a key at `main` or another revision maps to the pinned URL, and unlisted files, other
    repositories, other hosts, and local paths get no key, so the worker's cache never stores them;
  - with a fake cache: every listed file gives downloaded, one missing doesn't, removing a model
    deletes only its files, and cleanup removes only unlisted entries.
- **End-to-end** (`tests/e2e/downloads.e2e.ts`), with no network to Hugging Face:
  - the Models link, named "Models: Recorded", on the menu and on a chapter goes to `/downloads`,
    with `aria-current` there;
  - the page offers the tiers, with Recorded chosen, and lists the four models under Small and the
    runtime, with sizes, commits, chapter links, both Hugging Face links, "Not downloaded", and no
    buttons;
  - after the test writes placeholder entries for every listed file into `llm-kitchen-models`,
    choosing Small is ready at once, the link says "Models: Small", the choice holds after a reload
    and on other pages, and removing a model sets it back to Recorded;
  - with Hugging Face blocked, choosing Small fails with "Try again", the link says "download
    failed", and [Meaning as position](chapters/embeddings.md)'s map says "Recorded · the Small tier
    didn't finish downloading" with an alert and no word field;
  - under Recorded, the live widgets link to the Models page and show no live input.
- **End-to-end, live** (`tests/e2e/live.e2e.ts`), against the end-to-end build's fake inference
  worker (`tests/e2e/fixtures/fake-inference.worker.ts`). It's built only with `VITE_FIXTURES`, and
  a page uses it when `localStorage` has `llm-kitchen:fake-inference`. It writes placeholder files
  for a download, "starts" at once, and answers every task from made-up numbers, so CI downloads
  nothing. Its chat replies are fixed: a calculator call when given the calculator and a sum, the
  result when given a tool result, "Fake reply." otherwise:
  - choosing Small makes it ready and the covered widgets live;
  - under Small, the chat widgets say "Recorded · not in the Small tier";
  - choosing Large makes it ready and the chat widgets live;
  - each live widget takes the visitor's own input and shows the fake answers, and "Show the
    recording" brings back the recorded view and badge;
  - every page with a live widget, live under Large, has no axe violations and doesn't scroll
    sideways on a phone.
- `/downloads` is in the accessibility, phone-width, JavaScript-budget, and Lighthouse page lists,
  and has visual baselines.
- Real downloads stay out of CI: `record check live` checks the pinned commits and hashes.
