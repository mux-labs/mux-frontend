# Route-level loading.tsx for /dashboard

## What was implemented

- `src/app/dashboard/loading.tsx` — a Next.js App Router segment loading
  file that Next automatically wraps around `src/app/dashboard/layout.tsx`'s
  children in a `<Suspense>` boundary. It renders while a dashboard route
  segment (and any nested segment without its own `loading.tsx`, e.g.
  `/dashboard/users`) is being fetched/streamed in on navigation.
- Reuses the existing `Skeleton` primitive (`src/components/ui/Skeleton.tsx`)
  so the placeholder matches the visual language already used elsewhere
  (e.g. `src/app/demo/dashboard/loading.tsx`, `WalletTableSkeleton`).
- Marked with `role="status"`, `aria-busy="true"`, `aria-live="polite"`, and a
  screen-reader-only label so assistive tech announces the loading state
  (matches the accessibility pattern already used in `WalletDetailSkeleton`).
- `src/app/dashboard/__tests__/loading.test.tsx` — Vitest/RTL coverage
  asserting the accessible status region and that skeleton placeholders are
  rendered instead of empty content.

## Why this doesn't affect existing pages

Pages like `/dashboard/wallets` already manage their own client-side
loading/empty/error states via `useWallets()`. The new `loading.tsx` only
governs the Next.js navigation-time Suspense fallback (i.e. the moment
between clicking a sidebar link and the new route's JS/RSC payload
resolving) - it does not replace or conflict with in-page data-fetching
states.

## Manual verification checklist

- [ ] Throttle network in devtools, navigate between `/dashboard` and a
      nested route (e.g. `/dashboard/users`) - skeleton briefly appears.
- [ ] Confirm sidebar/topbar remain visible during the loading state (layout
      stays mounted since `loading.tsx` sits below `layout.tsx`).
- [ ] Check on a narrow mobile viewport (375px) - skeleton layout doesn't
      overflow horizontally.
- [ ] Verify with a screen reader that the loading state is announced.
