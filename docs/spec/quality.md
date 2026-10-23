# Quality

## Checks

Every check is an `npm run` script, so CI and local runs match:

| Script         | Command                                                | Fails when                                                                 |
| -------------- | ------------------------------------------------------ | -------------------------------------------------------------------------- |
| `format:check` | `prettier --check .`                                   | A file isn't Prettier-formatted (`npm run format` fixes it).               |
| `lint`         | `eslint .`                                             | Any lint error.                                                            |
| `check`        | `svelte-kit sync && svelte-check --fail-on-warnings`   | Type errors or Svelte warnings, including a11y warnings.                   |
| `test`         | `vitest run`                                           | A unit test fails.                                                         |
| `build`        | `node scripts/build-og.ts && vite build`               | Prerendering fails, e.g. a broken internal link or a chapter that throws.  |
| `test:e2e`     | `playwright test` (Chromium) against `vite preview`    | A page or widget test fails, or an accessibility, layout, or budget check. |
| `test:visual`  | `playwright test --config playwright.visual.config.ts` | Local only: a screenshot differs from its baseline.                        |

svelte-check doesn't type-check `.svx` files, so a chapter error may only show up in `build`.

## CI

`.github/workflows/ci.yml` runs on every push to `main` and every pull request, including forks:

- **Format, lint, type check, unit tests** in one fast job.
- **Build and Playwright** in a second job, which uploads the Playwright report on failure.
- **`ci-success`** `needs` every other job and runs with `if: always()`. It fails if any of them
  failed, was cancelled, or was skipped. It is the only required check on `main`, so jobs can be
  added, renamed, or split without changing branch protection; new jobs must be added to its
  `needs`.
- Node comes from `.nvmrc`. Dependencies install with `npm ci` and the npm cache; Playwright browsers
  are cached by version.
- Workflows default to `permissions: contents: read`, pin actions to full versions (locked in
  `.github/workflows/actions.lock` by `gh actions-lock`; Dependabot proposes updates), and cancel
  superseded runs on the same branch with `concurrency`.

`.github/workflows/links.yml` checks external links weekly (`lychee.toml`) and opens an issue on
failure.

## Tests

- **Unit (`tests/unit/`, plus `*.test.ts` next to the code):** math and data logic; that each Part's
  widgets produce the numbers its prose states (`part-N-facts`); GPT-2 numbers against
  `models/canonical.json` (`consistency`); citations; the curriculum and spec layout (`curriculum`);
  social images and descriptions (`branding`); hosting headers (`hosting`); color contrast
  (`tokens`); and recorded trace format (`traces`).
- **E2E (`tests/e2e/`):** each Part's widgets (`part-N`), stepping and keyboard (`interaction`),
  themes (`design`), page metadata (`branding`), and on every page (`quality`):
  - no axe violations, in light and dark;
  - no sideways scrolling at phone width;
  - a JavaScript budget of 150 KB gzipped, or 350 KB on the two pages that load the GPT-2
    tokenizer.
- **Visual (`tests/visual/`):** full-page screenshots, run locally only because baselines differ by
  operating system.

## Accessibility

- Everything is keyboard-navigable; stepped figures respond to ← and →.
- Every animation has a text description and a step-through mode, and respects reduced motion (see
  [design.md](design.md)).
- No interaction depends on hover.
- Text-on-color pairs pass WCAG AA in both themes.

## Performance

- The JavaScript budget above is enforced in CI.
- Lighthouse (local, simulated mobile) performance and accessibility are at least 95 on chapter pages
  without a live model.
- Model downloads happen only after consent, in a worker.
