# API Hooks

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
