# API Hooks

This document explains the new API hooks added to the project:

- `useApiKeys()` — a client hook that fetches API keys and exposes `data`, `loading`, `error`, and `refetch`.
- `useRevokeApiKey()` — a client hook that provides `revoke(id)` and `loading`/`error` state while revoking.

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

---

## TanStack Query (`ReactQueryProvider`) — issue #619

`src/lib/reactQuery/ReactQueryProvider.tsx` mounts a real
`@tanstack/react-query` `QueryClient` (server: one per request; browser: a
lazily-created singleton) at the app root in `src/app/layout.tsx`. Defaults:
`staleTime` 30s, `retry: 1` for queries, `retry: 0` for mutations (a
transfer must never be silently repeated).

Any client component under the provider can use `useQuery` / `useMutation`:

- `src/components/dashboard/RecentActivityFeed.tsx` — reads the activity feed
  through `useQuery(["dashboard", "recent-activity"])`.
- `src/hooks/useSendDraft.ts` — `useMutation` for the send-draft step (below).

In tests, wrap the component under test with `ReactQueryTestProvider` from
`src/test/reactQueryWrapper.tsx` (retries disabled).

---

## Send flow draft — `useSendDraft` + `POST /api/send/draft` (issue #616)

`SendDraftScreen` captures `{ destination, amount }` and calls
`useSendDraft().mutate(...)`, which posts to `POST /api/send/draft`.

Route behavior (`src/app/api/send/draft/route.ts`):

| Condition | Result |
|---|---|
| `NEXT_PUBLIC_API_URL` (or alias) set | Proxied to `${backend}/send/draft`; upstream status/body passed through; network failure ⇒ `502` |
| No backend URL, **non-production** | Local mock preview (`{ valid: true, mock: true, fee, estimatedArrival }`) |
| No backend URL, **production build** | `501` — **never** a fabricated success |
| Missing/empty destination or amount, non-positive amount | `400` |

`useSendDraft({ demo: true })` resolves the preview locally without touching
the network — used by the `/demo` tree, which has no authenticated session.
Production callers must not pass `demo`.

Custody note: no secrets are involved on the client — the draft step only
sends a destination address and amount, and the signed send itself is a
`mux-backend` concern.

Tests:

- `src/app/api/send/draft/route.test.ts`
- `src/components/wallet/__tests__/SendDraftScreen.test.tsx`
- `src/lib/reactQuery/__tests__/ReactQueryProvider.test.tsx`
