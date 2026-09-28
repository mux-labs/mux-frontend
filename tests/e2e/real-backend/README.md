# Real-backend Playwright E2E

End-to-end tests that run the Mux frontend against a **real backend**
(real Soroban RPC / Horizon / wallet stack) instead of the mocked
fixtures used by the default `tests/e2e/` suite.

These specs are the last line of defence for the money path: login,
wallet creation, and payment flows. They must fail closed — if the
required environment is not present, the run aborts instead of silently
falling back to mocks.

## Layout

| Path | Purpose |
| --- | --- |
| `playwright.real-backend.config.ts` | Playwright config for the real-backend project. |
| `tests/e2e-real-backend.config.test.ts` | CI guard that asserts the config invariants below. |
| `tests/e2e/real-backend/helpers.ts` | Shared env parsing, auth, and navigation helpers. |
| `tests/e2e/real-backend/login.spec.ts` | Login / session critical path. |
| `tests/e2e/real-backend/wallets.spec.ts` | Wallet creation and balance critical path. |

## Required environment variables

The config is **fail-closed**: it refuses to load if any required variable
is missing, naming the variable but never its value. No secret values are
ever committed to the repo — they are injected by CI or the operator's
shell. The canonical table and the full secrets policy live in
[`docs/e2e-real-backend-testing.md`](../../../docs/e2e-real-backend-testing.md#secrets-handling).

| Variable | Required | Description |
| --- | --- | --- |
| `NEXT_PUBLIC_API_URL` | yes | Absolute `http(s)` URL of the real mux-backend (testnet). |
| `E2E_TEST_EMAIL` | yes | Dedicated low-privilege QA account login. |
| `E2E_TEST_PASSWORD` | yes | QA account password. **Secret** — never logged, never `NEXT_PUBLIC_*`. |
| `PLAYWRIGHT_BASE_URL` | no | Test an already-deployed frontend instead of starting `next dev`. |
| `E2E_REAL_BACKEND_ALLOW_MISSING_API_URL` | no | `1` lets the config load without the vars above (listing specs only). |

## Invariants

1. **Fail closed.** Missing env vars abort the run before any browser is
   launched; a malformed API URL makes the specs skip. There is no mock
   fallback.
2. **No secrets in artifacts.** Traces are disabled for this config because
   they record typed passwords and request bodies verbatim; screenshots and
   videos only show the masked field. Helpers redact tokens in logs.
3. **Stable selectors.** Specs use `data-testid` selectors only; no
   text or CSS-structure coupling.
4. **Idempotent setup.** Helpers tolerate re-runs and replayed requests
   without creating duplicate wallets or sessions.
5. **Network guard.** Only ever point `NEXT_PUBLIC_API_URL` at testnet
   unless a mainnet readiness checklist has been signed off.

## Running locally

```bash
export NEXT_PUBLIC_API_URL="https://testnet-api.example.test"
export E2E_TEST_EMAIL="wave-contributor@example.test"
read -rs E2E_TEST_PASSWORD && export E2E_TEST_PASSWORD  # keeps it out of shell history

pnpm exec playwright test --config=playwright.real-backend.config.ts
```

To run a single spec:

```bash
pnpm exec playwright test --config=playwright.real-backend.config.ts \
  tests/e2e/real-backend/login.spec.ts
```

## Runbook (Stellar Wave contributors)

1. Confirm you have access to the testnet deployment and the test
   account credentials (ask in the Wave channel; never paste secrets in
   issues or PRs).
2. Export the variables above in your shell. Do **not** commit a
   `.env` file.
3. Run the config guard first:
   `pnpm exec vitest run tests/e2e-real-backend.config.test.ts`.
   It must pass before you run the browser suite.
4. Run the real-backend suite. If it aborts with a missing-env error,
   fix your environment — do not weaken the config.
5. On failure, attach the Playwright HTML report (secrets are redacted)
   to the PR and link the failing spec.
6. For mainnet-affecting changes, land behind a feature flag and
   document the rollback in the PR description.

## CI

The real-backend suite is gated: it only runs when the required secrets
are configured for the workflow. The config guard
(`tests/e2e-real-backend.config.test.ts`) always runs and is a required
check, so a broken config fails CI even when the live suite is skipped.

## Related docs

- `docs/e2e-real-backend-testing.md` — full setup and design notes.
- `docs/security-ux-guards.md` — authz and UX guardrails.
- `README.md` — project overview.
