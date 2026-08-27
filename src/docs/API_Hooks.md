# API Hooks

This document explains the new API hooks added to the project:

- `useApiKeys()` — a client hook that fetches API keys and exposes `data`, `loading`, `error`, and `refetch`.
- `useRevokeApiKey()` — a client hook that provides `revoke(id)` and `loading`/`error` state while revoking.
- `useWallets({ network, demo })` — a client hook that loads wallets, exposes `wallets`, `loading`, `error`, `refetch`, `isCached`.

## `useWallets` — production vs demo

Both `/dashboard/wallets` and `/demo/dashboard/wallets` render through the
same `useWallets` hook and the same controls (`NetworkFilter`,
`useNetworkFilter`, and the "Show archived" toggle). The only difference is
the data source:

| Route | Call | Data source |
| --- | --- | --- |
| `/dashboard/wallets` (production) | `useWallets({ network })` | authenticated `GET /wallets` (or `/api/wallets`) via `fetchWithAuth` |
| `/demo/dashboard/wallets` (demo) | `useWallets({ network, demo: true })` | local `src/mock-data/wallets.ts` — no network request, no auth |

`demo: true` is the **only** switch that selects mock data; the filtering,
archived toggle, and optimistic-add behaviour must stay identical between
the two pages (see `src/app/demo/dashboard/wallets/page.aligned.test.tsx`).
Both routes sit behind the auth middleware (`src/middleware.ts`).

Files:

- `src/hooks/useApiKeys.ts` — fetch + refetch behavior
- `src/hooks/useRevokeApiKey.ts` — mutation for revoking a key
- `src/lib/api.ts` — small API wrapper using `src/mock-data/api-keys.ts`
- `src/mock-data/api-keys.ts` — mock store with `getApiKeys()` and `revokeApiKey()` persistence via `localStorage` or in-memory fallback

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
