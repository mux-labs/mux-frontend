# ErrorBoundary around dashboard pages

## What was implemented

- `src/components/dashboard/DashboardErrorBoundary.tsx` — a client
  component that logs the caught error (`console.error`, same pattern as
  the existing root-level `GlobalErrorBoundary`) and renders the existing
  `ErrorState` UI primitive (`src/components/ui/ErrorState.tsx`) with a
  "Try again" action wired to Next's `reset()`.
- `src/app/dashboard/error.tsx` — the Next.js App Router segment error
  file. Next automatically wraps `src/app/dashboard/layout.tsx`'s children
  in an error boundary that renders this component whenever a rendering
  error is thrown anywhere under `/dashboard/**` that isn't already caught
  by a more specific `error.tsx`.
- `src/components/dashboard/__tests__/DashboardErrorBoundary.test.tsx` —
  covers: error message rendering, the retry button invoking `reset()`, the
  fallback copy when `error.message` is empty, and that the error is logged.

## Why this is scoped correctly

Because `error.tsx` lives in the same segment as `layout.tsx`
(`src/app/dashboard/`), the `DashboardLayout` (sidebar + topbar) stays
mounted when a page throws - only the page content area is replaced with
the error UI. This avoids the "No regressions in closely related dashboard
navigation" failure mode: the sidebar's links (including the wallets
prefetch-on-hover behavior) keep working even while one page is in an error
state, so the user can navigate away without a full reload.

This complements, rather than duplicates, the existing root-level
`src/app/error.tsx` + `GlobalErrorBoundary`, which still catches errors
thrown outside of `/dashboard` (or inside `layout.tsx`/`RootLayout` itself).

## Manual verification checklist

- [ ] Temporarily `throw new Error("test")` inside a dashboard page body,
      confirm the dashboard error UI renders with sidebar still visible.
- [ ] Click "Try again" and confirm `reset()` re-renders the segment.
- [ ] Check on a narrow mobile viewport (375px) - error card doesn't
      overflow horizontally.
- [ ] Confirm the error is logged to the console for observability.
