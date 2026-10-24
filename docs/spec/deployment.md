# Deployment

## Hosting

- **Firebase Hosting** serves `build/` (project alias in `.firebaserc`) at https://llm.kitchen, a
  custom domain set up in the Firebase console. `SITE_ORIGIN` in `src/lib/site.ts` matches it.
- `cleanUrls` with no trailing slash, so a chapter's URL is `/<slug>`. Unknown paths get
  `404.html`.

## Deploys

- **Live:** every merge to `main` builds the site and deploys it to the live channel
  (`firebase-hosting-merge.yml`), from the `production` GitHub environment, which only the default
  branch can use.
- **Pull request previews:** every pull request deploys to its own preview channel (e.g. `pr-42`)
  from the `preview` environment (`firebase-hosting-pr.yml`). The action comments the preview URL on
  the PR and updates it on each push. Channels expire after 7 days.
- **Fork pull requests** can't get OIDC tokens, so the deploy is skipped
  (`if: github.event.pull_request.head.repo.full_name == github.repository`). They still build and
  test in CI; a maintainer can push the branch to the repo if a preview is needed.
- Social images point at `SITE_ORIGIN`, so on a preview the card's text is checkable but its image
  resolves only once the change is live.

## Authentication

- No service account keys or `FIREBASE_TOKEN`. Each deploy job has `id-token: write` and runs
  `abraham/firebase-wif`, which exchanges the job's GitHub OIDC token for short-lived Google
  credentials. Its `credentials_json` and `project_id` outputs feed
  `FirebaseExtended/action-hosting-deploy`.
- The action downloads `firebase-tools` itself, `latest` by default. The deploy jobs pass
  `firebaseToolsVersion` set to the version in `package-lock.json`, so the code that runs with
  production credentials is pinned and updated by Dependabot like any other dependency.
- **Setup:** `npx @abraham/firebase-wif setup` creates the workload identity pool and provider
  (trusting only this repo), a Hosting-only deploy service account, the `FIREBASE_WIF_PROVIDER` and
  `FIREBASE_WIF_SERVICE_ACCOUNT` repo variables, and the `production` environment. Run it again with
  `--environment preview --any-branch` for previews. `npx @abraham/firebase-wif status` checks the
  setup.

## Headers

Set in `firebase.json`. What they defend against, and the rules around them, are in
[security.md](security.md). `tests/unit/hosting.test.ts` checks the config, and `tests/e2e/hosting.e2e.ts`
checks what is actually served: the e2e suite runs against the Firebase Hosting emulator
(`npm run serve`, project `demo-llm-kitchen`, port 4173), which applies `firebase.json` like
production. `firebase-tools` is a dev dependency; its `superstatic` is overridden to 11, the first
major that supports Node 26.

- **Content Security Policy:** SvelteKit emits the page CSP (`csp` in `vite.config.ts`, hash mode, so
  its inline scripts need no `'unsafe-inline'`): `default-src 'self'`, scripts `'self'` plus
  `'wasm-unsafe-eval'` for ONNX Runtime, styles `'self'` plus `'unsafe-inline'` for Svelte's style
  attributes, workers `'self'` and `blob:`, and `connect-src 'self'`.
  `firebase.json` adds the header-only `frame-ancestors 'none'` and a `connect-src` that also allows
  Hugging Face. Browsers enforce both policies on a page, so the page itself can only fetch from
  `'self'`; model downloads work because they run in the inference worker, whose script is loaded
  from a URL and gets only the header's policy. Workers under `/_app/immutable/workers/` get a
  complete header policy of their own (see [security.md](security.md#in-the-browser)).
- `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, a
  `Permissions-Policy` that turns off camera, microphone, geolocation, payment, and USB, and
  `Cross-Origin-Opener-Policy: same-origin`.

## Caching

- Hashed assets under `/_app/immutable/`, including the self-hosted fonts:
  `public, max-age=31536000, immutable`.
- Everything else, including HTML and recorded JSON: `public, max-age=300, must-revalidate`, so
  updates show up within minutes.
