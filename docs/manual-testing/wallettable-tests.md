# WalletTable component tests — what was implemented

`WalletTable` already had extensive coverage across seven existing test files
(rendering, keyboard navigation, responsive layout, copy-to-clipboard UX,
accessibility, and integration with `NetworkBadge`/`StatusIndicator`). This
change adds `WalletTable.navigation-edge-cases.test.tsx`, focused on gaps not
exercised by the existing suite:

- Unhandled keys (`Escape`, letter keys) are no-ops — no navigation, no focus
  change.
- `Enter`/`Space` navigate to the correct wallet id on non-first/last rows,
  not just the first row.
- Exactly one row carries the keyboard focus ring at a time.
- The table doesn't throw when the `wallets` prop shrinks while a row near
  the end of the (now-removed) range was focused — a regression-prone case
  for the `rowRefs` array.
- The `sr-only` table caption is present for screen readers.
- Every mobile card links to its own wallet's detail page.
- Mounting the table alone never triggers a router navigation.

## Empty / error / loading states (issue #760)

The Wallets table must render exactly one of four mutually exclusive states,
never a mix, and must fail closed on fetch failure:

- **Loading** — while the wallet list request is in flight, render the
  skeleton rows (see `ROUTE_LOADING_README.md` for the shared loading
  pattern). Do not render any wallet rows or counts until the request
  settles.
- **Empty** — when the request succeeds with zero wallets, render the empty
  state from `docs/manual-testing/emptystate-stories.md` (illustration +
  "No wallets yet" copy + primary "Create wallet" action). Never render an
  empty table body with headers only.
- **Error** — when the request fails, render the error state with an
  actionable, non-secret-leaking message and a stable error code plus
  correlation id when the API client supplies one. Do not surface raw
  response bodies, stack traces, JWTs, or key material.
- **Success** — only render wallet rows when the request succeeded and the
  payload validated. On failure, do **not** keep showing stale or partial
  wallet data as if it were valid; the error state replaces the rows.

### Manual checklist
- [ ] On `/dashboard/wallets`, tab into the table and press `Escape` — focus
      stays put, nothing navigates.
- [ ] Arrow through rows on desktop — only the active row shows a focus ring.
- [ ] Filter/remove a wallet while a row near the end of the list is focused
      — no console error, table re-renders cleanly.
- [ ] On a narrow (375px) viewport, tap a mobile wallet card — navigates to
      that wallet's detail page, not another one.
- [ ] Throttle the network so the wallet request is slow — skeleton rows show
      and no wallet rows/counts appear until it settles.
- [ ] Load `/dashboard/wallets` with an account that has no wallets — the
      empty state (illustration + "Create wallet" action) shows, not a bare
      table.
- [ ] Force the wallet request to fail (offline / 5xx) — the error state
      shows with an error code and correlation id, and no stale wallet rows
      remain visible.
- [ ] Confirm the error copy contains no tokens, JWTs, or key material.
- [ ] Run `npx vitest run WalletTable` — all WalletTable test files pass.
