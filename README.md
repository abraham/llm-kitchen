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
