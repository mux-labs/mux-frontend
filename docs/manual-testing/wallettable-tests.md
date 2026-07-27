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

## Manual checklist
- [ ] On `/dashboard/wallets`, tab into the table and press `Escape` — focus
      stays put, nothing navigates.
- [ ] Arrow through rows on desktop — only the active row shows a focus ring.
- [ ] Filter/remove a wallet while a row near the end of the list is focused
      — no console error, table re-renders cleanly.
- [ ] On a narrow (375px) viewport, tap a mobile wallet card — navigates to
      that wallet's detail page, not another one.
- [ ] Run `npx vitest run WalletTable` — all WalletTable test files pass.
