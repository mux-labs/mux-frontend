# Per-key API usage analytics

Implements the "Per-key usage analytics" roadmap item from `README.md`.

## What this adds

* `GET /api/api-keys/[id]/usage` — proxies to `${NEXT_PUBLIC_API_URL}/api-keys/:id/usage`
  (or its legacy aliases) when a backend is configured. Returns `503
  backend_unavailable` instead of mock data when no backend is configured in
  a production build (`NODE_ENV=production`), matching the "no silent mock
  success in production" rule documented in the root `README.md` and
  enforced by `isMockFallbackAllowed()` in `src/lib/api/config.ts`.
* `src/mock-data/api-key-usage.ts` — dev/CI-only mock usage generator, used
  only as a fallback outside production when no backend is configured.
* `src/hooks/useApiKeyUsage.ts` — client hook with the same
  loading/error/refetch shape as `useApiKeys`/`useWallets`.
* `src/components/dashboard/ApiKeyUsageAnalytics.tsx` — renders total
  requests, requests in the last 24h, last-used timestamp, and a 14-day
  request volume chart for one API key.
* `src/app/dashboard/api-keys/[id]/usage/page.tsx` — a new page at
  `/dashboard/api-keys/<id>/usage` that renders the analytics for a given
  key id (protected by the existing `/dashboard` auth middleware).

## Data source

Same rule as the rest of the app: when `NEXT_PUBLIC_API_URL` (or a legacy
alias) is set, usage data comes from the real mux-backend
(`GET {backend}/api-keys/:id/usage`) via server-side credentials
(`MUX_API_KEY`/`MUX_API_SECRET`, attached server-side only — never exposed
to the browser). No client-visible Mux credential is introduced by this
feature, and no data is written to `localStorage`.

## Backend contract expected

`GET {backend}/api-keys/:id/usage` should return a JSON body shaped like
`ApiKeyUsageSummary` in `src/mock-data/api-key-usage.ts`:

```ts
{
  apiKeyId: string;
  totalRequests: number;
  requestsLast24h: number;
  lastUsedAt: string | null; // ISO timestamp
  dailyRequests: { date: string; requests: number }[]; // last 14 days, oldest first
}
```
