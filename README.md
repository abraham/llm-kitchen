# llm-kitchen

A static site that teaches how a large language model works, from "guess the next word" to the
harness that turns a model into an agent. See [docs/PLAN.md](docs/PLAN.md) for the full plan.

## Development

Requires Node 24 (see `.nvmrc`).

```sh
npm install
npm start.             # dev server
npm run build          # static build in build/
npm run preview        # serve the build on :4173
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

Chapters live in `src/lib/chapters/NN-slug.svx` and are registered in
`src/lib/chapters/meta.ts`. `.svx` files are not formatted by Prettier.

### Recorded traces

The site ships pre-computed runs of GPT-2 small in `static/traces/`. To regenerate them (downloads
the model, about 550 MB, on first run):

```sh
python3 -m venv scripts/.venv
scripts/.venv/bin/pip install -r scripts/requirements.txt
scripts/.venv/bin/python scripts/build-traces.py
```

The script checks `models/canonical.json` against the model's own config before writing anything.

Other recorded data has its own script in the same environment:

- `scripts/build-embeddings.py`: the Ch 5 embedding map (`static/embeddings/`).
- `scripts/build-chat.py`: the Ch 13 base vs. instruct comparison (`static/chat/`; downloads
  Qwen2.5-0.5B and Qwen2.5-0.5B-Instruct, about 1 GB each).
- `scripts/build-agent-traces.py`: the Part VI agent runs (`static/agent/`; downloads
  Qwen2.5-1.5B-Instruct, about 3 GB). Its toy tools must stay in sync with
  `src/lib/harness/tools.ts`; the unit tests compare them.
- `scripts/build-encoder.py`: the Ch 20 fill-in-the-blank guesses (`static/encoders/`; downloads
  BERT base, about 440 MB).
- `scripts/build-clip.py`: the Ch 23 pictures and CLIP data (`static/vision/`; downloads CLIP
  ViT-B/32, about 600 MB).
- `scripts/build-reasoning.py`: the Ch 25 thinking off/on runs (`static/reasoning/`; downloads
  Qwen3-0.6B, about 1.5 GB).
- `scripts/build-prompts.py`: the Part VIII prompt experiments (`static/prompts/`; reuses GPT-2
  small and Qwen2.5-1.5B-Instruct, and reads the Ch 25 puzzles from `static/reasoning/`). Pass job
  names (`wording`, `fewshot`, `system`, `steps`, `fragile`) to rerun only some.

### Citations and fact-checks

Sources are in `src/lib/references.json` and cited in chapters with `<Cite id="..." />`. Each
Part's claim checklist is in `docs/fact-check/`.

## Manual setup (not automated)

- **Branch protection on `main`:** require the `ci-success` status check.
- **Firebase project:** create it (or change the `default` project in `.firebaserc` to an existing
  one) and enable Hosting.
- **Workload Identity Federation:** with `gcloud` and `gh` signed in, run
  `npx @abraham/firebase-wif setup` for the `production` environment (default branch only), then
  `npx @abraham/firebase-wif setup --environment preview --any-branch` for PR previews. Check with
  `npx @abraham/firebase-wif status`. This creates the `FIREBASE_WIF_PROVIDER` and
  `FIREBASE_WIF_SERVICE_ACCOUNT` repo variables the deploy workflows read.
- **Custom domain (optional):** add it in the Firebase console under Hosting, then create the DNS
  records it shows.

## Deploys

- `firebase-hosting-pr.yml`: every same-repo PR deploys to a `pr-<number>` preview channel that
  expires after 7 days. Fork PRs only run CI.
- `firebase-hosting-merge.yml`: after CI passes on `main`, deploys the same commit to the live
  channel.
