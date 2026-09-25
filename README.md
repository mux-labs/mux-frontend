# Mux Dashboard

The developer console for **Mux Protocol** — manage API keys, track wallet creation, and monitor account activity on Stellar.

Mux Dashboard is the interface for developers building on Mux. It provides visibility into the **Invisible Wallet system** while abstracting away all blockchain complexity.

---

## Overview

Mux Dashboard allows developers to:

* **Create and manage API keys** for SDK access
* **Track Stellar account creation** on Testnet and Mainnet
* **Monitor wallet activity** and balances
* **View usage metrics** such as transaction counts and account status
* **Configure basic project-level settings**

End users do not interact with this dashboard — it is purely for developers integrating Mux into their applications.

---

## Core Principles

* **Developer-first UX**: designed for fast onboarding and management
* **Invisible Wallet visibility**: see accounts and activity without exposing keys or blockchain jargon
* **Safe and clear**: all actions are explicit; sensitive operations are handled by the backend

---

## Key Features

* **API Key Management**: generate, rotate, and revoke keys
* **Wallet/Account Tracking**: monitor accounts created via the SDK
* **Activity Metrics**: view transaction volumes and status
* **Requests over time**: visualize API request traffic trends
* **Wallet creation analytics**: monitor daily wallet creation volume
* **Network Switching**: testnet vs mainnet tracking
* **Usage Monitoring**: see platform-sponsored actions and account health

---

## Getting Started

### Prerequisites

* Node.js >= 18
* Access to Mux Backend API

### Installation

```bash
git clone https://github.com/mux-labs/mux-frontend.git
cd mux-frontend
pnpm install
pnpm run dev
```

### Environment variables

All variables are optional in local development — sensible mock/default
behavior kicks in when they're unset (see `src/lib/env.ts` for the
validation schema). Copy `.env.example` to `.env.local` and fill in real
values for testnet/mainnet-connected work.

| Variable | Required | Default | Description |
| --- | --- | --- | --- |
| `NEXT_PUBLIC_API_URL` | No | _(none)_ | Base URL for the Mux backend API used by client-side requests, e.g. `https://api.muxprotocol.com` for mainnet or a testnet-specific URL. When unset, API routes such as `/api/auth/login` and `/api/wallets` fall back to an in-repo mock so `pnpm run dev` and CI work without a live backend — but only when `NODE_ENV` is not `production` (see the production note below). **Set this in new deploys; use the aliases below only for backward compatibility.** An alias set to an empty string (e.g. `NEXT_PUBLIC_API_URL=`) is treated as unset and the next alias in the chain is tried (see `API_URL_CANDIDATES` in `src/lib/api/config.ts`). |
| `NEXT_PUBLIC_MUX_API_URL` | No | `https://api.muxprotocol.com` | Legacy alias for the API base URL, checked after `NEXT_PUBLIC_API_URL` (see `src/lib/api/config.ts`). Kept for backward compatibility with older deploys. |
| `NEXT_PUBLIC_API_BASE` | No | _(none)_ | Third fallback in the API base URL resolution chain, checked after the two vars above. |
| `NEXT_PUBLIC_APP_URL` | No | `http://localhost:3000` | Public-facing URL of this application, used for building absolute links (e.g. callback URLs). |
| `NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID` | No | _(none)_ | WalletConnect project ID, needed only if wallet-connect based flows are enabled. |
| `MUX_API_KEY` | No | _(none)_ | Server-only Mux Protocol API key. Used exclusively by Next.js API routes (`src/app/api/**`) to authenticate upstream requests to the backend. Never exposed to the browser — do not prefix it with `NEXT_PUBLIC_`. |
| `MUX_API_SECRET` | No | _(none)_ | Server-only Mux Protocol API secret, paired with `MUX_API_KEY` and sent alongside it on every upstream request. |
| `MUX_BACKEND_URL` | No | _(none)_ | Server-only base URL of `mux-backend`. Used by `/api/spending-limits` to proxy `GET`/`PUT` (spending limits and the real `todayUsage`). When unset the route returns `503` rather than fabricating usage — the frontend never persists spending limits itself (see `getBackendApiBaseUrl()` in `src/lib/api/config.ts`). |

There is no client-visible Mux API key. Project credentials only ever
live in `MUX_API_KEY`/`MUX_API_SECRET` and are attached server-side, in
Next.js API routes, to requests made to the backend — the browser talks
only to this app's own same-origin `/api/*` routes and never holds a Mux
credential.

**API URL alias chain (invariant).** The client resolves the backend base
URL from a fixed, ordered alias chain — `NEXT_PUBLIC_API_URL` →
`NEXT_PUBLIC_MUX_API_URL` → `NEXT_PUBLIC_API_BASE` — defined as
`API_URL_CANDIDATES` in `src/lib/api/config.ts`. Every alias in the chain
resolves to the *same* canonical base URL: the first alias that is set to a
non-empty value wins, and the remaining aliases are ignored. An alias set to
an empty string (e.g. `NEXT_PUBLIC_API_URL=`) is treated as unset and the
next alias is tried, so a blank value never silently resolves to an
unintended host. When *no* alias is set, the chain resolves to no base URL
(`undefined`) — it never falls back to a hardcoded or guessed host. In a
production build that missing base URL is fail-closed: the API routes return
`503 backend_unavailable` instead of serving mock data (see
`isMockFallbackAllowed()` in `src/lib/api/config.ts`). The alias chain is
covered end-to-end by `tests/api-client.test.js`.

**Testnet vs. mainnet:** which *backend* this frontend talks to is driven
entirely by `NEXT_PUBLIC_API_URL` (or its aliases above) — point it at a
testnet-configured Mux backend for staging/testnet work, and at the
production backend for mainnet. Separately, the dashboard has an in-app
Testnet/Mainnet switcher (`NetworkContext`, in the top nav) that scopes
which network's wallets are fetched *within* that backend — `useWallets`
sends it as a `?network=` query param on `/api/wallets`, so wallets are
never double-filtered by both a server-side scope and an independent
client-side one. The env var picks the backend; the in-app switcher picks
the network within it. The CI workflow (`.github/workflows/ci.yml`) sets a
placeholder `NEXT_PUBLIC_API_URL` only so `next build` can run without
secrets; it does not reflect a real environment.

**NetworkContext scopes the wallets query only.** `NetworkContext`
(`src/contexts/NetworkContext.tsx`) is the single source of truth for the
active network and exposes a typed, stable API — `network` (`'testnet' |
'mainnet'`), `chain` (`'stellar-testnet' | 'stellar-mainnet'`),
`isMainnet`/`isTestnet`, and `setNetwork`. Only the wallets query is scoped
by it: `useWallets` reads the active network from `NetworkContext` and
sends it as the `?network=` param on `/api/wallets`, so cross-network
wallet data can never leak into or be queried from the wrong network.
Other data hooks (overview, transactions, notifications, analytics) are
**not** network-scoped by `NetworkContext` and must not assume it — they
follow the backend selected by `NEXT_PUBLIC_API_URL`. This keeps the
network scope in exactly one place instead of being applied inconsistently
across the app.

**Fail-closed on network misconfiguration.** The wallets query only runs
against a known, supported network. If `NetworkContext` is missing, or the
active network is unknown/unsupported, `useWallets` does not issue a
request and surfaces a stable error code (`network_unconfigured` /
`unsupported_network`) with a correlation id rather than falling back to a
default network — so a testnet/mainnet misconfig can never silently query
the wrong network's wallets. The same fail-closed rule applies when the
backend is unreachable: the wallets query errors out instead of returning
cross-network or fabricated data.

**Production defaults:** when `NODE_ENV=production`, unset vars with a
documented default (e.g. `NEXT_PUBLIC_MUX_API_URL` →
`https://api.muxprotocol.com`) are applied automatically by `getEnv()`,
so a production deploy with a forgotten env var talks to the real
backend instead of silently serving mock data. Local dev and tests are
unaffected — leaving everything unset there still uses the in-repo
mocks.

`NODE_ENV` (standard Next.js variable, not defined in `.env.example`)
also gates some behavior: analytics/tracking hooks
(`useAnalytics.ts`, `useAnalyticsMetrics.ts`, `useAnalyticsTracking.ts`,
`recoveryAnalyticsTracking.ts`, `spendingLimitsTracking.ts`) log to the
console outside of `production`; `src/lib/env.ts` throws on missing
*required* vars only when `NODE_ENV=production`; and the mock/demo
fallbacks in API routes and data hooks
(`src/lib/api/runtimeMode.ts`, `useNotifications.ts`, `useRecovery.ts`)
are disabled when `NODE_ENV=production` so mock data is never served in a
production build.

**Production never silently falls back to mock data.** `/api/auth/login`,
`/api/auth/refresh`, `/api/wallets`, `/api/wallets/[id]`,
`GET /api/transactions`, `/api/notifications`, `/api/overview`, and
`/api/api-keys` (`GET`/`POST`/`PATCH`) all fall back to in-repo mock data
(fake wallets, dashboard stats, API keys, a hardcoded mock bearer/refresh
token) when no backend URL is configured — that's what makes
`pnpm run dev`, CI, and the `/demo` routes work with no live backend. In a
production build (`NODE_ENV=production`) that fallback is disabled: if
`NEXT_PUBLIC_API_URL` (or its aliases) is missing, those routes return
`503 backend_unavailable` instead of serving fabricated wallets/analytics/
API keys or accepting the mock token as valid auth. See
`isMockFallbackAllowed()` in `src/lib/api/config.ts`.

`APIKeyModal`'s standalone (no-`onCreateKey`) key generator follows the
same rule client-side, and the wallets sidebar prefetch
(`src/lib/walletsPrefetchCache.ts`) attaches the caller's session token and
keys its cache entry by it, so a prefetch from one session is never served
to a different session that signs in afterward on the same device.

See [`docs/frontend-env-vars.md`](docs/frontend-env-vars.md) for the full
reference, including which file reads each variable and a manual
verification checklist.

### Auth and API client behavior

* `src/lib/api.js` adds request header support with `x-request-id` and automatic session refresh on `401`
* `src/utils/fetchWithAuth.ts` (used by `useWallets` / `useWallet` / the Send flow) mirrors that
  behaviour: on a `401` it calls `POST /api/auth/refresh` once and retries the original request with the
  r

frontend-env-vars.md`](docs/frontend-env-vars.md) for the full
reference, including which file reads each variable and a manual
verification checklist.

### Auth and API client behavior

* `src/lib/api.js` adds request header support with `x-request-id` and automatic session refresh on `401`
* `src/utils/fetchWithAuth.ts` (used by `useWallets` / `useWallet` / the Send flow) mirrors that
  behaviour: on a `401` it calls `POST /api/auth/refresh` once and retries the original request with the
  r

