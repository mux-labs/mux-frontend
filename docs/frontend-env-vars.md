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

- **`NEXT_PUBLIC_API_URL`** — primary backend base URL. Read directly in
  `src/app/api/auth/login/route.ts` to decide whether to proxy to a real
  backend or fall back to the mock login response, and in
  `src/lib/api/config.ts::getApiBaseUrl()` as the first candidate for all
  other API calls (e.g. `useWallets`).
- **`NEXT_PUBLIC_MUX_API_URL`** — second candidate in the same
  `getApiBaseUrl()` fallback chain; defaults to
  `https://api.muxprotocol.com` when nothing else is set. Predates
  `NEXT_PUBLIC_API_URL` and is kept for older deploy configs.
- **`NEXT_PUBLIC_API_BASE`** — third and final candidate in the fallback
  chain, for deploys that used this older name.
- **`NEXT_PUBLIC_APP_URL`** — this app's own public URL; defaults to
  `http://localhost:3000`.
- **`NEXT_PUBLIC_MUX_API_KEY`** — read by `getApiKey()` in
  `src/lib/api/config.ts`; attached to outgoing API requests where a
  client-visible key is acceptable.
- **`NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID`** — only relevant if
  WalletConnect-based wallet flows are enabled.

### Server-only

These never reach the browser and are safe for secrets.

- **`MUX_API_KEY`** / **`MUX_API_SECRET`** — credentials for server-side
  calls to the Mux Protocol API (Next.js route handlers / server
  components only).
- **`DATABASE_URL`** — connection string, if this deployment persists any
  data outside the backend API.

### Implicit

- **`NODE_ENV`** — standard Next.js variable. Gates verbose
  console logging in the analytics/tracking hooks
  (`useAnalytics.ts`, `useAnalyticsMetrics.ts`, `useAnalyticsTracking.ts`,
  `recoveryAnalyticsTracking.ts`, `spendingLimitsTracking.ts`) outside of
  `production`, and makes `validateEnv()` in `src/lib/env.ts` throw
  (instead of warn) on missing *required* vars when set to `production`.

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
(`"testnet"` \| `"mainnet"`, see `src/types/wallet.ts`) that both the
backend proxy and the mock fallback in `/api/wallets` use to honor that
query param.

## Production never silently serves mock data

`/api/auth/login`, `/api/auth/refresh`, `/api/wallets`, and
`/api/wallets/[id]` fall back to in-repo mock responses (fake wallets, a
hardcoded mock bearer/refresh token) whenever no backend URL is
configured — that's what lets `pnpm run dev`, CI, and the `/demo` routes
run with no live backend. `isMockFallbackAllowed()`
(`src/lib/api/config.ts`) disables that fallback whenever
`NODE_ENV=production`: those routes return `503 backend_unavailable`
instead. This matters because the mock fallback accepts a hardcoded
bearer token (`mock-access-token`) and refresh token
(`mock-refresh-token`) as valid — without the guard, a production
deployment that forgot to set `NEXT_PUBLIC_API_URL` would silently serve
fabricated wallets/analytics and accept those hardcoded tokens as a real
authenticated session.

## CI

`.github/workflows/ci.yml` sets `NEXT_PUBLIC_API_URL=https://api.example.com`
purely so `next build` succeeds without real credentials. It is a
placeholder, not a real environment — do not read it as evidence of a
live mainnet or testnet target.

## Manual verification checklist

- [ ] `.env.local` unset entirely → `pnpm run dev` still boots and login
      succeeds against the mock `/api/auth/login` route.
- [ ] `NEXT_PUBLIC_API_URL` set to a real backend → login proxies through
      instead of using the mock.
- [ ] `NEXT_PUBLIC_APP_URL` changed → any absolute links that use it
      update accordingly.
- [ ] Removing a `NEXT_PUBLIC_*` var and setting `NODE_ENV=production`
      surfaces a startup error only for vars marked `required` in
      `src/lib/env.ts` (none currently are, by design).
- [ ] `NODE_ENV=production` with `NEXT_PUBLIC_API_URL` (and its aliases)
      unset → `/api/wallets`, `/api/wallets/[id]`, `/api/auth/login`, and
      `/api/auth/refresh` all return `503 { error: "backend_unavailable" }`
      instead of mock data, and the hardcoded mock bearer/refresh tokens
      are rejected.
- [ ] Switching the in-app Testnet/Mainnet control on `/dashboard/wallets`
      re-fetches `/api/wallets?network=<selected>` and shows only that
      network's wallets — with no separate "all networks" filter control
      left on the page to disagree with it.
