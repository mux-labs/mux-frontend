# Node.js engine policy

Issue #817 ("engines node>=18 enforced").

## Invariants

- `package.json#engines.node` is the single source of truth for the supported
  Node.js version. It must be a `>=X[.Y.Z]` range.
- The floor is never below **Node 18**. The declared range may be stricter and
  currently is: `>=22`, because Next.js 16 requires `>=20.9.0` and CI runs
  Node 22. The guard test also fails if `engines.node` ever drops below what
  the installed `next` declares.
- `.nvmrc` and every `actions/setup-node` `node-version` in
  `.github/workflows/ci.yml` must satisfy `engines.node`.

## Enforcement (fail-closed)

1. `.npmrc` sets `engine-strict=true`.
2. The `preinstall` hook runs `scripts/check-node-engine.mjs` before any
   dependency is resolved. It exits non-zero with a stable error code:

   | Code                      | Meaning                                                   |
   | ------------------------- | --------------------------------------------------------- |
   | `ENGINE_UNSUPPORTED_NODE` | The running Node does not satisfy `engines.node`.         |
   | `ENGINE_RANGE_INVALID`    | `engines.node` is missing or not a `>=` range.            |
   | `ENGINE_RANGE_TOO_LOW`    | `engines.node` declares a floor below Node 18.            |

   The script has no dependencies and never prints anything but the versions
   involved, so it is safe in CI logs.
3. The same hook then runs `scripts/check-package-manager.mjs`, which rejects
   any installer other than pnpm (`PACKAGE_MANAGER_UNSUPPORTED`). The Node
   check runs first so an unsupported Node is reported before anything else.
4. `tests/ci-workflow.test.ts` asserts all of the above on every PR.

## Contributors

Run `nvm use` (reads `.nvmrc`) before `pnpm install`. If install fails with
`ENGINE_UNSUPPORTED_NODE`, upgrade Node; do not edit `engines` to pass.

## Rollback

Raising or lowering the floor is a one-line change to `engines.node` (plus
`.nvmrc` / CI pins, which the guard test keeps in sync). Removing the
`preinstall` hook disables the check without touching anything else.
