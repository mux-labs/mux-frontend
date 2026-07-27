# NetworkBadge Storybook stories — what was implemented

`NetworkBadge.stories.tsx` already existed (Mainnet, Testnet, InvalidFallback,
WithCustomClass, AllVariants). This change extends it with the scenarios that
were still missing:

- **DarkMode** — renders the badge inside a `.dark` wrapper to visually verify
  the `dark:` contrast classes actually used on the wallet detail/table pages.
- **InWalletRow** — shows the badge next to a truncated address, matching how
  it's actually composed inside `WalletTable` / `WalletDetail`, as a quick
  visual regression check for that layout.
- **CompactSize** — a dense `className` override, guarding against label
  clipping when the badge is squeezed into tight table cells.

`NetworkBadge.stories.test.tsx` (new) exercises the same fixtures with
Vitest/Testing Library so the behavior behind the new stories is also covered
by the automated suite, not just visually in Storybook.

## Manual checklist
- [ ] `npm run storybook`, open `Wallet/NetworkBadge` — confirm all 8 stories
      render without errors, including the new DarkMode/InWalletRow/CompactSize.
- [ ] Toggle Storybook's background/theme toolbar on `DarkMode` — badge text
      stays readable (WCAG AA) against the dark background.
- [ ] Resize the Storybook viewport to a narrow mobile width — `InWalletRow`
      doesn't overflow or wrap awkwardly.
- [ ] Run `npx vitest run NetworkBadge` — all NetworkBadge test files pass.
