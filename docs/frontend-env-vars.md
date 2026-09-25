# Frontend environment variables

Reference for every environment variable this Next.js app reads, where it's
validated, and how it affects behavior across local dev, testnet, and
mainnet. The authoritative schema lives in `src/lib/env.ts`; this doc is a
narrative companion to the table in the root `README.md`.

## Quick start

```bash
cp .env.example .env.local
# edit .env.local with real values, then:
pnpm run dev
```

Every variable is optional locally. Leaving `.env.local` empty (or not
creating it at all) still works — `next dev` and `pnpm test` both run
against in-repo mocks (`/api/auth/login`, `/api/wallets`, etc.).

## Variables

### Client-visible (`NEXT_PUBLIC_*`)

These are inlined into the browser bundle at build time. Never put secrets
in a `NEXT_PUBLIC_*` variable.

- **`NEXT_PUBLIC_API_URL`** — canonical backend base URL. Read directly in
  `src/app/api/auth/login/route.ts` to decide whether to proxy to a real
  backend or fall back to the mock login response, and in
  `src/lib/api/config.ts::getApiBaseUrl()` as the **first** candidate for
  all other API calls (e.g. `useWallets`, `GET /api/requests/today`, and
  `POST /api/transactions` for the wallet "Send" flow). **Set this in new
  deploys.**
- **`NEXT_PUBLIC_MUX_API_URL`** — **legacy alias**, checked second in the
  `getApiBaseUrl()` fallback chain (see below). Defaults to
  `https://api.muxprotocol.com` in production when all three aliases are
  unset. Predates `NEXT_PUBLIC_API_URL`; kept for older deploy configs.
- **`NEXT_PUBLIC_API_BASE`** — **legacy alias**, third and final candidate
  in the fallback chain, for deploys that used this older name.

  **API URL resolution chain (#693):** `getApiBaseUrl()` in
  `src/lib/api/config.ts` walks the three aliases above in priority order
  and returns the first *non-empty* value. An alias set to an empty string
  (e.g. `NEXT_PUBLIC_API_URL=`) is treated as unset and the chain
  continues to the next alias. This means a mis-set deploy that blanks the
  primary var still picks up the legacy alias instead of silently falling
  back to mock data. The `API_URL_CANDIDATES` constant exported from
  `config.ts` documents the exact order so tests can verify it without
  reimplementing it. Use `getActiveApiUrlVar()` (also exported from
  `config.ts`) to log which alias is actually in effect at startup.

  **Alias chain invariants (#755):** the chain is *ordered* and
  *fail-closed*. Every documented alias resolves to the same canonical API
  base URL — the first non-empty candidate wins, and the remaining aliases
  are ignored, so two aliases pointing at different hosts never produce a
  split-brain client. When *no* alias is set the chain does **not** silently
  fall back to an unintended host: outside production it returns the empty
  string (routes then use their in-repo mocks), and in production it
  resolves to the documented default `https://api.muxprotocol.com` via
  `getEnv()` (see "Production defaults"). A blank/whitespace-only value is
  treated as unset, never as a valid base URL. These invariants are covered
  end-to-end by `tests/api-client.test.js`, which asserts each alias in
  `API_URL_CANDIDATES` resolves to the same canonical base and that a
  missing/invalid config never silently selects an unintended host.
- **`NEXT_PUBLIC_APP_URL`** — this app's own public URL; defaults to
  `http://localhost:3000`.
- **`NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID`** — only relevant if
  WalletConnect-based wallet flows are enabled.

There is intentionally no client-visible Mux API key. A project API key
is a real credential, and anything under `NEXT_PUBLIC_*` is inlined into
the browser bundle for every visitor to read — see #636. `ApiContext.tsx`
(a client component) never reads `MUX_API_KEY`/`MUX_API_SECRET`; it only
constructs an unauthenticated client that talks to this app's own
same-origin `/api/*` routes.

### Server-only

These never reach the browser and are safe for secrets.

- **`MUX_API_KEY`** / **`MUX_API_SECRET`** — read by
  `getUpstreamAuthHeaders()` in `src/lib/api/config.ts` and attached
  (`x-api-key` / `x-api-secret`) to every upstream request a Next.js API
  route makes to the Mux backend. Only ever read inside `src/app/api/**`
  route handlers or other server-only modules — **never import
  `getApiKey()`/`getApiSecret()` from a client component** (#694).

  **Invariant (#756): `MUX_API_KEY`/`MUX_API_SECRET` are never
  client-bundled.** These two names are *not* prefixed with
  `NEXT_PUBLIC_`, so Next.js never inlines them into the browser bundle,
  and they are deliberately kept out of any `next.config.ts` public-env
  passthrough. The only sanctioned way to read them is through the
  server-only helpers in `src/lib/env.ts` (`getServerOnlyEnv()` /
  `assertServerSide()`), which fail closed: calling them from a browser
  context (`window` defined) throws a stable error code instead of
  returning `undefined`, and a missing required server var throws rather
  than silently sending unauthenticated upstream requests. Do not read
  `process.env.MUX_API_KEY`/`process.env.MUX_API_SECRET` directly, and do
  not add a `NEXT_PUBLIC_MUX_API_*` alias — either would defeat this
  guard. See `docs/security-ux-guards.md` for the full guard contract and
  the negative tests that enforce it.

  As an extra defence-in-depth measure, `assertServerSide()` and
  `getServerOnlyEnv()` in `src/lib/env.ts` throw at runtime whenever they
  are called from a browser context (`window` is defined), so accidentally
  importing these helpers in a `"use client"` file causes an immediate,
  visible error in development rather than silently returning `undefined`.
  Use `getServerOnlyEnv("MUX_API_SECRET")` in server-only code instead of
  reading `process.env.MUX_API_SECRET` directly.
- **`MUX_BACKEND_URL`** — server-only base URL of `mux-backend`, read by
  `getBackendApiBaseUrl()` in `src/lib/api/config.ts`. `/api/spending-limits`
  proxies `GET`/`PUT` here (forwarding the server API key and any caller
  `Authorization` header) so spending limits and the real `todayUsage`
  counter live in the backend, not the frontend process. No default: when
  unset the route responds `503 { error: "Spending limits backend is not
  configured" }` instead of returning a fabricated figure. The
  `/api/demo/spending-limits` route needs no backend — it derives its
  `todayUsage` from the mock transaction store
  (`computeTodayUsage()` in `src/lib/spending-limits/todayUsage.ts`).

  **Fail-closed contract (#758):** the proxy is deny-by-default. When
  `MUX_BACKEND_URL` is unset (or blank) the route must **not** fall back to
  mock data, a fabricated `todayUsage`, or an unauthenticated passthrough —
  it returns a deterministic `503` with a stable error code
  (`backend_not_configured`) and a correlation id so ops can trace the
  misconfiguration without leaking the backend URL, API key, or any caller
  JWT. Authz is enforced on the entrypoint *before* any upstream call, so a
  client cannot bypass spending-limit policy by hitting the proxy directly.
  Error responses and logs redact sensitive values (backend URL, keys,
  `Authorization` headers). See `docs/security-ux-guards.md` for the
  guard/UX rationale and `tests/e2e/` for the misconfiguration and auth
  negative coverage.

### Implicit

- **`NODE_ENV`** — standard Next.js variable. Gates verbose
  console logging in the analytics/tracking hooks
  (`useAnalytics.ts`, `useAnalyticsMetrics.ts`, `useAnalyticsTracking.ts`,
  `recoveryAnalyticsTracking.ts`, `spendingLimitsTracking.ts`) outside of
  `production`, makes `validateEnv()` in `src/lib/env.ts` throw
  (instead of warn) on missing *required* vars when set to `production`,
  and controls whether `getEnv()` merges in documented defaults (see
  "Production defaults" below — it only does so when `NODE_ENV=production`).

### Production defaults

`getEnv()` merges each var's documented `defaultValue` (from the schema
in `src/lib/env.ts`) into whatever is set, but only when
`NODE_ENV=production`. Concretely: if a production deploy forgets to set
`NEXT_PUBLIC_API_URL`/`NEXT_PUBLIC_MUX_API_URL`, it now resolves to the
documented default `https://api.muxprotocol.com` instead of silently
falling through every API route's mock branch (#637). Local dev and test
runs are untouched — `NODE_ENV` isn't `production`, so leaving vars unset
still exercises the in-repo mocks described throughout this doc.

## Testnet vs. mainnet

Two independent things decide "which network" a request is scoped to:

1. **Which backend** — `NEXT_PUBLIC_API_URL` (or its aliases) points this
   app at a specific Mux backend:

   | Environment | `NEXT_PUBLIC_API_URL` example |
   | --- | --- |
   | Local dev (mocked) | _(unset)_ |
   | Testnet / staging | `https://testnet-api.muxprotocol.com` |
   | Mainnet / production | `https://api.muxprotocol.com` |

2. **Which network within that backend** — the in-app Testnet/Mainnet
   switcher in the top nav (`NetworkContext`, `src/context/NetworkContext.tsx`,
   persisted to `localStorage` under `mux_network`). `useWallets({ network })`
   sends this as a `?network=` query param on `/api/wallets`, so the backend
   itself scopes the response to one network — wallets are not additionally
   re-filtered client-side. (An earlier version of the wallets page *did*
   also run a second, independent client-side "all/testnet/mainnet" filter
   on top of that already-scoped fetch, which could show a false "no
   wallets on this network" empty state whenever it disagreed with the
   in-app switcher. That double-filtering has been removed — see
   `src/app/dashboard/wallets/page.tsx`.)

The wallet rows themselves also carry a per-wallet `network` field
(`"testnet"` \| `"mainnet"`, see `src/types/wallet.ts`), which the UI uses
for display only. The server remains the source of truth for which network
a wallet actually lives on; the client never decides that from env vars.

## Production never silently serves mock data

`/api/auth/login`, `/api/auth/refresh`, `/api/wallets`,
`/api/wallets/[id]`, `/api/overview`, and `/api/api-keys` (`GET`/`POST`/
`PATCH`) fall back to in-repo mock responses (fake wallets, dashboard
stats, API keys, and a hardcoded mock bearer/refresh token) whenever no
backend URL is configured — that's what lets `pnpm run dev`, CI, and the
`/demo` routes run with no live backend. `isMockFallbackAllowed()`
(`src/lib/api/config.ts`) disables that fallback whenever
`NODE_ENV=production`: those routes return `503 backend_unavailable`
instead. This matters because the mock fallback accepts a hardcoded
bearer token (`mock-access-token`) and refresh token
(`mock-refresh-token`) as valid, and `/api/api-keys` would otherwise
create/list/revoke against a `localStorage`-backed 
