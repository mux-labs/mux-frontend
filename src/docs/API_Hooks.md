# API Hooks

## Auth routes (`/api/auth/*`)

| Route | Backend configured (`NEXT_PUBLIC_API_URL`) | No backend, non-prod | No backend, production |
|---|---|---|---|
| `POST /api/auth/login` | Proxies to `{backend}/auth/login`; on success sets the `mux_auth_token` cookie (`HttpOnly; SameSite=Lax; Secure` in prod) from the response token (#627). | Returns a mock `{ user, session }` (any well-formed credentials). | `503 backend_unavailable` — no mock sign-in (#625). |
| `POST /api/auth/refresh` | Proxies to `{backend}/auth/refresh`, forwarding `Authorization` / `Cookie`; rotates the `mux_auth_token` cookie from the response (#626). | Mints the mock access token for `mock-refresh-token`; `401 invalid_refresh` otherwise. | `503 backend_unavailable`. |
| `POST /api/auth/logout` | Best-effort `{backend}/auth/logout`; always clears `mux_auth_token`. | Clears `mux_auth_token`. | Clears `mux_auth_token`. |

Client side: `signIn(user, ttlMs?, tokens?)` in `src/context/AuthContext.tsx`
persists any `tokens` block to tab-scoped `sessionStorage` via
`src/lib/session.js` (`createSession` → `saveSession`, key `mux-auth-session`);
`src/lib/api.js` (`apiFetch`) then sends `Authorization: Bearer <accessToken>`
and calls `/api/auth/refresh` once on a `401`. `signOut()` clears it. No token
is ever written to `localStorage` or a `NEXT_PUBLIC_*` var (#628).

`src/utils/fetchWithAuth.ts` — the wrapper used by `useWallets`, `useWallet`
and the wallet Send flow — follows the same `401` contract as `apiFetch`
(#630): it reads the refresh token from the **same** `mux-auth-session` store
(`loadSession()`, not an ad-hoc `localStorage` key — #629), `POST`s to
`/api/auth/refresh`, persists any rotated `accessToken`, and retries the
original request once with the new bearer token. Only if the refresh call
fails — or the retried request is still a `401` — does it clear the session
(`sessionStorage` user record + bearer session + `mux_auth_session` cookie)
and `window.location.replace` to `/login?callbackUrl=…`.

### Stale-session guard (#624)

`src/hooks/useSessionGuard.ts` is the client-side complement to the middleware
route protection: once `useAuth()` has finished rehydrating, an unauthenticated
visitor is redirected to `/login?callbackUrl=<path>`. It is **not** a
standalone opt-in per page — `src/components/layouts/AuthGuard.tsx` calls it,
and `DashboardLayout` wraps every real `/dashboard/*` route in `AuthGuard`
(`requireAuth` defaults to `true`; the `/demo/dashboard/*` tree passes
`requireAuth={false}`). So the guard runs on the whole production dashboard
tree, and the `/demo` tree — which has no session — is the explicit opt-out.

## Spending limits

The production dashboard calls `/api/spending-limits`, which proxies `GET` and
`PUT` requests to mux-backend at `MUX_BACKEND_URL` (resolved by
`getBackendApiBaseUrl()` in `src/lib/api/config.ts`). It forwards the server API
key and any caller `Authorization` header, and returns `503` when no backend is
configured. It does not persist values in the frontend process, and
`todayUsage` comes straight from the backend's real activity — the frontend
never substitutes a constant.

`SpendingLimitsCard` (`src/components/dashboard/SpendingLimitsCard.tsx`) reads
and writes limits only through this API. It does **not** cache them in
`localStorage`: spending limits are account state, and a per-browser copy would
be wrong for a second device or a shared machine (#649). On a failed load it
shows an explicit error plus clearly-labelled default limits.

The `/demo/dashboard/spending-limits` page intentionally calls
`/api/demo/spending-limits`, whose in-memory store is demo-only. That route
derives `todayUsage` from the mock transaction store via `computeTodayUsage()`
(`src/lib/spending-limits/todayUsage.ts`) — the sum of completed transaction
amounts on the most recent day — rather than returning a fixed number (#648).

This document explains the new API hooks added to the project:

- `useApiKeys()` — a client hook that fetches API keys and exposes `data`, `loading`, `error`, and `refetch`.
- `useRevokeApiKey()` — a client hook that provides `revoke(id)` and `loading`/`error` state while revoking.
- `useWallets({ network, demo })` — a client hook that fetches wallets, scoped server-side to one network.

Files:

- `src/hooks/useApiKeys.ts` — fetch + refetch behavior
- `src/hooks/useRevokeApiKey.ts` — mutation for revoking a key
- `src/lib/api.ts` — small API wrapper using `src/types/apiKey.ts`
- `src/mock-data/api-keys.ts` — mock store with `getApiKeys()` and `revokeApiKey()` persistence via `localStorage` or in-memory fallback; used only as the non-production fallback for `src/app/api/api-keys/route.ts`

### Types are not the mock's (#706, #707, #708)

`ApiKey` / `CreatedApiKey` (`src/types/apiKey.ts`) and `OverviewData`
(`src/types/overview.ts`) are the canonical shapes `DashboardOverview`,
`ApiKeysTable`, `useRevokeApiKey`, and `APIKeyModal` type against. The
`src/mock-data/*` modules import and re-export these same types purely for
backward compatibility — they are not the source of truth, so a real
`mux-backend` response only needs to satisfy the `src/types/*` contract,
not whatever shape the mock fixture happens to use.

### `/api/api-keys` revoke and the mock store (#707)

`ApiKeysTable`'s revoke button calls `useRevokeApiKey().revoke(id)` →
`revokeKey()` → `PATCH /api/api-keys`
(`src/app/api/api-keys/route.ts`), which proxies to
`{NEXT_PUBLIC_API_URL}/api-keys` when a backend is configured. GET, POST,
and PATCH all fall back to the `localStorage`-backed mock store
(`src/mock-data/api-keys.ts`) only when no backend is configured **and**
`isMockFallbackAllowed()` is true — i.e. never in a production build. A
production deployment with no backend configured gets `503
backend_unavailable` instead of a revoke that silently "succeeds" against
the mock store while leaving the key active on any real backend.

### `APIKeyModal` create-once secret (#708)

The full secret is only ever present on the value returned by the create
call (`CreatedApiKey.secret`); the list endpoint (`GET /api/api-keys`)
returns `ApiKey`, which has no `secret` field, so there is nothing to
re-fetch. `APIKeyModal` holds the secret in local component state only
and clears it on close; `ApiKeysTable` strips `secret` before ever putting
a key into table state (`toTableApiKey()`). The modal's own client-side
key generator — used only when rendered without an `onCreateKey` handler —
throws instead of fabricating a secret whenever `isMockFallbackAllowed()`
is `false`, so it can't silently hand out a fake key in production.

### Wallets prefetch cache: TTL + tenant isolation (#705)

`src/lib/walletsPrefetchCache.ts` (used by `Sidebar` on hover of the
Wallets nav item) now attaches the current session's access token as an
`Authorization: Bearer` header — previously it fetched with no auth header
at all, so the request always failed once `/api/wallets` began requiring
one. The cache entry is also keyed by that same token
(`sessionKey()`), not just the request URL: if a different session (or an
anonymous state) is active when `prefetchWallets()` / 
`getWalletsPrefetchEntry()` is called, the previous entry is treated as a
miss regardless of its 30s TTL. This closes a cross-tenant leak where a
prefetch started under one user could otherwise still be "fresh" when a
different user signs in on the same tab/device shortly after, and would
have handed the second user the first user's wallet list.
`resetWalletsPrefetchCache()` (called on `signOut()`) still clears it
outright, but correctness no longer depends solely on every call site
remembering to do so.

## `useWallets`

`src/hooks/useWallets.ts` fetches `/api/wallets`, forwarding `network`
(`"testnet"` | `"mainnet"` | `"all"`) as a `?network=` query param — the
**backend** is the one place that scopes the result set, not the caller.

```tsx
import { useNetwork } from "@/context/NetworkContext";
import { useWallets } from "@/hooks/useWallets";

const { network } = useNetwork(); // the in-app Testnet/Mainnet switcher
const { wallets, loading, error, refetch } = useWallets({ network });
```

Because the fetch is already network-scoped, **do not** additionally
re-filter the returned `wallets` by network client-side (e.g. with the
standalone `useNetworkFilter()` hook / `NetworkFilter` component) unless
you are deliberately fetching `network: "all"` and want an in-page filter
on top of that unscoped result. Layering a second, independently-driven
network filter on top of an already network-scoped fetch is exactly the
double-filtering bug that was removed from `/dashboard/wallets` — it can
only ever agree with the server-side scope or contradict it (e.g. show a
false "no wallets on this network" empty state when the two disagree).

Pass `demo: true` for routes with no authenticated session (the `/demo/*`
tree) to source wallets from `src/mock-data/wallets.ts` directly instead
of hitting the auth-gated backend.

### Production vs. mock data

`useWallets` itself has no mock branch — it always calls `/api/wallets`
(or the configured backend directly). The mock/demo split lives in the
route handler, `src/app/api/wallets/route.ts`: it proxies to
`NEXT_PUBLIC_API_URL` when set, and otherwise falls back to
`src/mock-data/wallets.ts` — but **only** when `NODE_ENV !== "production"`
(`isMockFallbackAllowed()` in `src/lib/api/config.ts`). In a production
build with no backend configured, the route returns `503
backend_unavailable` rather than silently serving fabricated wallets.

Usage example (client component):

1. Import the hooks:

```tsx
import { useApiKeys } from '@/hooks/useApiKeys';
import { useRevokeApiKey } from '@/hooks/useRevokeApiKey';
```

2. Use them in a client component and call `refetch()` after a mutation to refresh data:

```tsx
const { data: keys, loading, refetch } = useApiKeys();
const { revoke, loading: revoking } = useRevokeApiKey();

async function onRevoke(id: string) {
  await revoke(id);
  await refetch();
}
```

Notes on testing locally:

- The repo uses React 19; some testing libraries may expect React 18+. If `npm install` fails due to peer dependency conflicts, run the install command with `--legacy-peer-deps` or use the project's preferred package manager (`pnpm`) if available.
- Run tests with:

```bash
pnpm install
pnpm test

# or with npm (if pnpm is not available)
npm install --legacy-peer-deps
npm test
```

If tests fail in CI due to path alias (`@/`) resolution, add appropriate `vitest` config with `tsconfig` path mappings.

---

## Production vs demo/mock split

Data hooks and their API routes follow one rule, centralised in
`src/lib/api/runtimeMode.ts`:

| Situation | Behavior |
| --- | --- |
| Backend configured (`NEXT_PUBLIC_API_URL` / aliases) | Always call the real backend. |
| No backend + **not** production | Fall back to in-repo mock data (`src/mock-data/`). |
| No backend + **production** build | Surface an error (HTTP 503 / thrown). Mock data is **never** served in production, so an outage or misconfig is visible instead of silently masked. |

### `useNotifications()` — #617

`src/hooks/useNotifications.ts`. Exposes `notifications`, `unreadCount`,
`loading`, `error`, `refetch`, and `markAllRead`.

- List + mark-all-read both go through `/api/notifications`
  (`GET` and `PATCH { markAll: true }`), which proxies to
  `GET|PATCH {backend}/notifications[/read]` when a backend is set.
- `markAllRead()` updates local state optimistically **and** persists to the
  server. If persistence fails it triggers a reconciling `refetch()` rather
  than letting the optimistic state drift.
- In production with no backend, `/api/notifications` returns `503` — the
  panel shows its error state with a retry.

### `GET /api/transactions` — #654

`src/app/api/transactions/route.ts`.

- Proxies to `GET {backend}/transactions?<query>` when a backend is set,
  forwarding the caller's `Authorization` header (and the server `x-api-key`
  when `MUX_API_KEY` is set). Upstream error statuses are passed through;
  an unreachable backend returns `502`.
- With no backend (non-production), filters `src/mock-data/transactions.ts`
  locally: `?address=` matches either the sender or the recipient, and
  `?network=mainnet|testnet` narrows by network. Both filters combine; an
  unrecognised `network` value is ignored rather than emptying the list.
- With no backend in a **production** build the route returns
  `503 backend_unavailable` — fabricated transaction history is never
  served in production (`canUseMockFallback()` in
  `src/lib/api/runtimeMode.ts`).

### `useAnalyticsTransactions(range)` — #453

`src/hooks/useAnalyticsTransactions.ts`. Fetches the real, export-shaped
transaction list for a date range (`GET /analytics/transactions-list`), used as
the data source for the analytics **CSV / JSON export**. It mirrors the
production/mock split of `useAnalyticsMetrics`:

- Backend configured → fetch real rows via `fetchExportTransactions`.
- No backend + not production → fall back to `exportTransactions` from
  `src/mock-data/analytics.ts`.
- No backend + **production** → surface an error (never export mock rows).

This replaces the earlier stub where the analytics page synthesised fake
`Transaction` objects from the aggregated `topAssets` table — the exported CSV /
JSON now contains genuine per-transaction records for the selected range.
No custody secret is involved: the rows are fetched through the same
client-side `ApiClient` path as the rest of analytics, which only reads
`NEXT_PUBLIC_API_URL` / its aliases.

### Notifications bell — #618

`src/components/layouts/TopNav.tsx` mounts
`src/components/notifications/NotificationsPanel.tsx` from the bell button.
The red dot renders only when `unreadCount > 0` (showing the count, capped at
`9+`); closing the panel calls `refetch()` so the badge reflects a
mark-all-read performed inside the panel.

### `useRecovery(walletId)` — #620

`src/hooks/useRecovery.ts`.

- `walletId !== null` → real per-wallet status fetch via `useRecoveryStatus`
  / `fetchRecoveryStatus`.
- `walletId === null`:
  - **production** — resolves straight to `idle` (no wallet selected yet =
    nothing to fetch); `confirmRecovery()` rejects with
    "Select a wallet before initiating recovery." No simulated delay, no
    fake success.
  - **non-production** — keeps a short simulated bootstrap so the demo
    dashboards render a loading skeleton without a live backend.
