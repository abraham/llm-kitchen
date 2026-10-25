# Model downloads

Plan for how the live models download, stay cached in the browser, and become available to the
widgets that run them, from a "Try it" widget or from a Downloads page linked in the app bar;
[roadmap.md](roadmap.md) points here. When it's built, each part moves into the spec it belongs to
(see [Specs that change](#specs-that-change)) and this file goes.

## Goals

- **Nothing downloads without a click.** A model downloads only when the visitor presses a button
  that says how big it is, in a widget or on the Downloads page.
- **Download once.** A model's files stay in the browser after the first download, across pages,
  tabs, and visits, until the visitor removes them or the browser clears space.
- **Know what's there.** Every widget and the Downloads page show the same state for a model: not
  downloaded, downloading, downloaded, running, or failed.
- **Nothing hidden.** The Downloads page lists every model the site can download, how big it is,
  where it comes from, and links to its exact files on Hugging Face.

## What can be downloaded

| Model                 | Does                          | Size   | Files                                          | Used in                                                                                                                                                                     |
| --------------------- | ----------------------------- | ------ | ---------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| GPT-2 small (8-bit)   | Predicts the next token       | 128 MB | `Xenova/gpt2` at its pinned commit             | [Generating text](chapters/generating-text.md), [Quirks and limits](chapters/quirks-and-limits.md), [A prompt is the start of a document](chapters/prompts-as-documents.md) |
| all-MiniLM-L6-v2      | Turns a sentence into a point | 24 MB  | `Xenova/all-MiniLM-L6-v2` at its pinned commit | [Meaning as position](chapters/embeddings.md)                                                                                                                               |
| ONNX Runtime (shared) | Runs either model             | 27 MB  | The site's own hashed assets                   | Every live widget                                                                                                                                                           |

- `src/lib/models/downloads.ts` exports `DOWNLOADS`, one entry per model, built from
  `models/canonical.json` and `models/embedder.json`: id, display name, what it does, the original
  model (`huggingFaceId`), the ONNX repository (`onnxId`), the pinned commit (`onnxRevision`), the
  file list with SHA-256s (`onnxFiles`), the size (`onnxMB`), and the slugs of the chapters that use
  it.
- `MINILM` and `CANONICAL_LIVE` in `browser-model.svelte.ts` are built from the same entries, so a
  widget and the Downloads page can't disagree about a model. A new live model gets a config in
  `models/` and an entry in `DOWNLOADS`; a unit test fails if a `BrowserModelSpec` has no entry.
- The runtime isn't a model and has no state: it's part of the site's build, downloads the first
  time a model runs, and the browser keeps it with the site's other long-cached files
  ([deployment.md](deployment.md)). It's listed so the sizes add up to what the visitor downloads.

## States

`BrowserModel.status` has one of these states. There is one `BrowserModel` per model per tab
(`browserModel(spec)`), so every widget on a page, the Downloads page, and the next chapter after a
client-side navigation all see the same one.

| State         | Means                                                                  | Shown as                                                       |
| ------------- | ---------------------------------------------------------------------- | -------------------------------------------------------------- |
| `checking`    | The cache hasn't been read yet (also the prerendered HTML)             | The not-downloaded layout, with its button disabled            |
| `missing`     | At least one listed file isn't in the cache                            | Size and a download button                                     |
| `downloading` | Files are downloading; `fraction` of the model's bytes, or `null`      | Progress bar with MB done of MB total                          |
| `downloaded`  | Every listed file is in the cache; the model isn't running in this tab | "Downloaded" and a run button (widgets) or remove (page)       |
| `loading`     | Starting the model from the cache in the inference worker              | Indeterminate progress, "Starting GPT-2 small (8-bit)…"        |
| `ready`       | Running in this tab, on `webgpu` or `wasm`                             | "Running in your browser on your graphics card" (or processor) |
| `error`       | The last download or start failed, with a message                      | The message and "Try again"                                    |

- A failed download keeps the files that finished and passed their check, so trying again fetches
  only the rest.
- `checking` resolves in a few milliseconds: it's one `match` per listed file, with no network. It
  runs when the first widget or the Downloads page asks for the model, and again when the tab
  becomes visible, since another tab may have downloaded or removed it. A model that's
  `downloading`, `loading`, or `ready` isn't re-checked.
- The state line is a `role="status"` region, so a screen reader hears "Downloaded" or "Download
  failed" without moving focus. Progress uses `<progress>` with the model's name as its label.

## Downloading from a widget

`ModelConsent` stays the gate in every live "Try it" widget ([Meaning as
position](chapters/embeddings.md), [Generating text](chapters/generating-text.md),
[Quirks and limits](chapters/quirks-and-limits.md), and
[A prompt is the start of a document](chapters/prompts-as-documents.md)). Its card shows the
widget's purpose, then by state:

- **`missing`:** "Download about N MB and run it", where N is the model plus the runtime, as now.
- **`downloaded`:** "Run it (already downloaded)". Running needs the visitor's processor or graphics
  card and a few hundred MB of memory, so it still waits for a click; a downloaded model never starts
  on its own.
- **`downloading` and `loading`:** progress, the same in every widget on the page. A download started
  on the Downloads page and then continued on a chapter (client-side navigation) keeps its progress.
- **`ready`:** the widget switches to live, as now.
- **`error`:** the message and "Try again".

The card ends with a "Manage downloads" link to the Downloads page. Pressing the button in one widget
downloads and starts the model for every widget on the page that uses it.

## The Downloads page

- **Route:** `/downloads` (`src/routes/downloads/+page.svelte`), prerendered like every page. It
  isn't a chapter: it has no number, isn't in the curriculum, and has no levels. A static route wins
  over `[chapter]`, and a unit test checks no chapter slug is `downloads`.
- **App bar link:** a download icon link (an arrow into a tray) before the theme toggle on every page,
  with the accessible name and tooltip "Downloads", and `aria-current="page"` on the Downloads page.
  It's a link, not a button, so it works without JavaScript and opens in a new tab. It shows no count
  or badge.
- **Heading and intro:** "Downloads", then a short paragraph: some widgets can run a real model in
  your browser instead of replaying recorded answers; models download only when you ask, from
  Hugging Face, and stay in this browser until you remove them or it clears space.
- **One card per model**, in `DOWNLOADS` order:
  - name and what it does;
  - size, and the pinned commit's first 7 characters;
  - the chapters that use it, linked;
  - its state and one action: **Download** when `missing` (downloads without starting it), progress
    when `downloading`, **Remove** when `downloaded` or `ready`, **Try again** when `error`;
  - two links: **Original model** to `https://huggingface.co/{huggingFaceId}` (the model card, its
    license, and its authors) and **Files used here** to
    `https://huggingface.co/{onnxId}/tree/{onnxRevision}` (the exact commit the site downloads).
- **The runtime row:** size, and that it comes from this site the first time a model runs. No action.
- **Footer:** the total size of the downloaded models in this browser, and **Remove all** when any
  is downloaded.
- **Without JavaScript or the Cache API:** the prerendered page lists every model with its size and
  links. Where `caches` doesn't exist (some private windows), the states say "This browser doesn't
  keep downloads", the widgets still work, and each visit downloads again.
- Removing a model that's `ready` deletes its files; it keeps running in this tab until the tab
  reloads, and its card says so.
- Downloading here doesn't start the model, so the page never holds a model in memory.

## How a download works

- Only the inference worker fetches model files. The page's `connect-src` is `'self'`, and only the
  inference worker's policy allows Hugging Face ([workers.md](workers.md#security)).
- The worker gets a new request, `{ type: 'download', model }`. It fetches each listed file of the
  model that isn't already cached, at the pinned commit, through `verifiedFetch`, and stores it in
  the cache only after its SHA-256 matches. Progress counts bytes across the model's files, so the
  bar moves once, from 0 to the model's size.
- `load` reads the model's files through the same cache. A file that's missing downloads first, as in
  `download`, so pressing a widget's button on a `missing` model is one download and one start.
  `BrowserModel.load` and `BrowserModel.download` are the only callers of these requests.
- A request for a model that's already downloading joins the same download rather than starting a
  second one.

## The cache

- One Cache API store, `llm-kitchen-models` (`MODEL_CACHE` in `src/lib/models/model-cache.ts`),
  in the site's origin. The page and the worker open the same store.
- **Keys** are each file's pinned URL, `https://huggingface.co/{onnxId}/resolve/{onnxRevision}/{path}`,
  whatever revision Transformers.js asked for (it asks for `config.json` at `main`). The worker sets
  `env.useBrowserCache = false` and gives Transformers.js a custom cache (`env.useCustomCache`,
  `env.customCache`) that maps every key to its pinned URL, so the page can find a model's files
  from its config alone.
- **Only checked files go in.** The worker writes a file only after its whole body matched its
  SHA-256, and never writes a file that isn't listed. The page only reads (`match`, for state) and
  deletes (Remove).
- **Downloaded** means every path in `onnxFiles` has an entry. A new pinned commit changes every key,
  so a model whose commit changes shows as `missing` until it downloads again.
- **Cleanup:** when the worker opens the cache it deletes entries that aren't a current listed file
  (older commits), and deletes Transformers.js's default `transformers-cache` store, which earlier
  builds wrote to, so the same model isn't stored twice.
- **Eviction:** the site doesn't ask for persistent storage. Under storage pressure the browser may
  clear the cache; the model then shows as `missing` and downloads again when asked.

## Security

- Downloads stay behind a click, from one origin, at a pinned commit, with every file checked
  ([security.md](security.md#models)).
- The cache only holds checked files written by the worker. Anything else on the origin that could
  write to it could also run script, so reading cached files without re-hashing them adds no risk;
  re-hashing 128 MB on every start would cost seconds.
- The Downloads page's external links are built from `models/*.json`, not from `references.json`.
  The rule for external links widens to allow them: each must be an `https://huggingface.co/` URL,
  checked by a unit test.

## Tests

- **Unit** (`src/lib/models/downloads.test.ts`, `model-cache.test.ts`):
  - every `BrowserModelSpec` has a `DOWNLOADS` entry, with the size and commit of its config;
  - every chapter slug in `DOWNLOADS` exists, and none is `downloads`;
  - Hugging Face links are `https://huggingface.co/` URLs built from the config;
  - a key at `main` or another revision maps to the pinned URL, and other hosts or repositories are
    left alone;
  - with a fake cache: every listed file gives `downloaded`, one missing gives `missing`, and cleanup
    removes only unlisted entries;
  - the worker's cache refuses to store an unlisted file.
- **End-to-end** (`tests/e2e/downloads.e2e.ts`), with no network to Hugging Face:
  - the app bar link on the menu and on a chapter goes to `/downloads`, with `aria-current` there;
  - the page lists both models and the runtime with sizes, commits, chapter links, and both Hugging
    Face links, and each model says "Not downloaded";
  - after the test writes placeholder entries for every listed file into `llm-kitchen-models`, the
    page says "Downloaded", the [Meaning as position](chapters/embeddings.md) widget offers "Run it
    (already downloaded)", and Remove returns both to "Not downloaded".
- `/downloads` is in the accessibility (axe) and Lighthouse page lists, and gets visual baselines.
- Real downloads stay out of CI, as now: `record check live` checks the pinned commits and hashes.

## Specs that change

When this is built:

- [models-and-data.md](models-and-data.md#live-model-rules): the states, the cache, and the
  Downloads page replace "cached after the first load".
- [workers.md](workers.md): the `download` request and the inference worker's cache.
- [architecture.md](architecture.md): the `/downloads` route, `downloads.ts`, and `model-cache.ts`.
- [design.md](design.md): the app bar's Downloads link and the Downloads page.
- [components.md](components.md): `ModelConsent`'s states.
- [security.md](security.md): the external link rule and the cache.
- [quality.md](quality.md): the new tests and page lists.
