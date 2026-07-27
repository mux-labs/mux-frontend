# EmptyState Storybook stories — what was implemented

`src/components/ui/EmptyState.tsx` had no Storybook coverage even though it's
reused across the wallets, wallet-detail, and transactions views. Added
`EmptyState.stories.tsx` with 8 stories mirroring the real call sites in the
app:

- **Default / NoWallets / NoWalletData** — match the exact copy used on the
  wallets dashboard (`src/app/wallet/page.tsx`) and wallet detail view.
- **NoFilteredResults** — zero-results-after-filtering scenario.
- **CustomIcon / NoAction / LongContent** — prop-shape edge cases (custom
  icon, no CTA, long text wrapping).
- **DarkMode** — verifies contrast in a `.dark` wrapper.

Also extended `src/test/components/ui/EmptyState.test.tsx` with edge cases
that weren't covered yet: custom icon suppresses the default SVG, long
text doesn't get clipped, the action handler isn't re-bound/double-fired
across re-renders, and dark-mode rendering.

## Manual checklist
- [ ] `npm run storybook`, open `UI/EmptyState` — confirm all 8 stories
      render, action buttons log a click in the Actions panel.
- [ ] Compare `NoWallets` story visually against `/dashboard/wallets` with an
      empty wallet list — copy and layout should match.
- [ ] Resize to a narrow (375px) viewport on `LongContent` — text wraps
      cleanly, action button stays reachable without horizontal scroll.
- [ ] Run `npx vitest run EmptyState` — all EmptyState test files pass.
