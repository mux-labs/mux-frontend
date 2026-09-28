# Deterministic CSS build

Issue #819. The same commit must always produce byte-identical CSS, on any
machine and in CI.

## Pipeline

`postcss.config.mjs` runs a single plugin, `@tailwindcss/postcss` (Tailwind
v4). Tailwind generates utilities only for class candidates it finds while
scanning source files, so the output depends on exactly two inputs: the
scanned files and the Tailwind version.

## Invariants

1. **Only committed sources are scanned.** Tailwind's automatic source
   detection skips anything git-ignored. Build and test output (`.next/`,
   `out/`, `build/`, `dist/`, `coverage/`, `storybook-static/`,
   `playwright-report/`, `test-results/`) is listed in `.gitignore`, so a
   stale local build can never leak extra classes into the next one.
2. **One pinned Tailwind.** `pnpm-lock.yaml` resolves exactly one
   `tailwindcss` and one `@tailwindcss/postcss` version, and every CI job
   installs with `--frozen-lockfile`.
3. **No order-dependent output.** Tailwind sorts rules deterministically, so
   discovery order and duplicate candidates do not change the emitted CSS.
4. **No extra PostCSS plugins** (e.g. autoprefixer with a drifting
   browserslist database) that could vary output between machines.

All four are asserted in `tests/ci-workflow.test.ts` ("Deterministic CSS
build").

## Adding a PostCSS plugin or CSS source

Pin its version via the lockfile, update the plugin assertion in the test,
and add any new generated directory to `.gitignore`.

## Rollback

The change is configuration-only (`.gitignore` entries plus tests); reverting
the commit restores the previous behavior with no runtime impact.
