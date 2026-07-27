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
git clone https://github.com/muxlabs/mux-frontend.git
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
| `NEXT_PUBLIC_API_URL` | No | _(none)_ | Base URL for the Mux backend API used by client-side requests, e.g. `https://api.muxprotocol.com` for mainnet or a testnet-specific URL. When unset, API routes such as `/api/auth/login` fall back to an in-repo mock so `pnpm run dev` and CI work without a live backend. |
| `NEXT_PUBLIC_MUX_API_URL` | No | `https://api.muxprotocol.com` | Legacy alias for the API base URL, checked after `NEXT_PUBLIC_API_URL` (see `src/lib/api/config.ts`). Kept for backward compatibility with older deploys. |
| `NEXT_PUBLIC_API_BASE` | No | _(none)_ | Third fallback in the API base URL resolution chain, checked after the two vars above. |
| `NEXT_PUBLIC_APP_URL` | No | `http://localhost:3000` | Public-facing URL of this application, used for building absolute links (e.g. callback URLs). |
| `NEXT_PUBLIC_MUX_API_KEY` | No | _(none)_ | Client-visible API key sent with requests to the Mux Protocol API. Do not put secrets here — anything prefixed `NEXT_PUBLIC_` is bundled into client JS. |
| `NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID` | No | _(none)_ | WalletConnect project ID, needed only if wallet-connect based flows are enabled. |
| `MUX_API_KEY` | No | _(none)_ | Server-only Mux Protocol API key, used for requests made from Next.js API routes / server components. Never exposed to the browser. |
| `MUX_API_SECRET` | No | _(none)_ | Server-only Mux Protocol API secret, paired with `MUX_API_KEY`. |
| `DATABASE_URL` | No | _(none)_ | Server-only database connection string, if this deployment persists data outside the backend API. |

**Testnet vs. mainnet:** this frontend does not hardcode a network — it
is entirely driven by which backend `NEXT_PUBLIC_API_URL` (or its
aliases above) points at. Point it at a testnet-configured Mux backend
for staging/testnet work, and at the production backend for mainnet.
The CI workflow (`.github/workflows/ci.yml`) sets a placeholder
`NEXT_PUBLIC_API_URL` only so `next build` can run without secrets; it
does not reflect a real environment.

`NODE_ENV` (standard Next.js variable, not defined in `.env.example`)
also gates some behavior: analytics/tracking hooks
(`useAnalytics.ts`, `useAnalyticsMetrics.ts`, `useAnalyticsTracking.ts`,
`recoveryAnalyticsTracking.ts`, `spendingLimitsTracking.ts`) log to the
console outside of `production`, and `src/lib/env.ts` throws on missing
*required* vars only when `NODE_ENV=production`.

See [`docs/frontend-env-vars.md`](docs/frontend-env-vars.md) for the full
reference, including which file reads each variable and a manual
verification checklist.

### Auth and API client behavior

This repo now includes a minimal auth flow and API client support for dev mode:

* `src/lib/api.js` adds request header support with `x-request-id` and automatic session refresh on `401`
* `src/lib/session.js` persists auth state in `localStorage` and clears stale sessions gracefully
* `src/hooks/useWallets.ts` adds a wallet query hook that loads wallets from `/api/wallets`
* `src/app/api/auth/refresh/route.ts`, `/api/wallets/route.ts`, and `/api/wallets/[id]/route.ts` simulate auth-protected backend behavior for local testing

### Smoke tests

Run full smoke tests with:

```bash
npm test
```

---

## Design Philosophy

* The dashboard is **developer-focused**, not end-user focused
* **Backend handles wallets and transactions**; the dashboard is a monitoring and management tool
* Makes it simple to **observe, control, and integrate** Mux-powered wallets

---

## Roadmap

* Per-key usage analytics
* Webhooks and notifications for SDK events
* Team access management
* Audit logs for all wallet and API activity
