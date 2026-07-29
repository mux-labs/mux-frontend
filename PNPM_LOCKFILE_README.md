# Keep pnpm lockfile as the only package lock

## What was implemented

- `package.json` — added `"packageManager": "pnpm@9.15.4"` (enables
  Corepack to enforce the exact pnpm version) and an `engines` block that
  fails npm/yarn with an explicit `please-use-pnpm` message if someone tries
  to install with them directly. Added a `preinstall` script that runs
  `scripts/verify-pnpm.js`.
- `scripts/verify-pnpm.js` — inspects `npm_config_user_agent` (set by every
  package manager) at install time and hard-fails with instructions if the
  installer isn't pnpm. This is the first line of defense - it fires before
  any dependency resolution happens, so a `npm install` never gets far
  enough to generate a `package-lock.json`.
- `.npmrc` — sets `package-manager-strict=true` (Corepack enforces the
  `packageManager` field) and `engine-strict=true`.
- `.gitignore` — explicitly ignores `/yarn.lock` and `/npm-shrinkwrap.json`
  in addition to the pre-existing `/package-lock.json` rule, so an
  accidental lockfile from another package manager can never be committed.
- `.github/workflows/ci.yml` — added a "Verify pnpm lockfile is the only
  lockfile" step that fails the build if `package-lock.json`, `yarn.lock`,
  or `npm-shrinkwrap.json` exist in the repo, before `pnpm install
  --frozen-lockfile` runs.
- `src/lib/__tests__/pnpmLockfile.test.ts` — Vitest coverage asserting
  `pnpm-lock.yaml` exists, that no competing lockfiles exist, and that
  `package.json` declares a `pnpm@` `packageManager`.

## Why

Multiple lockfiles (e.g. a stray `package-lock.json` committed by someone
running plain `npm install`) cause dependency resolution to silently drift
between contributors/CI and can reintroduce vulnerable or duplicate
transitive versions that `pnpm-lock.yaml` had already deduped/pinned. This
change makes pnpm the only supported installer at three layers: local
install-time (`preinstall` script + Corepack), source control
(`.gitignore`), and CI (explicit lockfile check + `--frozen-lockfile`).

## Manual verification checklist

- [ ] Run `npm install` locally - it should fail immediately with the
      "This repository only supports pnpm" message.
- [ ] Run `pnpm install` - it should proceed normally.
- [ ] Confirm CI's new "Verify pnpm lockfile is the only lockfile" step
      passes on a clean checkout.
- [ ] `pnpm test -- pnpmLockfile` passes locally.
