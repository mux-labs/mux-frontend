# Manual checklist: wallet not found

## What changed
- Added `WalletNotFound` (`src/components/wallet/WalletNotFound.tsx`), a dedicated
  not-found state that reuses `ErrorState` and adds the failing wallet id plus a
  link back to `/dashboard/wallets`.
- `WalletDetail` now renders `WalletNotFound` instead of a generic `ErrorState`
  when `useWalletBalance` reports a not-found error, for both testnet and
  mainnet wallets.
- Added `WalletNotFound.test.tsx` covering rendering, the id-specific
  description, the back link, and the `role="status"` live region.

## Manual checklist
- [ ] Visit `/dashboard/wallets/does-not-exist` — see "Wallet not found" with
      the id echoed back and a "← Back to wallets" link.
- [ ] Click the back link — lands on `/dashboard/wallets`.
- [ ] Visit a real wallet id — detail view loads normally (no regression).
- [ ] Repeat both above at a narrow (375px) viewport — layout stays centered
      and readable, link remains tappable.
- [ ] Confirm the same behavior for a testnet-network wallet id that doesn't
      exist (no network-specific branching bug).
- [ ] Screen reader: not-found message is announced once via the `status`
      live region without requiring focus.
