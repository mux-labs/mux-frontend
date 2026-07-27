# Playwright smoke tests

End-to-end smoke coverage for the two highest-traffic flows in the
developer console: **login** and **wallet monitoring**. These specs run
against a real `next dev` server (see `playwright.config.ts`) and exercise
the same API routes the browser hits in local dev, testnet, and mainnet
configurations.

## Running

```bash
pnpm exec playwright install --with-deps chromium
pnpm run test:e2e          # headless, both desktop + mobile projects
pnpm run test:e2e:ui       # interactive UI mode for debugging
```

Set `PLAYWRIGHT_BASE_URL` to point the suite at an already-running server
(e.g. a deployed preview) instead of spawning `next dev`.

## What's covered

| Spec | States covered |
| --- | --- |
| `login.spec.ts` | empty/welcome state, field validation errors, password visibility toggle, successful sign-in + redirect, failed sign-in error card |
| `wallets.spec.ts` | auth redirect for signed-out visitors, sidebar navigation into the page, error state, empty state, populated table, add-wallet modal |

Both specs run under two Playwright projects — `desktop-chromium` and
`mobile-chromium` (Pixel 7 viewport) — so layout regressions on narrow
screens are caught automatically instead of relying on manual checks.

## Manual verification checklist

Automated coverage above satisfies the primary path. When touching
login or wallet UI, also manually confirm:

- [ ] Desktop viewport (≥1280px): login card and wallet table are legible,
      no horizontal scroll.
- [ ] Narrow mobile viewport (375px): login form fields stack correctly,
      wallet table becomes horizontally scrollable or collapses to cards,
      the sidebar nav collapses into the mobile menu.
- [ ] Dark mode renders correctly for both pages.
- [ ] Testnet vs. mainnet wallet rows show the correct network badge.
