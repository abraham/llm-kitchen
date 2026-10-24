# Quality

## Checks

Every check is an `npm run` script, so CI and local runs match:

| Script            | Command                                                            | Fails when                                                                          |
| ----------------- | ------------------------------------------------------------------ | ----------------------------------------------------------------------------------- |
| `format:check`    | `prettier --check .`                                               | A file isn't Prettier-formatted (`npm run format` fixes it).                        |
| `lint`            | `eslint .`                                                         | Any lint error.                                                                     |
| `check`           | `svelte-kit sync && svelte-check --fail-on-warnings`               | Type errors or Svelte warnings, including a11y warnings.                            |
| `test`            | `vitest run`                                                       | A unit test fails.                                                                  |
| `build`           | `node scripts/build-og.ts && vite build`                           | Prerendering fails, e.g. a broken internal link or a chapter that throws.           |
| `test:e2e`        | `playwright test` (Chromium) against the Firebase Hosting emulator | A page or widget test fails, or an accessibility, layout, budget, or hosting check. |
| `test:lighthouse` | `playwright test --config playwright.lighthouse.config.ts`         | A page scores under 95 for Lighthouse performance or accessibility.                 |
| `test:visual`     | `playwright test --config playwright.visual.config.ts`             | Local only: a screenshot differs from its baseline.                                 |

svelte-check doesn't type-check `.svx` files, so a chapter error may only show up in `build`.

## CI

`.github/workflows/ci.yml` runs on every push to `main` and every pull request, including forks:

- **Format, lint, type check, audits, unit tests** in one fast job. The audits are zizmor on the
  workflows and, on pull requests in a public repository, dependency review (see
  [security.md](security.md)).
- **Build and Playwright**, split across 3 parallel jobs with Playwright's `--shard`, each uploading
  its report on failure. Tests are independent (`fullyParallel`), so a shard can take any of them.
  The build sets `VITE_FIXTURES` to add the test-only pages in `tests/e2e/fixtures`; a local
  `playwright test` builds the same way.
- **Lighthouse**, split across 4 parallel jobs the same way, each uploading its failing pages'
  Lighthouse reports. Within a job, pages still run one at a time.
- **`ci-success`** `needs` every other job and runs with `if: always()`. It fails if any of them
  failed, was cancelled, or was skipped. It is the only required check on `main`, so jobs can be
  added, renamed, or split without changing branch protection; new jobs must be added to its
  `needs`.
- Node comes from `.nvmrc`. Dependencies install with `npm ci` and the npm cache; Playwright browsers
  are cached by version. Chromium runs on the libraries already in the runner image; installing
  them with apt (`--with-deps`) took up to 5 minutes when a mirror was slow.
- Workflows default to `permissions: contents: read`, pin actions to full versions (locked in
  `.github/workflows/actions.lock` by `gh actions-lock`; Dependabot proposes updates), and cancel
  superseded runs on the same branch with `concurrency`.

`.github/workflows/links.yml` checks every cited source and documentation link (`lychee.toml`)
weekly and on pull requests that touch them. It isn't part of `ci-success`, so an outside site being
down never blocks a merge; a failure shows up as a failed run.

## Tests

- **Unit (`*.test.ts` next to the code, plus `tests/unit/`):** math, harness, model, and curriculum
  logic; that each chapter's widgets and data produce the numbers its prose states (its
  `facts.test.ts`); every recorded dataset against its parser (`datasets`); GPT-2 numbers against
  `models/canonical.json` (`consistency`, `canonical`); citations; the curriculum, spec layout, and
  derived chapter numbers (`curriculum`); chapter markup (`chapter-markup`); social images and
  descriptions (`branding`); the hosting config (`hosting`); and color contrast (`tokens`).
- **E2E (each chapter's `chapter.e2e.ts`, plus `tests/e2e/`):** each chapter's widgets, the menu and
  a 404 (`smoke`), stepping and keyboard (`interaction`), themes (`design`), explanation levels on
  a fixture page (`levels`), page metadata
  (`branding`), what Firebase Hosting serves (`hosting`: clean URLs, the 404 page, headers, and
  caching), and on every page (`quality`):
  - no axe violations, in light and dark, once the widgets have loaded;
  - no requests to another origin, so nothing downloads before consent;
  - recorded data in the prerendered HTML, so no widget says "Loading" before JavaScript runs;
  - no sideways scrolling at phone width;
  - a JavaScript budget of 150 KB gzipped, or 350 KB on the two pages that load the GPT-2
    tokenizer.
- **Visual (`tests/visual/`):** full-page screenshots, run locally only because baselines differ by
  operating system.

## Browser support

The site supports the two most recent major versions of Chrome, Edge, Firefox, and Safari, on
desktop and mobile (Safari on macOS, iOS, and iPadOS). Bugs in older versions aren't fixed, and
code needn't carry workarounds for them. The recorded tier is plain HTML, CSS, and a little
JavaScript, so it usually still works there; the live models may not. Automated tests run in
Chromium only.

## Accessibility

- Everything is keyboard-navigable; stepped figures respond to ← and →.
- Every animation has a text description and a step-through mode, and respects reduced motion (see
  [design.md](design.md)).
- No interaction depends on hover.
- Text-on-color pairs pass WCAG AA in both themes.

## Performance

- The JavaScript budget above is enforced in CI.
- Lighthouse (simulated mobile) performance and accessibility are at least 95 on every page
  (`tests/lighthouse/`, against the Firebase Hosting emulator, one page at a time). No page loads a
  live model without consent, so every page is measured as a visitor first sees it.
- Model downloads happen only after consent, in a worker.
