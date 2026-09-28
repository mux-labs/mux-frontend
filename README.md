# Mux Frontend

Mux Protocol provides invisible wallets and account abstraction on Stellar/Soroban.
This repository contains the Mux frontend.

## Source maps production policy

Source maps are a **development-only** affordance. Shipping readable source maps
to production would expose internal module structure, comments, and any
accidentally-inlined values to anyone who opens devtools — an information
disclosure risk on a wallet/AA surface. The policy is therefore **fail-closed**:
production builds never emit browser source maps.

- **Production (`NODE_ENV=production`):** browser source maps are **disabled**.
  `next.config.ts` sets `productionBrowserSourceMaps: false`, so no `.map` files
  are emitted and devtools cannot reconstruct the original sources.
- **Development / test:** source maps are **enabled** (Next.js default) so
  contributors get readable stack traces and can debug locally.
- **Fail-closed:** the setting is pinned to `false` in the config rather than
  left to an environment variable, so a misconfigured deploy cannot silently
  turn production source maps back on. Any future change to this setting must
  update the policy here and the gating test below.

This policy is enforced by an automated test (`tests/ci-workflow.test.ts`) that
asserts `productionBrowserSourceMaps` is `false`, so the guarantee cannot
regress unnoticed. See [`docs/security-ux-guards.md`](docs/security-ux-guards.md)
for the broader security/UX invariants and `tests/e2e/` for end-to-end coverage.

## Toolchain and CI docs

- [`docs/node-engine.md`](docs/node-engine.md) — Node.js version policy
  (`engines.node`, enforced at install time; never below Node 18).
- [`docs/deterministic-css-build.md`](docs/deterministic-css-build.md) —
  invariants that keep the Tailwind/PostCSS output byte-identical.
- [`docs/e2e-real-backend-testing.md`](docs/e2e-real-backend-testing.md#secrets-handling)
  — real-backend e2e variables and secrets handling.

All three are guarded by `tests/ci-workflow.test.ts` and
`tests/e2e-real-backend.config.test.ts`, which run in the required
`Unit tests (Vitest)` CI job.

## Error boundary behaviors

Wallet, account-abstraction, and payment surfaces are wrapped in a typed **error
boundary** so a failure in one subtree cannot blank the whole app or leak
internals. The boundary is **fail-closed** and **deny-by-default**: on any
unexpected error it renders a safe fallback and never exposes privileged
surfaces or raw error material.

- **Typed entrypoint**: the boundary is a typed component that takes an explicit
  `fallback` renderer and an optional `onError` reporter. Callers cannot mount a
  boundary without wiring the fallback, so a crash can never silently dead-end.
- **Stable error codes**: every surfaced failure carries a stable, actionable
  code so the UI can render precise copy and correlate incidents:
  - `BOUNDARY_RENDER_FAILED` — a child subtree threw during render.
  - `BOUNDARY_DEPENDENCY_UNAVAILABLE` — a required dependency (RPC/DB/Horizon)
    was unreachable; writes fail closed rather than proceeding optimistically.
  - `BOUNDARY_AUTH_EXPIRED` — the session/JWT expired mid-flight.
  - `BOUNDARY_AUTH_FORBIDDEN` — the caller lacks the required role, or a
    delegate/guardian was revoked; the action is denied by default.
  - `BOUNDARY_UNKNOWN` — an unclassified failure; treated as fail-closed.
- **Correlation ids**: each surfaced error includes a correlation id (generated
  at the boundary, propagated from the request when present) so ops can trace a
  user-visible failure to server logs without exposing the underlying error.
- **Fail-closed on writes**: when a dependency is unavailable the boundary
  blocks the write path and surfaces `BOUNDARY_DEPENDENCY_UNAVAILABLE`; it never
  reports success or retries a money-path write optimistically.
- **Authz errors surface, never bypass**: expired auth, wrong role, and revoked
  delegates are surfaced through the boundary as `BOUNDARY_AUTH_EXPIRED` /
  `BOUNDARY_AUTH_FORBIDDEN`. The boundary never swallows an authz failure to
  keep rendering a privileged surface.
- **No secrets**: the boundary never logs or renders raw key material, JWTs,
  webhook secrets, or full addresses. Only the stable error code, a redacted
  message, and the correlation id are surfaced to the UI and to telemetry.
- **Ops-safe observability**: the `onError` reporter emits the stable code and
  correlation id (plus a redacted stack in non-production) so failures are
  actionable without leaking secrets.

See [`docs/security-ux-guards.md`](docs/security-ux-guards.md) for the
security/UX invariants and `tests/e2e/` for the end-to-end coverage of the
error-boundary flow.

## Settings danger zone confirm phrase

The Settings **danger zone** (account deletion, key rotation, recovery reset,
and other irreversible actions) is gated behind a typed **confirm-phrase guard**.
Destructive actions stay disabled until the operator types the exact phrase, and
the guard is **fail-closed**: empty, mismatched, or adversarial input never
unlocks the action.

- **Typed guard**: the danger zone uses a typed confirm-phrase guard that takes
  the expected phrase and the current input and returns a discriminated result
  (`ok` / `mismatch` / `empty` / `locked`). Callers cannot invoke the destructive
  handler directly — the handler is only reachable through the guard, so there
  is no bypass path.
- **Normalization rule**: input is compared after trimming leading/trailing
  whitespace and collapsing internal whitespace runs to a single space. The
  comparison is **case-sensitive** — the phrase must match exactly after
  whitespace normalization. This is the documented rule; do not loosen it.
- **Stable state codes**: the guard returns stable, actionable codes so the UI
  can render precise messages and correlate failures:
  - `CONFIRM_PHRASE_EMPTY` — no phrase entered; action stays disabled.
  - `CONFIRM_PHRASE_MISMATCH` — phrase does not match; action stays disabled.
  - `CONFIRM_PHRASE_LOCKED` — the danger zone is locked (e.g. after a failed
    attempt or while a prior destructive action is in flight); action stays
    disabled until the lock clears.
- **Fail-closed**: on any non-`ok` result the destructive action remains
  disabled and the handler is never called. Oversized input is rejected rather
  than truncated, and the confirm step is idempotent — re-submitting the same
  confirmed action does not re-run the destructive handler.
- **No secrets**: the guard never logs or renders raw key material, JWTs, or
  secrets; only the stable state code and a correlation id are surfaced.

See [`docs/security-ux-guards.md`](docs/security-ux-guards.md) for the
security/UX invariants and `tests/e2e/` for the end-to-end coverage of the
danger-zone flow.

## Empty project CTA

When a user has no wallets/projects yet, the app renders an **empty project
CTA** instead of a blank or broken dashboard. The CTA is the single, typed
entrypoint for the empty state and is deliberately **deny-by-default**: it only
offers the non-privileged "create your first wallet" action and never exposes
admin, recovery, or spend surfaces.

- **Typed entrypoint**: the empty state is rendered by a typed component that
  takes an explicit `onCreate` callback and an optional `error` prop. Callers
  cannot render the CTA without wiring the primary action, so the empty state
  can never silently dead-end.
- **Stable, accessible copy**: the heading, description, and primary button use
  fixed copy with an associated `<h2>`/`<button>` relationship and a visible
  focus indicator, so the CTA is announced correctly by assistive technology
  and is fully keyboard-operable.
- **Fail-closed**: if the create action fails, the CTA surfaces an actionable
  error (with a stable error code) and keeps the primary action available for
  retry — it never reports success or navigates on failure. No secrets, keys,
  or JWTs are ever placed in the CTA copy, props, or logs.
- **Deny-by-default**: the CTA does not render privileged actions (spending
  limits, recovery, delegate management). Those remain gated behind their own
  authorized surfaces.

See [`docs/security-ux-guards.md`](docs/security-ux-guards.md) for the
security/UX invariants and `tests/e2e/` for the end-to-end coverage of the
empty-state flow.

## Receive QR + network badge

The wallet receive view renders a scannable QR that encodes the wallet's
Stellar/Soroban receive address, together with an unambiguous network badge
(`testnet` vs `mainnet`).

- **QR payload**: the receive address is encoded using the standard Stellar URI
  scheme (`web+stellar:pay?destination=<address>`), so any Stellar-compatible
  wallet can scan and pre-fill the destination. The raw address is also shown as
  text for manual copy.
- **Network badge**: the badge is derived from configuration, never hard-coded.
  The network is resolved from `NEXT_PUBLIC_STELLAR_NETWORK` (falling back to the
  app's configured network).
- **Fail-closed**: if the network is unknown or misconfigured, the receive view
  refuses to render a QR/badge and surfaces an actionable error instead of
  silently defaulting to mainnet. This prevents a user from sending funds to the
  wrong network.

See [`docs/security-ux-guards.md`](docs/security-ux-guards.md) for the
security/UX invariants that back this behavior, and `tests/e2e/` for the
end-to-end coverage of the receive flow.

## Copy address clipboard UX

Copying a wallet address must be reliable and fail-closed: the UI never reports
success unless the address actually reached the clipboard.

- Use the shared `useCopyAddress` hook (or `copyAddress` helper) instead of
  calling `navigator.clipboard` directly. It returns a typed result with stable
error codes so callers can render actionable messages and correlate failures.
- Stable error codes:
  - `CLIPBOARD_UNAVAILABLE` — the Clipboard API is missing (insecure context,
    unsupported browser, or blocked by policy).
  - `CLIPBOARD_PERMISSION_DENIED` — the user or browser denied clipboard write.
  - `CLIPBOARD_WRITE_FAILED` — the write was attempted but rejected/failed.
- On any failure the UI must surface the error and offer a manual-copy fallback
  (a selectable, read-only address field) rather than silently succeeding.
- Never log or emit raw address/key material to telemetry; redact addresses in
  logs and metrics.

See `docs/security-ux-guards.md` for the broader security/UX guardrails.

## Spending limits accessibility

The spending-limits controls are fully operable with assistive technology and
the keyboard:

- **Labels & descriptions**: every limit input, toggle, and action button has an
  associated `<label>` (via `htmlFor`/`id`) and help text wired through
  `aria-describedby`, so screen readers announce the control's purpose and the
  current value.
- **Validation state**: inline errors are exposed with `role="alert"` and
  `aria-invalid` on the offending field, so validation failures are announced
  immediately.
- **Dynamic updates**: saving a limit, a validation error, and loading states are
  announced through polite/assertive live regions (`aria-live`), without ever
  echoing secrets or key material.

See [`docs/security-ux-guards.md`](docs/security-ux-guards.md) for the
security/UX invariants and `tests/e2e/` for the end-to-end coverage of the
spending-limits flow.

## UI component conventions

All UI components follow the typed-entrypoint, fail-closed, deny-by-default
conventions documented in [`docs/ui-component-conventions.md`](docs/ui-component-conventions.md).
Key rules: typed props, stable error codes, correlation ids, accessible markup,
no secrets in props/logs/copy, and a Storybook story for every visible surface.

## Session timeout warning

The app renders a **session timeout warning** when the authenticated session is
within 2 minutes of expiry. The warning is fail-closed: it never silently keeps
the user signed in if the extend call fails, and it never leaks raw tokens or
keys in the UI or telemetry. See `src/components/SessionTimeoutWarning.tsx` and
`tests/e2e/session-timeout.spec.ts`.

## Team invite/remove RBAC

The Settings **team management** page (`/dashboard/settings/team`) lets admins
add and remove team members. It is deny-by-default: only `admin`-role sessions
see the invite form and remove buttons; `developer` sessions get a read-only
view. The API route (`/api/team`) enforces the same policy server-side so the
UI cannot be bypassed. See `src/components/TeamManagement.tsx`,
`src/app/api/team/route.ts`, `docs/team-access-and-audit-log.md`, and
`tests/e2e/team-management.spec.ts`.

## Quality gates

| Command | Purpose |
| --- | --- |
| `pnpm run lint` | ESLint, including `jsx-a11y` rules for interactive elements (keyboard handlers, focusability, roles). |
| `pnpm run typecheck:unused` | Type-check with `noUnusedLocals` / `noUnusedParameters` (`tsconfig.unused.json`). Opt-in until existing unused code is cleaned up. |
| `pnpm run analyze:bundle` | After `pnpm run build`, prints the largest client chunks and fails if gzip size exceeds `BUNDLE_BUDGET_TOTAL_KB` (default 1500) or `BUNDLE_BUDGET_CHUNK_KB` (default 350). Runs in CI after the build. |
| `pnpm run test:visual` | Optional Playwright screenshot comparison (`tests/visual/`). Never part of the smoke/full tiers; refresh baselines with `pnpm run test:visual:update`. |

## Rate limits, maintenance, and feature-flagged sends

- **429 Retry-After UX:** reads auto-retry briefly and writes never do. The
  UI shows a countdown and gates the retry control on `Retry-After`. See
  [docs/security-ux-guards.md#429-retry-after-ux](docs/security-ux-guards.md#429-retry-after-ux).
- **Maintenance 503 UX:** planned maintenance (`x-mux-maintenance: true`)
  and dependency outages both keep writes disabled, and the UI shows fixed
  copy (never server text). See
  [docs/security-ux-guards.md#maintenance-503-ux](docs/security-ux-guards.md#maintenance-503-ux).
- **Feature-flagged send flows:** `POST /api/transactions/send` is off
  unless `MUX_SEND_FLOWS_ENABLED=true`. `MUX_SEND_KILL_SWITCH` overrides
  everything, and mainnet needs `MUX_SEND_MAINNET_ENABLED=true`. See
  [docs/security-ux-guards.md#feature-flagged-send-flows](docs/security-ux-guards.md#feature-flagged-send-flows)
  and [docs/frontend-env-vars.md](docs/frontend-env-vars.md).
- **Audit log pagination:** `GET /api/activity` uses opaque, filter-bound
  keyset cursors. See
  [docs/team-access-and-audit-log.md#audit-log-pagination](docs/team-access-and-audit-log.md#audit-log-pagination).

E2E coverage: `tests/e2e/send-flow-flags.spec.ts` and
`tests/e2e/audit-log-pagination.spec.ts`.
