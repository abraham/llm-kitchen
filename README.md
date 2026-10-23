# llm-kitchen

A static site that teaches how a large language model works, from "guess the next word" to the
harness that turns a model into an agent. See [docs/PLAN.md](docs/PLAN.md) for the full plan.

## Development

Requires Node 24 (see `.nvmrc`).

```sh
npm install
npm run dev            # dev server
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

Chapters live in `src/lib/chapters/NN-slug.svx` and are registered in
`src/lib/chapters/meta.ts`. `.svx` files are not formatted by Prettier.

## Manual setup (not automated)

- **Branch protection on `main`:** require the `ci-success` status check.
- **Firebase project:** create it (or change the `default` project in `.firebaserc` to an existing
  one) and enable Hosting.
- **Workload Identity Federation:** with `gcloud` and `gh` signed in, run
  `npx @abraham/firebase-wif setup` for the `production` environment (default branch only), then
  `npx @abraham/firebase-wif setup --environment preview --any-branch` for PR previews. Check with
  `npx @abraham/firebase-wif status`. This creates the `FIREBASE_WIF_PROVIDER` and
  `FIREBASE_WIF_SERVICE_ACCOUNT` repo variables the deploy workflows read.

## Deploys

- `firebase-hosting-pr.yml`: every same-repo PR deploys to a `pr-<number>` preview channel that
  expires after 7 days. Fork PRs only run CI.
- `firebase-hosting-merge.yml`: after CI passes on `main`, deploys the same commit to the live
  channel.
