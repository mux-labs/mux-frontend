# End-to-end tests

Playwright-based end-to-end coverage for mux-frontend critical paths (wallet,
account abstraction, payments).

## Contributor quickstart

### Prerequisites

- Node.js ≥ 22 and pnpm 9 (`corepack enable && corepack prepare pnpm@9 --activate`)
- Chromium browser for Playwright (`pnpm exec playwright install --with-deps chromium`)

### First-time setup

```bash
git clone <repo>
cd mux-frontend
pnpm install
pnpm exec playwright install --with-deps chromium
```

No secrets are required for the default mock-backed suite. Copy `.env.example`
to `.env.local` if you need to override `NEXT_PUBLIC_API_URL`; leave it empty
to use the in-repo mock routes.

### Running the suite

```bash
# Fast critical-path subset — required check on every PR
pnpm run test:e2e:smoke

# Full suite (all specs under tests/e2e/)
pnpm run test:e2e:full

# Interactive UI mode
pnpm run test:e2e:ui
```

The dev server starts automatically via `webServer` in `playwright.config.ts`.
If a server is already running on port 3000 it will be reused locally.

### Real-backend suite

Specs under `tests/e2e/real-backend/` run against a live Soroban/Horizon
stack and require additional env vars. See `tests/e2e/real-backend/README.md`
for the full runbook. Run the config guard first:

```bash
pnpm exec vitest run tests/e2e-real-backend.config.test.ts
```

### CI context

| Job | Trigger | Blocking |
| --- | --- | --- |
| `e2e-smoke` | every PR / push | yes — required check |
| `e2e-full` | nightly schedule + `workflow_dispatch` | no |
| `coverage-full` | nightly schedule + `workflow_dispatch` | no |

See `.github/workflows/ci.yml` for the full job definitions.

## Smoke vs full projects

The suite is split into two Playwright projects so contributors and CI can run a
fast critical-path check without waiting on the entire e2e suite:

- **`smoke`** — a curated subset of critical-path specs. This is the fast,
  required check that must stay green on every PR.
- **`full`** — the entire `tests/e2e` suite. This runs as a separate job
  (scheduled / non-blocking) so long-running coverage never blocks the fast path.

### Specs in the `smoke` project

- `tests/e2e/login.spec.ts`
- `tests/e2e/wallets.spec.ts`
- `tests/e2e/wallet-send-receive.spec.ts`

All other specs under `tests/e2e/` belong to the `full` project only. Specs are
not duplicated or stubbed — the same files run in both projects when selected.

### Running locally

```bash
# Fast critical-path subset (required check)
npx playwright test --project=smoke

# Entire e2e suite
npx playwright test --project=full

# Both projects (default)
npx playwright test
```

## Rate limit, maintenance, send-flag, and audit pagination specs

These specs run in the `full` project:

- `tests/e2e/audit-log-pagination.spec.ts` — `/api/activity` authz and
  validation, a full cursor walk with no duplicates, cursor replay
  idempotency, and the `/dashboard/activity` UI with `page.route`-mocked
  429 (gated retry, rows kept) and 503 maintenance (fixed copy, no server
  text). The UI tests skip when the page is not reachable.
- `tests/e2e/send-flow-flags.spec.ts` — `/api/transactions/send` is
  deny-by-default under the dev server's default env (no `MUX_SEND_*`
  flags): anonymous → 401, authenticated → flag refusal, and cookie-only
  cross-origin → 403 (CSRF). Enabled-path behaviour is covered by the unit
  tests in `src/app/api/transactions/send/route.test.ts`.

Assertion pattern for the gated retry:

```ts
await expect(page.getByTestId("rate-limit-notice")).toBeVisible();
await expect(page.getByTestId("rate-limit-retry")).toBeDisabled();
await expect(page.getByTestId("maintenance-notice")).toHaveAttribute(
  "data-code",
  "MAINTENANCE",
);
```

## Recovery timeline component tests

The recovery timeline component renders the ordered set of recovery steps for a
wallet/account. Its e2e coverage lives in
`tests/e2e/recovery-timeline.spec.ts` and asserts the invariants below. These
specs run in the `full` project (they are not part of the fast `smoke` subset).

### Invariants (fail-closed)

- **Ordering**: steps render in the canonical recovery order; the timeline never
  reorders or drops a step on re-render.
- **States**: each step renders exactly one terminal state
  (`pending` / `in-progress` / `complete` / `failed`); no step is left in an
  ambiguous or blank state.
- **Idempotency**: replaying a recovery action (double-submit, retried request)
  does not duplicate steps or advance the timeline twice.
- **Fail-closed writes**: when the RPC/Horizon dependency is unavailable, the
  timeline surfaces an actionable error and does not advance a money-path step.
- **Authz (deny-by-default)**: unauthorized, expired, or revoked
  owner/delegate/guardian roles cannot see or act on recovery timeline actions.
- **Adversarial input**: oversized batches and malformed step payloads are
  rejected without rendering partial or spoofed steps.
- **Testnet vs mainnet**: the timeline reflects the configured network; a
  mainnet-affecting action is gated behind the feature flag/kill-switch.

### Assertion pattern

```ts
await expect(page.getByTestId('recovery-timeline')).toBeVisible();
await expect(page.getByTestId('recovery-step')).toHaveCount(expectedSteps);
await expect(page.getByTestId('recovery-step').first()).toHaveAttribute(
  'data-state',
  /^(pending|in-progress|complete|failed)$/,
);
```

Negative (authz) cases assert the action is absent or disabled and that no
recovery write is issued:

```ts
await expect(page.getByTestId('recovery-step-action')).toBeDisabled();
```

## Error boundary support correlation

Render/runtime errors are captured by the app-shell error boundary. Each captured
error is assigned a **stable error code** (e.g. `MUX-EB-<category>`) and a
**correlation id** so support can tie a user-visible failure back to structured
logs.

When a test hits the fail-closed fallback UI, assert on the correlation surface
rather than a blank screen:

- The fallback renders a support reference containing the correlation id.
- The same correlation id is emitted in the structured error log (redacted — no
  secrets, JWTs, webhook secrets, or raw key material).

Example assertion pattern:

```ts
await expect(page.getByTestId('error-boundary-fallback')).toBeVisible();
await expect(page.getByTestId('error-boundary-correlation-id')).toHaveText(
  /^[0-9a-f-]{36}$/,
);
```

### Coverage expectations

- Wallet send/receive paths are wrapped by the boundary at the route level.
- AA and payment flows surface the same fallback + correlation id on failure.
- Failures are fail-closed: no partial money-path action proceeds after a
  captured error.

See `docs/security-ux-guards.md` for the security/UX guardrails this boundary
enforces.

## Flake triage process

E2e tests are the most flake-prone layer because they depend on RPC/Horizon,
network timing, and shared fixtures. Flakes must be triaged, not ignored.

### Invariants (fail-closed)

- A flaky test MUST NOT be silently skipped, `.skip`-ed, or deleted to make CI
  green. Skipping without a quarantine record is a review blocker.
- CI for this package stays **required**. Quarantining a test does not remove
  the required check; it only moves the test out of the blocking set.
- Every quarantined test MUST have an owner, a tracking issue, and an expiry.
  Quarantine without all three is invalid and must be reverted.
- Deny-by-default: only the roles below may quarantine or un-quarantine a test.

### Detection

A test is a flake candidate when it fails intermittently on the same commit
(passes on retry) or fails only in CI, not locally. Capture the failing run,
commit SHA, and a correlation id (the CI run id) in the tracking issue.

### Classification

| Class | Signal | Action |
| --- | --- | --- |
| Infra flake | RPC/Horizon/DB outage, timeout | Retry; if persistent, file infra issue |
| Test flake | Non-deterministic assertion, shared state, timing | Quarantine with owner + expiry |
| Product bug | Deterministic failure on the same commit | Do NOT quarantine; fix the bug |

### Quarantine

1. Open a tracking issue titled `flake: <test name>` with the correlation id
   (CI run id), commit SHA, and observed failure rate.
2. Assign an **owner** (the role that owns the affected path).
3. Add the test to the quarantine list with an **expiry** (default 14 days).
4. Keep the test running in a non-blocking job so it is still observed.

### Ownership and roles

- **Owner**: the engineer/team responsible for the affected path. Can request
  quarantine and is accountable for resolution before expiry.
- **Delegate**: a designated maintainer who can approve quarantine and
  un-quarantine on the owner's behalf.
- **Guardian**: security/availability reviewer who can veto a quarantine that
  would hide a money-path or authz failure, and can force un-quarantine.

New privileged surfaces (quarantine tooling, CI overrides) are deny-by-default
and require an explicit role grant.

### SLAs

- Triage a new flake within **1 business day** of detection.
- Resolve or renew a quarantine before its **expiry** (default 14 days).
- Expired quarantine with no resolution is escalated to the guardian and the
  test is re-enabled (fail-closed) or the tracking issue is closed with a fix.

### Resolution workflow

1. Reproduce locally or via repeated CI runs using the correlation id.
2. Fix the root cause (test or product) and remove the quarantine entry.
3. Confirm the test passes on the required check before closing the issue.
4. If the flake was a product bug, link the fix PR and note the invariant it
   violated.

### Observability

- Flake reports MUST include a correlation id (CI run id) so runs can be
  traced end to end.
- Error messages must be actionable: name the test, the failing step, and the
  correlation id.
- Logs and metrics MUST NOT leak secrets, JWTs, API keys, or raw key material.
  Redact tokens and webhook secrets before logging.

## References

- `README.md`
- `docs/security-ux-guards.md`
