# Real-backend contract tests

These specs close a gap in the primary e2e smoke suite (`tests/e2e/`):
that suite is mock-only by design (see `playwright.config.ts` and
`tests/e2e/README.md`) and never actually proves the app works against a
live `mux-backend`.

## The failure mode this closes

Running the existing specs against a real backend (e.g. by pointing
`playwright.config.ts` at a staging `NEXT_PUBLIC_API_URL` instead of
forcing it to `""`) fails or gives false confidence in two ways:

1. **`tests/e2e/login.spec.ts`** — the "signs in successfully" test fills
   in `dev@muxprotocol.com` / `password123`. The mock
   `/api/auth/login` route (`src/app/api/auth/login/route.ts`) accepts
   *any* well-formed credentials in its mock-fallback branch, so this
   always passes against the mock. A real backend would reject those
   credentials as invalid (they're not a real account), so the same
   assertion fails there — or, if the operator happens to have a seeded
   account with those exact literal credentials, the test is silently
   asserting nothing about the real auth contract.

2. **`tests/e2e/wallets.spec.ts`** — the "shows the error state" test
   asserts the wallets page *fails to load* specifically because the mock
   route (`src/app/api/wallets/route.ts`) requires the hardcoded bearer
   token `mock-access-token`, which the client never sends. Against a
   real backend, a correctly authenticated session *should* succeed —
   that assertion is backwards there. Every other data state in that spec
   (`empty`, `populated`, `add wallet modal`) is driven by
   `page.route("**/api/wallets", ...)` stubs, so it never exercises the
   real response shape or auth contract either.

Both gaps trace back to the production wiring already present in
`src/app/api/auth/login/route.ts`, `src/app/api/wallets/route.ts`, and
`src/lib/api/config.ts` (`getApiBaseUrl`, `isMockFallbackAllowed`) — the
app *can* talk to a real backend and correctly refuses to silently fall
back to mock data in a production build. It's the e2e suite that never
tests that path.

## What's here

| Spec | Covers |
| --- | --- |
| `login.spec.ts` | Real backend rejects invalid credentials (no redirect, no mock success); real backend accepts real credentials and redirects to `/dashboard` |
| `wallets.spec.ts` | Wallets dashboard loads for a real, correctly authenticated session (no mock-bearer-token error state); network switcher re-scopes the real request |

Neither spec stubs `/api/auth/login` or `/api/wallets` with
`page.route(...)`, and neither asserts against the mock's hardcoded
credentials, bearer token, or fixture wallet IDs
(`src/mock-data/wallets.ts`) — that's what makes them a contract test
against the real backend rather than a copy of the mock suite.

## Running

Requires a live `mux-backend` (or staging deployment) and a real test
account. Nothing here runs as part of the default `pnpm run test:e2e` —
it uses its own config, `playwright.real-backend.config.ts`, at the repo
root:

```bash
NEXT_PUBLIC_API_URL=https://staging-api.muxprotocol.com \
E2E_TEST_EMAIL=qa@muxprotocol.com \
E2E_TEST_PASSWORD='...' \
pnpm exec playwright test --config=playwright.real-backend.config.ts
```

Or against an already-deployed preview frontend instead of a local
`next dev`:

```bash
PLAYWRIGHT_BASE_URL=https://staging.muxprotocol.com \
NEXT_PUBLIC_API_URL=https://staging-api.muxprotocol.com \
E2E_TEST_EMAIL=qa@muxprotocol.com \
E2E_TEST_PASSWORD='...' \
pnpm exec playwright test --config=playwright.real-backend.config.ts
```

If `NEXT_PUBLIC_API_URL`, `E2E_TEST_EMAIL`, or `E2E_TEST_PASSWORD` are
missing, every test in this directory calls `test.skip(...)` with an
explanation instead of running — see `helpers.ts`. This is intentional:
skipping (not silently passing against the mock) is the correct behavior
when the suite isn't actually configured to talk to a real backend.

See `../../../docs/e2e-real-backend-testing.md` for the full write-up,
including the env vars and the security constraints around test
credentials.

## Security

- `E2E_TEST_EMAIL` / `E2E_TEST_PASSWORD` should be a low-privilege,
  non-custodial QA account provisioned specifically for this suite —
  never a real operator's credentials — and should be injected via CI
  secrets, never committed.
- As with the rest of the app, no custody secret (`MUX_API_KEY`,
  `MUX_API_SECRET`, or a session token) is ever read from a
  `NEXT_PUBLIC_*` variable or written to `localStorage` by these tests or
  the app they exercise — the session lives only in the HttpOnly
  `mux_auth_token` cookie set server-side by `/api/auth/login` (see
  `docs/auth-local-setup.md`).
