# API Hooks

## Auth routes (`/api/auth/*`)

| Route | Backend configured (`NEXT_PUBLIC_API_URL`) | No backend, non-prod | No backend, production |
|---|---|---|---|
| `POST /api/auth/login` | Proxies to `{backend}/auth/login`; on success sets the `mux_auth_token` cookie (`HttpOnly; SameSite=Lax; Secure` in prod) from the response token (#627). | Returns a mock `{ user, session }` (any well-formed credentials). | `503 backend_unavailable` — no mock sign-in (#625). |
| `POST /api/auth/refresh` | Proxies to `{backend}/auth/refresh`, forwarding `Authorization` / `Cookie`; rotates the `mux_auth_token` cookie from the response (#626). | Mints the mock access token for `mock-refresh-token`; `401 invalid_refresh` otherwise. | `503 backend_unavailable`. |
| `POST /api/auth/logout` | Best-effort `{backend}/auth/logout`; always clears `mux_auth_token`. | Clears `mux_auth_token`. | Clears `mux_auth_token`. |

Client side: `signIn(user, ttlMs?, tokens?)` in `src/context/AuthContext.tsx`
persists any `tokens` block to tab-scoped `sessionStorage` via
`src/lib/session.js` (`createSession` → `saveSession`); `src/lib/api.js`
(`apiFetch`) then sends `Authorization: Bearer <accessToken>` and calls
`/api/auth/refresh` once on a `401`. `signOut()` clears it. No token is ever
written to `localStorage` or a `NEXT_PUBLIC_*` var (#628).

## Spending limits

The production dashboard calls `/api/spending-limits`, which proxies `GET` and
`PUT` requests to mux-backend at `MUX_BACKEND_URL`. It forwards the server API
key and any caller `Authorization` header, and returns `503` when no backend is
configured. It does not persist values in the frontend process.

The `/demo/dashboard/spending-limits` page intentionally calls
`/api/demo/spending-limits`, whose in-memory store is demo-only.

This document explains the new API hooks added to the project:

- `useApiKeys()` — a client hook that fetches API keys and exposes `data`, `loading`, `error`, and `refetch`.
- `useRevokeApiKey()` — a client hook that provides `revoke(id)` and `loading`/`error` state while revoking.
- `useWallets({ network, demo })` — a client hook that fetches wallets, scoped server-side to one network.

Files:

- `src/hooks/useApiKeys.ts` — fetch + refetch behavior
- `src/hooks/useRevokeApiKey.ts` — mutation for revoking a key
- `src/lib/api.ts` — small API wrapper using `src/mock-data/api-keys.ts`
- `src/mock-data/api-keys.ts` — mock store with `getApiKeys()` and `revokeApiKey()` persistence via `localStorage` or in-memory fallback

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
