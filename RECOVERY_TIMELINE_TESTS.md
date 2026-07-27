# RecoveryTimeline: Component Test Coverage

**Issue**: Add component tests for RecoveryTimeline
**Status**: Complete

## Overview

`RecoveryTimelineList` and `RecoveryTimelineEvent` already had large test suites. This
change closes the remaining gaps called out in the issue's acceptance criteria — the
tests were still on the legacy `jest.*` global shim, and there was no coverage
proving the mobile-first responsive classes actually render, which is the main
signal the codebase has for "verify on a narrow mobile viewport" since Tailwind
breakpoints aren't otherwise exercised by jsdom.

## What changed

### `src/components/recovery/__tests__/RecoveryTimelineEvent.test.tsx`
- Replaced `jest.fn()` with `vi.fn()` and added an explicit `import { vi } from "vitest"`,
  removing the file's last dependency on the global `jest` compatibility shim in
  `src/test/setup.tsx`.
- Added a `Responsive layout (narrow mobile viewport)` block asserting:
  - the title/description/timestamp row is `flex-col` by default and only becomes
    `sm:flex-row` from the `sm` breakpoint up
  - the dot/content gap is tighter on mobile (`gap-2`) than on larger screens (`sm:gap-4`)
  - the timestamp keeps `whitespace-nowrap` so it can't collapse the row on narrow
    screens

### `src/components/recovery/__tests__/RecoveryTimelineList.test.tsx`
- Same `jest.fn()` → `vi.fn()` migration.
- Added a matching `Responsive layout (narrow mobile viewport)` block covering:
  - the progress header stacking (`flex-col` → `sm:flex-row`)
  - the statistics grid collapsing to one column on mobile and three from `sm` up
  - the empty state using reduced padding (`p-4` → `sm:p-8`) on narrow screens

## Manual verification checklist

- [ ] Load a recovery flow with the timeline on a desktop-width viewport — events
      render title/description/timestamp on one row, stats in a 3-column grid.
- [ ] Resize to a narrow (< 640px) viewport — content stacks vertically, timestamp
      stays on one line, empty state padding shrinks, no horizontal scroll.
- [ ] Confirm keyboard navigation (Arrow keys, Home/End, Enter/Space) still works
      at both widths — unaffected by this change but re-verified alongside it.
- [ ] Confirm dashboard navigation surrounding the recovery timeline is unaffected.

No production code changed — this is test-only coverage.
