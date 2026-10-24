# Security

What the site exposes, what it defends against, and the rules that keep it that way. Rules already
specified elsewhere are linked, not repeated.

## Attack surface

The site is static files on Firebase Hosting. It has, and keeps having:

- **No accounts, cookies, forms, server code, or analytics.** Nothing a visitor types leaves their
  browser.
- **Three stored values,** all in `localStorage`, and all ignored unless they're well formed:
  - the chapters a visitor has opened, under `llm-kitchen:visited` (`stores/progress.svelte.ts`),
    keeping only strings that are chapter slugs;
  - the theme chosen in the app bar, under `llm-kitchen:theme` (`stores/theme.svelte.ts` and the
    inline script in `app.html`), used only if it's `light` or `dark`; choosing Auto removes it;
  - the explanation level chosen in the app bar, under `llm-kitchen:level`
    (`stores/level.svelte.ts` and the same inline script), used only if it's `simple` or `deep`;
    choosing Standard removes it.
- **One outside origin:** Hugging Face, for model files, fetched only by the inference worker and
  only after the visitor agrees to the download (see
  [models-and-data.md](models-and-data.md#live-model-rules)).
- **One set of credentials:** short-lived Google credentials that the deploy jobs get through GitHub
  OIDC (see [deployment.md](deployment.md#authentication)). No long-lived secret exists.

A change that adds to this list (a form, a second origin, an API key, an analytics script) updates
this spec in the same pull request. The rules for bring-your-own API keys are in
[roadmap.md](roadmap.md) until that feature is built.

## Threats

| Threat                                                         | Defense                                                                                                                              |
| -------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| Script injected through a dataset, a citation, or model output | Svelte escapes all text; no raw HTML; datasets are checked; CSP allows only the site's own scripts                                   |
| The site framed by another page (clickjacking)                 | `frame-ancestors 'none'`                                                                                                             |
| A model file changed or swapped on Hugging Face                | Downloads pin a commit, and each file must match its recorded SHA-256                                                                |
| A compromised npm package or GitHub Action                     | Lockfile installs, no install scripts, three runtime dependencies, actions locked to commits, deploy credentials only in deploy jobs |
| A pull request that tries to deploy or read credentials        | Fork pull requests get no OIDC token; `production` deploys only from `main`                                                          |
| A fork pull request that runs code in CI                       | `pull_request` only, with a read-only token and no secrets; first-time contributors need approval to run workflows                   |
| A model given real power by a harness demo                     | Demos expose only in-browser toy tools; no network, file system, or `eval` access                                                    |
| A downgrade to HTTP                                            | HSTS for two years, including subdomains                                                                                             |

Anyone with write access to the repository can push a branch whose pull request runs a modified
workflow with the `preview` environment's credentials, which can deploy to Hosting. Write access is
the trust boundary, so it stays limited to maintainers.

## Rules

### In the browser

- **No raw HTML.** No `{@html}`, `innerHTML`, `outerHTML`, `insertAdjacentHTML`, `document.write`,
  `eval`, `new Function`, or string `setTimeout` in `src/`. Model output, recorded text, and anything
  the visitor types render as Svelte text, which is escaped.
- **Content Security Policy** as in [deployment.md](deployment.md#headers): hashed inline scripts,
  scripts from `'self'` plus `'wasm-unsafe-eval'` for ONNX Runtime, `object-src 'none'`,
  `base-uri 'self'`, `form-action 'self'`, `connect-src 'self'` on pages, and
  `frame-ancestors 'none'`.
- **Workers get a complete policy.** A worker gets only its response's header policy, not the page's.
  `firebase.json` sends workers under `/_app/immutable/workers/` `default-src 'self'`,
  `script-src 'self' 'wasm-unsafe-eval' blob:` (ONNX Runtime imports its loader from a `blob:` URL
  it makes from the site's own file), the Hugging Face `connect-src`, `object-src 'none'`,
  `base-uri 'self'`, and `frame-ancestors 'none'`. Pages keep a header without `script-src`, since
  one without SvelteKit's hashes would block their inline scripts.
- **HSTS for two years.** `firebase.json` sends
  `Strict-Transport-Security: max-age=63072000; includeSubDomains`, which Hosting serves on the
  custom domain (it overrides HSTS only on `*.web.app`). Every subdomain in use (`www`) is on
  Hosting and HTTPS. No `preload`: leaving the preload list takes months, and the domain may host
  other things.
- **Live headers are checked after each deploy.** The live deploy job runs
  `scripts/check-live-headers.ts`, which fails if `https://llm.kitchen` or its inference worker
  serves a configured header with a different value, since the emulator can't show what Hosting's
  CDN adds or overrides.
- **Every dataset is checked** before use: its envelope (id, version, recording script, model
  revisions) and its data, by the parser `registry.ts` names (see
  [architecture.md](architecture.md#data)). Invalid data throws and the widget shows the error; it
  never renders unchecked.
- **External links** come only from `references.json`, must be `https://` (`citations.test.ts`), and
  open with `rel="noopener noreferrer"`.
- **Workers** take typed messages from the page only. The inference worker downloads only the model
  and commit its message names, and those come from `canonical.json` and `embedder.json`, never
  from anything the visitor types.
- The other headers (`nosniff`, `Referrer-Policy`, `Permissions-Policy`, `Cross-Origin-Opener-Policy`)
  are listed in [deployment.md](deployment.md#headers).

### Models

- Model files download only in the inference worker, after consent, from a pinned Hugging Face
  commit (`onnxRevision`), with `env.allowLocalModels = false`.
- **Model files are checked by hash.** `models/canonical.json` and `models/embedder.json` list each
  file Transformers.js downloads with its SHA-256 (`onnxFiles`). The worker's `env.fetch`
  (`workers/verified-fetch.ts`) refuses any other file from Hugging Face, fetches a pinned model at
  its pinned commit whatever revision is asked for (`pipeline()` reads `config.json` from `main`,
  ignoring `revision`), and hashes each file as it streams with `@noble/hashes`, so progress still
  shows. A mismatch errors the download before Transformers.js uses or caches it. Files a browser
  cached before these checks existed aren't rechecked.
- `scripts.record check live` downloads each listed file and checks its hash and the total size.
- ONNX Runtime's JavaScript and WebAssembly are bundled with the site, never loaded from a CDN.
- Recording scripts load models with `from_pretrained` only: never `trust_remote_code=True`,
  `pickle`, or `torch.load`, so a model repository can't run code on the recording machine. Their
  Python packages are pinned exactly in `scripts/requirements.txt`.

### Dependencies

- CI and deploys install with `npm ci` from the lockfile; `.npmrc` sets `engine-strict`.
- **No install scripts.** `.npmrc` sets `ignore-scripts=true`, so no package runs code when it's
  installed. Three have install scripts today, and nothing needs them: `onnxruntime-node` (pulled in
  by Transformers.js, never run by the site), `protobufjs` (a version notice), and `re2` (a native
  module superstatic can do without). The root `prepare` script (`svelte-kit sync`) is skipped too;
  `check`, `build`, and the dev server sync on their own.
- The site ships three runtime dependencies (`@huggingface/transformers`, `gpt-tokenizer`, and
  `@noble/hashes` for hashing model files as they stream) plus the Svelte and SvelteKit runtime. A
  new runtime dependency needs a reason in its pull request.
- Dependabot proposes npm and GitHub Actions updates weekly (`.github/dependabot.yml`), once a
  release is 7 days old (`cooldown`), so a hijacked release is usually caught and pulled before it
  reaches the lockfile. Security updates aren't held back.
- On pull requests, the `checks` job runs `actions/dependency-review-action`, which fails when the
  pull request adds a dependency (npm or GitHub Actions) with a known vulnerability of high severity
  or higher. The step is skipped while the repository is private, where it would need GitHub
  Advanced Security.

### CI and deploys

- Every workflow defaults to `permissions: contents: read`; only deploy jobs add `id-token: write`,
  and the preview job `pull-requests: write` and `checks: write` for its comment.
- Actions are locked to commits in `.github/workflows/actions.lock` (see
  [quality.md](quality.md#ci)).
- Every `actions/checkout` sets `persist-credentials: false`, so later steps can't read or push with
  the job's token from `.git/config`. No job pushes.
- Deploys authenticate with OIDC, run `firebase-tools` at the lockfile's version, and use the
  `production` environment (default branch only) or `preview` (see
  [deployment.md](deployment.md)).
- No workflow uses `pull_request_target` or `workflow_run`, or puts `${{ github.event.* }}` text
  into a `run:` script.
- The `checks` job runs [zizmor](https://docs.zizmor.sh) (pinned) on `.github/workflows/`, with its
  online audits, and fails on any finding of medium severity or higher. `.github/zizmor.yml` accepts
  tag references, because `actions.lock` locks each tag to a commit.

### Reporting

- `SECURITY.md` asks reporters to use GitHub's private vulnerability reporting, and says what's in
  scope.
- The site doesn't link to the repository, so it serves `/.well-known/security.txt` (RFC 9116, from
  `static/security.txt` through a rewrite in `firebase.json`, since Hosting doesn't deploy dot
  folders). Its `Contact` is the repository's private advisory form and its `Policy` is
  `SECURITY.md`. `Expires` stays under a year away; a unit test fails once it's too far out or has
  passed, as a reminder to move it forward.

### Repository settings

No file holds these, so they're recorded here; `gh api repos/abraham/llm-kitchen` and its
`/rulesets`, `/vulnerability-alerts`, `/automated-security-fixes`,
`/private-vulnerability-reporting`, and `/actions/permissions/fork-pr-contributor-approval`
endpoints show them.

- The `CI` ruleset on the default branch requires `ci-success` and blocks force pushes and deletion,
  with no bypass.
- Dependabot alerts and Dependabot security updates are on.
- Write access stays limited to maintainers (see [Threats](#threats)).

These need a public repository, so they're turned on right after it goes public:

```sh
gh api -X PATCH repos/abraham/llm-kitchen \
  -f 'security_and_analysis[secret_scanning][status]=enabled' \
  -f 'security_and_analysis[secret_scanning_push_protection][status]=enabled'
gh api -X PUT repos/abraham/llm-kitchen/private-vulnerability-reporting
gh api -X PUT repos/abraham/llm-kitchen/actions/permissions/fork-pr-contributor-approval \
  -f approval_policy=first_time_contributors
```

- Secret scanning with push protection.
- Private vulnerability reporting, which `SECURITY.md` and `security.txt` point to.
- Workflow runs from first-time contributors' fork pull requests wait for a maintainer's approval.

Before it goes public, `gitleaks git` scanned the whole history and found no secrets (its only two
findings are SHA-256 hashes in `models/embedder.json`).

## Not done, on purpose

- **Trusted Types.** Svelte builds its templates by assigning `innerHTML` to `<template>` elements,
  which `require-trusted-types-for 'script'` would block without a policy that allows everything.
- **Nonces.** Pages are prerendered once, so a nonce would be the same for every visitor; hashes do
  the same job.
- **Cross-origin isolation (`Cross-Origin-Embedder-Policy`).** Nothing on the site needs it, and it
  would require every Hugging Face response to opt in.
- **`Cross-Origin-Resource-Policy`.** Everything served is public, and social images must load when
  other sites embed them.
- **CSP reporting.** There is no server to receive reports.
- **Subresource Integrity.** Every script and stylesheet is the site's own, with a hashed name.
- **Hashes in `scripts/requirements.txt`.** The recording scripts run on a maintainer's machine,
  never in CI or with deploy credentials, and are pinned exactly; hashes for PyTorch across
  platforms would be large and churn with every update.
- **Gating CI on `npm audit`.** Advisories in dev-only tools would block unrelated pull requests;
  dependency review covers what a pull request adds, and Dependabot alerts cover the rest.

## Checked by tests

- `tests/unit/hosting.test.ts`: the `firebase.json` headers, including `frame-ancestors 'none'`.
- `tests/e2e/hosting.e2e.ts`: the headers the Hosting emulator actually serves on pages and on the
  inference worker, and `security.txt` at its well-known path.
- `tests/unit/citations.test.ts`: every reference URL is `https://`.
- `tests/unit/datasets.test.ts`: every recorded dataset passes its checks.
- `tests/unit/security.test.ts`: `src/` uses no API under [No raw HTML](#in-the-browser), every
  `target="_blank"` link has `rel="noopener noreferrer"`, recording scripts never use
  `trust_remote_code`, `pickle`, or `torch.load`, no workflow uses `pull_request_target` or
  `workflow_run`, every checkout drops its credentials, and `security.txt` hasn't expired.
- `src/lib/workers/verified-fetch.test.ts`: model downloads must be listed files with matching
  hashes, at the pinned commit.
- `src/lib/stores/progress.test.ts`: saved progress keeps only chapter slugs.
