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
| `NEXT_PUBLIC_API_URL` | No | _(none)_ | Base URL for the Mux backend API used by client-side requests, e.g. `https://api.muxprotocol.com` for mainnet or a testnet-specific URL. When unset, API routes such as `/api/auth/login` and `/api/wallets` fall back to an in-repo mock so `pnpm run dev` and CI work without a live backend — but only when `NODE_ENV` is not `production` (see the production note below). |
| `NEXT_PUBLIC_MUX_API_URL` | No | `https://api.muxprotocol.com` | Legacy alias for the API base URL, checked after `NEXT_PUBLIC_API_URL` (see `src/lib/api/config.ts`). Kept for backward compatibility with older deploys. |
| `NEXT_PUBLIC_API_BASE` | No | _(none)_ | Third fallback in the API base URL resolution chain, checked after the two vars above. |
| `NEXT_PUBLIC_APP_URL` | No | `http://localhost:3000` | Public-facing URL of this application, used for building absolute links (e.g. callback URLs). |
| `NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID` | No | _(none)_ | WalletConnect project ID, needed only if wallet-connect based flows are enabled. |
| `MUX_API_KEY` | No | _(none)_ | Server-only Mux Protocol API key. Used exclusively by Next.js API routes (`src/app/api/**`) to authenticate upstream requests to the backend. Never exposed to the browser — do not prefix it with `NEXT_PUBLIC_`. |
| `MUX_API_SECRET` | No | _(none)_ | Server-only Mux Protocol API secret, paired with `MUX_API_KEY` and sent alongside it on every upstream request. |

There is no client-visible Mux API key. Project credentials only ever
live in `MUX_API_KEY`/`MUX_API_SECRET` and are attached server-side, in
Next.js API routes, to requests made to the backend — the browser talks
only to this app's own same-origin `/api/*` routes and never holds a Mux
credential.

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
`/api/auth/refresh`, `/api/wallets`, and `/api/wallets/[id]` all fall back
to in-repo mock data (fake wallets, a hardcoded mock bearer/refresh token)
when no backend URL is configured — that's what makes `pnpm run dev`, CI,
and the `/demo` routes work with no live backend. In a production build
(`NODE_ENV=production`) that fallback is disabled: if `NEXT_PUBLIC_API_URL`
(or its aliases) is missing, those routes return `503 backend_unavailable`
instead of serving fabricated wallets/analytics or accepting the mock
token as valid auth. See `isMockFallbackAllowed()` in
`src/lib/api/config.ts`.

See [`docs/frontend-env-vars.md`](docs/frontend-env-vars.md) for the full
reference, including which file reads each variable and a manual
verification checklist.

### Auth and API client behavior

* `src/lib/api.js` adds request header support with `x-request-id` and automatic session refresh on `401`
* `src/lib/session.js` persists auth state and clears stale sessions gracefully
* `src/hooks/useWallets.ts` adds a wallet query hook that loads wallets from `/api/wallets`
* `src/app/api/auth/refresh/route.ts`, `/api/wallets/route.ts`, and `/api/wallets/[id]/route.ts` simulate auth-protected backend behavior for local testing
* `src/app/api/requests/today/route.ts` and `POST /api/transactions` (used by the wallet "Send" flow) follow the
  same pattern as the routes above: they proxy to `NEXT_PUBLIC_API_URL` (or its aliases) when configured, and fall
  back to mock data/an in-memory mock transaction otherwise — never a hardcoded value in production
* Receive-address QR codes (`src/components/wallet/QrCode.tsx`) and the QR download action
  (`src/components/wallet/QRDownloadButton.tsx`) encode the real wallet address client-side via the `qrcode`
  package; no backend call is involved

**Server-verified sessions (#621).** When `NEXT_PUBLIC_API_URL` is set,
`POST /api/auth/login` proxies to the backend and stores the backend-issued
session token in an **HttpOnly `mux_auth_token` cookie**. The Next.js
middleware verifies that token against `GET {backend}/auth/session` on every
`/dashboard` request — the old client-set `mux_auth_session` marker cookie is
only trusted in mock mode (no backend). `signOut()` calls
`POST /api/auth/logout` to clear the HttpOnly cookie. See
[`docs/auth-local-setup.md`](docs/auth-local-setup.md).

**No silent mock success in production.** API routes that fall back to
in-repo mock data (`/api/auth/login`, `/api/notifications`, …) do so only
outside production. A production build with no backend configured returns
`503` instead of mock data, so a misconfiguration is visible rather than
masked. The shared rule lives in `src/lib/api/runtimeMode.ts`.

### Smoke tests

Run unit/component smoke tests with:

```bash
npm test
```

Run Playwright end-to-end smoke tests (login, wallet monitoring, and
wallet send/receive, desktop and mobile viewports) with:

```bash
pnpm exec playwright install --with-deps chromium
pnpm run test:e2e
```

See [`tests/e2e/README.md`](tests/e2e/README.md) for what's covered and a
manual verification checklist.

### Documentation

Root-level `.md` files are kept to just this `README.md`. Deeper
reference docs (env vars, auth setup, analytics data sources, CI
typecheck/build verification, etc.) live under [`docs/`](docs/) so they
stay easy to find and don't clutter the repo root as features evolve.

---

## Design Philosophy

* The dashboard is **developer-focused**, not end-user focused
* **Backend handles wallets and transactions**; the dashboard is a monitoring and management tool
* Makes it simple to **observe, control, and integrate** Mux-powered wallets

---

## Roadmap

* Per-key usage analytics
* Webhooks and notifications for SDK events
* ~~Team access management~~ — basic admin/developer member management is in
  at `/dashboard/settings/team` (`/api/team`); see
  [`docs/team-access-and-audit-log.md`](docs/team-access-and-audit-log.md)
* ~~Audit logs for all wallet and API activity~~ — `/api/activity` now
  follows the same production/mock split as the rest of the app instead of
  always serving mock data; see
  [`docs/team-access-and-audit-log.md`](docs/team-access-and-audit-log.md)
