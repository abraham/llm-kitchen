# LLM Kitchen

A static site that teaches how a large language model works, from "guess the next word" to the
harness that turns a model into an agent. See [docs/spec/](docs/spec/README.md) for how the site
works and why.

## Development

Requires Node 26 (see `.nvmrc`).

```sh
npm install
npm start.             # dev server
npm run build          # social images, then the static build in build/
npm run preview        # serve the build on :4173
npm run serve          # serve the build through the Firebase Hosting emulator on :4173
```

Checks (the same scripts CI runs):

```sh
npm run format:check   # Prettier (npm run format fixes it)
npm run lint           # ESLint
npm run check          # svelte-check, fails on warnings
npm test               # Vitest unit tests
npx playwright install chromium   # once
npm run test:e2e       # Playwright against a production build
```

The e2e suite also checks every page for axe violations (light and dark), sideways scrolling on a
phone-sized screen, and a JavaScript budget (150 KB gzipped; 350 KB on the two pages that run the
GPT-2 tokenizer).

Screenshot tests run locally only, because baselines differ between operating systems:

```sh
npm run test:visual                         # compare with tests/visual/*-snapshots
npm run test:visual -- --update-snapshots=all   # accept intended changes
```

Each chapter is a folder, `src/lib/chapters/<slug>/`, with its prose (`chapter.svx`), the widgets
only it uses, its first-view datasets (`chapter.ts`), and its tests (`facts.test.ts`,
`chapter.e2e.ts`). The reading order is `src/lib/curriculum/curriculum.ts`; chapter numbers are
derived from it. `.svx` files are not formatted by Prettier. See
[docs/spec/architecture.md](docs/spec/architecture.md).

### Recorded data

The site ships pre-computed runs of real models in `static/data/`, each file checked against its
parser in `src/lib/datasets/`. To regenerate them, set up the Python environment once, then run a
recording module. The runner is offline unless you add `--download`, which the first run of each
model needs; it refuses a download that would leave less than 10 GB free unless you add `--force`:

```sh
python3 -m venv scripts/.venv
scripts/.venv/bin/pip install -r scripts/requirements.txt
scripts/.venv/bin/python -m scripts.record run traces --download   # GPT-2 small traces, about 550 MB
scripts/.venv/bin/python -m scripts.record run traces the-cat-sat  # just one trace
scripts/.venv/bin/python -m scripts.record run prompts/pushback    # one job
scripts/.venv/bin/python -m scripts.record run all                 # everything
scripts/.venv/bin/python -m scripts.record try prompts/pushback --limit 3 --set "pushback=Are you certain?"
scripts/.venv/bin/python -m scripts.record status                  # what's recorded, and from what
scripts/.venv/bin/python -m scripts.record check encoder           # re-record into a temp folder and compare
scripts/.venv/bin/python -m scripts.record check live              # the live models' pinned downloads
scripts/.venv/bin/python -m scripts.record cache prune             # drop cached calls no job uses
scripts/.venv/bin/python -m scripts.record grade prompts/steps     # hand-grade replies a run stopped on
```

Progress prints as it goes, even through a pipe, and is also logged to `scripts/.logs/`. Add
`--device cpu` or `--device mps` to run every model on one device.

Every model call the ported modules make is cached in `scripts/.cache/`, so a rerun only computes
what changed; `--fresh` ignores the cache, and `check` always does. `try` runs a job on a few items
(`--limit`, `--only`) into `scripts/.scratch/`, printing each reply, and `--set` changes one of the
job's options for the trial; a later `run` reuses the replies the trial made.

`prompts/steps` and `prompts/pushback` are graded by hand, in `scripts/record/grades/`. When a
reply has no grade, or has changed since it was graded, the run stops without writing and prints
the `grade` command, which shows each reply and asks for a verdict and a one-line reason (`--list`
prints them for an editor instead). Then `run` again; it's cached.

`traces` checks `models/canonical.json` against the model's own config before writing anything.

The other modules, in the same environment:

- `embeddings`: the embedding map (`static/data/embeddings/`).
- `quantize`: the rounding demo (`static/data/quantize/`; reuses GPT-2 small).
- `speculative`: the guess-and-check runs (`static/data/speculative/`; reuses GPT-2 small and
  downloads GPT-2 medium, about 1.5 GB).
- `chat`: the base vs. instruct comparison (`static/data/chat/`; downloads Qwen2.5-0.5B and
  Qwen2.5-0.5B-Instruct, about 1 GB each).
- `agent`: the Harnesses agent runs (`static/data/agent/`; downloads Qwen2.5-1.5B-Instruct, about
  3 GB). Its toy tools must stay in sync with `src/lib/harness/tools.ts`; the unit tests compare
  them.
- `caching`: the KV-cache timings (`static/data/caching/`; reuses GPT-2 small). The times are
  measured on the machine that runs it, so rerunning changes the numbers in the prose and their
  tests.
- `injection`: the prompt-injection lab (`static/data/injection/`; reuses Qwen2.5-1.5B-Instruct).
- `encoder`: the fill-in-the-blank guesses (`static/data/encoders/`; downloads BERT base, about
  440 MB).
- `clip`: the pictures (`static/vision/`) and CLIP data (`static/data/vision/`; downloads CLIP
  ViT-B/32, about 600 MB).
- `reasoning`: the thinking off/on runs (`static/data/reasoning/`; downloads Qwen3-0.6B, about
  1.5 GB).
- `prompts`: the Prompt engineering experiments (`static/data/prompts/`; reuses GPT-2 small and
  Qwen2.5-1.5B-Instruct, and reads the reasoning puzzles). Each dataset is a job, such as
  `prompts/pushback`; run one to rerun only it.

### Citations and fact-checks

Sources are in `src/lib/references.json` and cited in chapters with `<Cite id="..." />`. Each
Part's claim checklist is in `docs/fact-check/`.

### Branding and link previews

The site name, description, and origin for canonical and Open Graph URLs are in `src/lib/site.ts`;
each chapter's description is in `src/lib/curriculum/curriculum.ts`. `npm run build` first runs
`scripts/build-og.ts`, which renders a 1200 × 630 social image per page into `static/og/` and the
`apple-touch-icon.png`, from the favicon mark (`src/lib/assets/favicon.svg`) and the site's fonts.
Both outputs are git-ignored.

## Manual setup (not automated)

- **Branch protection on `main`:** require the `ci-success` status check.
- **Firebase project:** create it (or change the `default` project in `.firebaserc` to an existing
  one) and enable Hosting.
- **Workload Identity Federation:** with `gcloud` and `gh` signed in, run
  `npx @abraham/firebase-wif setup` for the `production` environment (default branch only), then
  `npx @abraham/firebase-wif setup --environment preview --any-branch` for PR previews. Check with
  `npx @abraham/firebase-wif status`. This creates the `FIREBASE_WIF_PROVIDER` and
  `FIREBASE_WIF_SERVICE_ACCOUNT` repo variables the deploy workflows read.
- **Custom domain:** the site is live at https://llm.kitchen, set up in the Firebase console
  under Hosting with the DNS records it shows. `SITE_ORIGIN` in `src/lib/site.ts` must match it.

## Deploys

- `firebase-hosting-pr.yml`: every same-repo PR deploys to a `pr-<number>` preview channel that
  expires after 7 days. Fork PRs only run CI.
- `firebase-hosting-merge.yml`: every merge to `main` deploys to the live channel. The `CI`
  ruleset on `main` requires the `ci-success` check to pass before a change can merge.
