# Hide archived wallets unless toggled

## What changed
- `src/types/wallet.ts` — added an optional `archived?: boolean` field to the `Wallet` model.
- `src/mock-data/wallets.ts` — marked two existing mock wallets (`wallet-005`, `wallet-009`) as `archived: true` so the toggle has data to exercise.
- `src/app/dashboard/wallets/page.tsx`:
  - Wallets are filtered to hide `archived` entries by default (`visibleWallets`).
  - A "Show archived (n)" checkbox appears next to the page header, but only when at least one archived wallet exists.
  - Checking the toggle reveals archived wallets alongside active ones in the existing `WalletTable`.
  - Added a dedicated empty state ("No wallets to show") for the case where every wallet is archived and the toggle is off, distinct from the "no wallets at all" empty state.
- `src/app/dashboard/wallets/page.archived-toggle.test.tsx` — new Vitest/RTL coverage:
  - Archived wallets are hidden by default.
  - Toggling the checkbox reveals them.
  - The toggle doesn't render when there are no archived wallets.
  - The "all archived" empty state renders when appropriate.

## Why a client-side filter
`useWallets` already fetches the full wallet list for the page; filtering client-side avoids a new API surface for this stub-level toggle while keeping the loading/error/empty states from the existing hook intact.

## Manual verification checklist
1. Desktop (≥1024px): open `/dashboard/wallets` with the mock API. Confirm archived wallets (wallet-005, wallet-009) are absent and the "Show archived (2)" checkbox is visible.
2. Check the box — table grows to include the archived wallets; row count label updates.
3. Uncheck — archived wallets disappear again, no page reload.
4. Narrow mobile viewport (375px): repeat the same steps using the mobile card list; checkbox and label remain reachable and readable above the list.
5. Confirm existing wallet-detail deep links and the Add Wallet flow are unaffected.
