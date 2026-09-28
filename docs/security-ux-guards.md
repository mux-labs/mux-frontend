# Security UX Guards

This document describes the security and UX guardrails that protect Mux
Protocol users, wallets, and money-path operations. It is the canonical
reference for contributors working on session handling, authz, and
fail-closed behavior. For user-facing wording of these guards see
`docs/invisible-wallet-ui-copy-guide.md`.

## Session handling cookie parity

Session cookies MUST be defined by a single source of truth so that the
client and server code paths cannot drift. Any change to cookie attributes
must be made in one place and consumed everywhere.

## Error boundary behaviors

Error boundaries are the last line of defense between a failed privileged
operation and the user. They must **fail closed**: a boundary never converts a
failed or unauthorized operation into an apparent success, and it never exposes
raw error internals, key material, or tokens. This section is the canonical
contract for wallet, account-abstraction, and payment error boundaries.

### Typed entrypoints and stable error codes

Every privileged entrypoint (wallet, AA, payment) is wrapped by a boun

Error boundaries are the last line of defense between a failed privileged
operation and the user. They must **fail closed**: a boundary never converts a
failed or unauthorized operation into an apparent success, and it never exposes
raw error internals, key material, or tokens. This section is the canonical
contract for wallet, account-abstraction, and payment error boundaries.

### Typed entrypoints and stable error codes

Every privileged entrypoint (wallet, AA, payment) is wrapped by a boundary that
returns a discriminated result. Callers branch on the error code, never on
message text. Stable error codes:

| Code | Meaning |
| --- | --- |
| `BOUNDARY_OK` | Operation succeeded; result returned. |
| `BOUNDARY_FORBIDDEN` | Caller is not authorized for the requested scope. |
| `BOUNDARY_AUTH_EXPIRED` | Session/JWT expired; re-auth required. |
| `BOUNDARY_DELEGATE_REVOKED` | Delegate/guardian grant was revoked. |
| `BOUNDARY_INVALID_INPUT` | Input failed validation (unknown key, bad shape). |
| `BOUNDARY_DEPENDENCY_UNAVAILABLE` | RPC/DB/Horizon unavailable; fail closed. |
| `BOUNDARY_RATE_LIMITED` | Too many requests; retry later. |
| `BOUNDARY_UNEXPECTED` | Unclassified failure; treated as failure, never success. |

Every boundary result carries a correlation id propagated to logs and the
user-facing error surface so support can trace a single request. The
correlation id is opaque and never encodes secrets.

### Fail-closed on writes

- Write paths (spends, recovery, admin) reject with
  `BOUNDARY_DEPENDENCY_UNAVAILABLE` when RPC/DB/Horizon is unavailable. They
  never fall back to a cached or optimistic success.
- A boundary that cannot classify an error returns `BOUNDARY_UNEXPECTED` and
  keeps the operation failed; unknown errors are never mapped to success.
- Reads may retry idempotently; writes require an explicit idempotency key so a
  retried request cannot double-spend or double-apply.

### Authorization

- Reads and writes require an authorized owner/delegate/guardian session or a
  scoped API-key/JWT. The server resolves the caller's permitted scope; the
  client cannot request a broader scope than it holds.
- An expired session fails closed with `BOUNDARY_AUTH_EXPIRED`; a revoked
  delegate fails closed with `BOUNDARY_DELEGATE_REVOKED`; a wrong role fails
  closed with `BOUNDARY_FORBIDDEN`. The boundary never substitutes a cached
  result for a failed authorization check.
- Deny by default: a new privileged surface is unauthorized until the server
grants it, so adding a surface cannot leak a previously hidden capability.

### Edge cases and failure modes

- **Concurrent/replayed requests:** writes carry an idempotency key; a replayed
  request returns the original outcome rather than re-applying the effect.
- **Dependency outage:** RPC/DB/Horizon outage fails closed on writes; no silent
  success that could mask a missing spend or recovery.
- **Auth expiry / wrong role / revoked delegate:** fail closed and prompt
  re-auth; the boundary is never used to escalate scope.
- **Adversarial input:** oversized payloads, unknown keys, and malformed shapes
  are rejected with `BOUNDARY_INVALID_INPUT` before any privileged call; entry
  points are rate-limited per session and per IP to prevent griefing.
- **Testnet vs mainnet:** the network is explicit and validated; a mainnet
  operation is never satisfied by testnet state and vice versa.

### Observability

- Emit structured logs with the correlation id, the resolved error code, and
  the operation name (never raw key material, JWTs, webhook secrets, or full
  request bodies).
- Track boundary success/failure counts, rate-limit events, and rejected-input
  counts so ops can alert on abuse or misconfiguration.

### Rollout and rollback

- Changes to error boundary behavior that touch money paths or mainnet behavior
  must land behind a feature flag or kill-switch.
- Document the rollback path in the PR description: disabling the flag must
  restore the previous behavior without data migration.

## Route loading UX

Route loading is a privileged read surface: it resolves a route (and its
associated wallet/AA/payment context) before the user can act on it. It must
follow the same fail-closed, deny-by-default contract as the error boundaries
above. This section is the canonical contract for route loading.

### Typed entrypoints and stable error codes

Route loading is exposed through a typed entrypoint that returns a
discriminated result. Callers branch on the error code, never on message text.
Stable error codes:

| Code | Meaning |
| --- | --- |
| `ROUTE_OK` | Route resolved; result returned. |
| `ROUTE_FORBIDDEN` | Caller is not authorized for the requested route scope. |
| `ROUTE_AUTH_EXPIRED` | Session/JWT expired; re-auth required. |
| `ROUTE_DELEGATE_REVOKED` | Delegate/guardian grant was revoked. |
| `ROUTE_INVALID_INPUT` | Route params failed validation (unknown key, bad shape). |
| `ROUTE_NOT_FOUND` | Route does not exist for the caller's scope. |
| `ROUTE_DEPENDENCY_UNAVAILABLE` | RPC/DB/Horizon unavailable; fail closed. |
| `ROUTE_RATE_LIMITED` | Too many loads; retry later. |
| `ROUTE_UNEXPECTED` | Unclassified failure; treated as failure, never success. |

Every route load carries a correlation id propagated to logs and the
user-facing error surface so support can trace a single request. The
correlation id is opaque and never encodes secrets.

### Loading states

- A route load is a single discriminated state machine: `idle` → `loading` →
  `loaded` | `error`. The UI never renders a privileged action while the state
  is `loading` or `error`; it renders a skeleton/placeholder instead.
- A failed load never falls back to a cached or optimistic route. On
  `ROUTE_DEPENDENCY_UNAVAILABLE` the UI shows a retry affordance and keeps the
  action disabled (fail closed).
- Retries are idempotent reads; a replayed load returns the same resolved route
  rather than re-applying any side effect.

### Authorization

- Route loads require an authorized owner/delegate/guardian session or a scoped
  API-key/JWT. The server resolves the caller's permitted scope; the client
  cannot request a broader scope than it holds.
- An expired session fails closed with `ROUTE_AUTH_EXPIRED`; a revoked delegate
  fails closed with `ROUTE_DELEGATE_REVOKED`; a wrong role fails closed with
  `ROUTE_FORBIDDEN`. The loader never substitutes a cached route for a failed
  authorization check.
- Deny by default: a new route scope is unreadable until the server grants it,
  so adding a route cannot leak a previously hidden capability.

### Edge cases and failure modes

- **Concurrent/replayed requests:** route loads are idempotent reads keyed by
  route id; concurrent loads for the same route resolve to the same result.
- **Dependency outage:** RPC/DB/Horizon outage fails closed with
  `ROUTE_DEPENDENCY_UNAVAILABLE`; no silent success that could mask a missing
  route or stale wallet/AA/payment context.
- **Auth expiry / wrong role / revoked delegate:** fail closed and prompt
  re-auth; the loader is never used to escalate scope.
- **Adversarial input:** oversized or malformed route params are rejected with
  `ROUTE_INVALID_INPUT` before any privileged call; loads are rate-limited per
  session and per IP to prevent griefing.
- **Testnet vs mainnet:** the network is explicit and validated; a mainnet
  route is never satisfied by testnet state and vice versa.

### Observability

- Emit structured logs with the correlation id, the resolved error code, and
  the route id (never raw key material, JWTs, webhook secrets, or full request
  bodies).
- Track route load success/failure counts, load latency, rate-limit events, and
  rejected-input counts so ops can alert on abuse or misconfiguration.

### Rollout and rollback

- Changes to route loading that touch money paths or mainnet behavior must land
  behind a feature flag or kill-switch.
- Document the rollback path in the PR description: disabling the flag must
  restore the previous behavior without data migration.

## Audit log filters

### Canonical cookie attributes

| Attribute  | Value                                                        |
| ---------- | ------------------------------------------------------------ |
| Name       | `mux_session`                                                |
| Path       | `/`                                                          |
| Domain     | unset (host-only) by default; explicit per-environment only  |
| SameSite   | `Lax`                                                        |
| Secure     | `true` in produ

| Attribute  | Value                                                        |
| ---------- | ------------------------------------------------------------ |
| Name       | `mux_session`                                                |
| Path       | `/`                                                          |
| Domain     | unset (host-only) by default; explicit per-environment only  |
| SameSite   | `Lax`                                                        |
| Secure     | `true` in production and staging; `false` only on localhost  |
| HttpOnly   | `true` (never readable from JS)                              |
| Max-Age    | session lifetime in seconds; `Expires` derived from same TTL |

Login MUST set the session cookie with exactly these attributes. Logout
MUST clear the cookie using the same name, path, domain, and SameSite
values so the browser actually removes it. A mismatch between set and
clear attributes leaves a stale cookie behind and is treated as a bug.

### Environment parity (testnet vs mainnet)

- `Secure` is derived from the environment, not hard-coded per call site.
- `Domain` is only set when an explicit environment config provides it.
- Misconfiguration (e.g. `Secure=false` in production) MUST fail closed:
  the server refuses to issue a session rather than downgrading the cookie.

### Server-side session reads (fail-closed)

Every API route and middleware that reads the session cookie MUST validate
it fail-closed. Reject with stable error codes when:

- the cookie is **missing** — `SESSION_MISSING`
- the cookie is **expired** — `SESSION_EXPIRED`
- the cookie is **malformed or tampered** — `SESSION_INVALID`
- the session role does not satisfy the route policy — `SESSION_FORBIDDEN`

Rejections MUST NOT fall back to an anonymous or elevated session. Deny by
default for any new privileged surface.

### Idempotency and replay

### Idempotency and fail-closed behavior

- Reads are idempotent and safe to retry; the cursor makes replays return the
  same page rather than duplicating or skipping entries.
- If the DB/index is unavailable, the query fails closed with
  `AUDIT_DEPENDENCY_UNAVAILABLE`; it never returns a partial or stale-success
  result that could hide activity.
- Export/write paths derived from a filtered view (for example CSV export) must
  re-validate the filter and authorization server-side before producing output.

### Edge cases and failure modes

- **Concurrent/replayed requests:** cursor-based pagination plus idempotent
  reads keep concurrent queries consistent; replayed requests return the same
  page.
- **Dependency outage:** DB/index outage fails closed; no silent empty-success
  that could mask activity.
- **Auth expiry / wrong role / revoked delegate:** fail closed and prompt
  re-auth; filters are never used to escalate scope.
- **Adversarial input:** oversized ranges, unknown keys, and malformed cursors
  are rejected with `AUDIT_INVALID_FILTER` before any privileged read; queries
  are rate-limited per session and per IP to prevent griefing.
- **Testnet vs mainnet:** the network is an explicit filter dimension and is
  validated; a mainnet query is never satisfied by testnet entries and vice
  versa.

### Observability

- Emit structured logs with the correlation id, the resolved error code, and
  the applied filter set (never raw key material, JWTs, webhook secrets, or full
  request bodies).
- Track query success/failure counts, range-rejection counts, rate-limit
  events, and rejected-input counts so ops can alert on abuse or
  misconfiguration.

Money-path and session-mutating requests MUST be idempotent. Replayed
requests with the same idempotency key return the original result rather
than re-executing the side effect. Revoked delegates and expired sessions
are rejected before any write occurs.

### Observability

- Errors returned to clients use the stable codes above plus a correlation id.
- Logs and metrics MUST NOT contain raw session tokens, JWTs, webhook
  secrets, or key material. Redact before logging.
- Metrics on money/realtime paths are emitted without per-user identifiers.

## Notifications

- Re-enabling production source maps is a policy change, not a routine edit. It
  requires a design note, a private upload target, and a documented rollback in
  the PR description.

## Settings danger zone confirm phrase

The Settings danger zone hosts destructive, irreversible actions (for example
account/wallet deletion and recovery reset). These actions are gated behind a
typed confirm-phrase guard so a stray click or a scripted request cannot trigger
them. The guard is **fail closed**: the destructive action stays disabled until
the exact phrase is entered.

### Confirm phrase contract

- The required phrase is a fixed, documented constant (for example
  `DELETE MY ACCOUNT`). It is never derived from user input or remote config.
- Matching is **case-insensitive** and **whitespace-normalized**: leading and
  trailing whitespace is trimmed and internal runs of whitespace collapse to a
  single space before comparison. No other normalization is applied.
- The confirm phrase is validated **server-side** as well as in the UI; a client
  that skips the UI guard is still rejected with `GUARD_CONFIRM_REQUIRED`.
- The destructive action is disabled until the phrase matches exactly; a partial
  or near match fails closed.

### Edge cases and failure modes

- **Concurrent/replayed requests:** the destructive action carries an
  idempotency key so a double-submit resolves to a single effect.
- **Dependency outage:** if the write dependency is unavailable, the action
  fails closed with `GUARD_DEPENDENCY_UNAVAILABLE` rather than appearing to
  succeed.
- **Auth expiry / wrong role / revoked delegate:** fail closed and prompt
  re-auth before the confirm phrase is even evaluated.
- **Adversarial input:** oversized or scripted confirm payloads are rejected;
  attempts are rate-limited per session and per IP.
- **Testnet vs mainnet:** the confirm phrase guard applies on both; a mainnet
  destructive action is never satisfied by testnet state and vice versa.

### Observability

- Emit structured logs with the correlation id and the resolved error code
  (never the raw confirm phrase or any key material).
- Track confirm-guard pass/fail counts and rate-limit events so ops can alert on
  abuse.

### Rollout and rollback

- Changes to the confirm-phrase guard that touch money paths or mainnet behavior
  must land behind a feature flag or kill-switch.
- Document the rollback path in the PR description: disabling the flag must
  restore the previous behavior without data migration.

## Notifications

Notifications are a read-mostly surface, but they still follow the same
guards as the rest of the app: fail-closed authz, idempotent mutations,
and no secret leakage in logs or metrics.

### Authz and fail-closed reads

- The notifications list and unread count are scoped to the authenticated
  session. A missing, expired, or tampered session MUST fail closed with
  the stable codes above (`SESSION_MISSING`, `SESSION_EXPIRED`,
  `SESSION_INVALID`) rather than rendering another user's notifications.
- A session whose role does not satisfy the notifications route policy is
  rejected with `SESSION_FORBIDDEN`; the UI MUST NOT fall back to an
  anonymous or elevated view.
- Revoked delegates MUST NOT be able to read or mutate notifications.

### Idempotent mutations

- Mark-as-read and clear-all are mutations and MUST be idempotent.
  Replaying the same request (same idempotency key) returns the original
  result instead of re-executing the side effect.
- Marking an already-read notification as read is a no-op success, not an
  error, so retries and double-clicks are safe.
- Clear-all is idempotent: clearing an empty list succeeds without error.

### Empty states

- When there are no notifications, the UI MUST render an explicit,
  accessible empty state instead of a blank panel or a perpetual spinner.
- The empty state is announced to assistive tech (e.g. `role="status"`
  with a descriptive label) and uses copy that matches the rest of the
  product; it MUST NOT imply an error or a loading state.
- Empty states are covered by the e2e suite so a regression that hides the
  message or reintroduces a spinner is caught in CI.

### Observability

- Notification errors use the stable codes above plus a correlation id.
- Logs and metrics MUST NOT contain raw session tokens, JWTs, webhook
  secrets, notification bodies, or key material. Redact before logging.
- Metrics on the notifications path are emitted without per-user
  identifiers.

### Tests

Automated coverage for these invariants lives in `tests/e2e/` (including
`tests/e2e/real-backend/`). Required cases:

- cookie parity: login set attributes match logout clear attributes
- auth negatives: expired session, tampered cookie, revoked delegate
- idempotency: replayed request does not double-execute
- notifications: list renders, mark-as-read and clear-all are idempotent,
  and the empty state is shown and announced when there are none

See `README.md` and `tests/e2e/` for how to run the suite.


## Real-backend e2e secrets

The real-backend Playwright suite authenticates with a real QA account, so
its password is a production-grade secret: CI secret store only, never a
`NEXT_PUBLIC_*` variable, never in traces (disabled for that config) or logs.
The full policy, rotation, and incident runbook live in
[`e2e-real-backend-testing.md`](./e2e-real-backend-testing.md#secrets-handling).

## Login logging, faucet gating, balance refresh, and dark-mode contrast

- `/api/auth/login` (`src/app/api/auth/login/route.ts`) never logs request
  bodies, passwords, tokens, or cookies. Logs carry only the correlation id,
  a stable `AUTH_LOGIN_*` error code, and a masked email. Upstream failures
  fail closed with `AUTH_LOGIN_UPSTREAM_UNAVAILABLE` and no session cookie.
- The faucet CTA is gated by `shouldShowFaucet` (`src/utils/faucet.ts`): it is
  hidden on mainnet and on unknown/missing networks. Set
  `NEXT_PUBLIC_FAUCET_ENABLED=false` as a kill switch on every network.
- Balances refresh via `useBalanceRefresh` (`src/utils/balance-refresh.ts`),
  which keeps the last known balance visible while refreshing or on failure
  and drops out-of-order responses.
- Dark-mode text/background pairs live in `src/utils/contrast.ts` and are
  asserted to meet WCAG AA (4.5:1) by `src/utils/contrast.test.ts`. Add new
  dark-mode color pairs there.

## Network badge contrast (#826)

`src/components/NetworkBadge.tsx` renders the active network with color pairs
that meet WCAG 2.1 AA (>= 4.5:1). The network is always stated in text, never
by color alone, and an unrecognized network fails closed to an "Unknown
network" warning style so mainnet/testnet misconfiguration is visible.

## Disable CTAs while in-flight (#828)

Money-path buttons use `useInFlightAction` (`src/utils/in-flight-action.ts`).
While a request is pending the CTA is `disabled` and `aria-busy`, and repeat
invocations are dropped by a ref guard so a double-click cannot submit twice.
This complements (not replaces) server-side idempotency keys.

## Limits validation mirrors server (#832)

`validateLimits` (`src/utils/limits-validation.ts`) mirrors server rules:
required, numeric, non-negative, <= 7 decimals (stroops), <= int64 stroops,
`perTransaction <= daily <= monthly`, and unknown keys denied. Errors use
stable `LIMIT_*` codes. The server remains the source of truth; client
validation only gives earlier feedback.

## todayUsage refresh without stampede (#833)

`createTodayUsageRefresher` (`src/utils/today-usage-refresh.ts`) collapses
concurrent refreshes into one in-flight request per key, serves fresh values
from a short TTL cache, never caches failures as success
(`USAGE_DEPENDENCY_UNAVAILABLE` with a correlation id), and rate-limits retries
after failure (`USAGE_RATE_LIMITED`). An optional `onMetric` hook reports
hit/miss/shared/error counts without logging key material.

**Rollback:** each change is additive and unused by existing flows until wired
in; reverting the commit removes it with no data migration.

## CSRF strategy

The session cookie is HttpOnly + `SameSite=Lax`, which blocks most cross-site
writes but not all (e.g. top-level navigations, same-site subdomains). All
state-changing requests therefore use a **double-submit cookie** defined in
`src/lib/csrf.ts`:

- The server issues a non-HttpOnly `mux_csrf` cookie alongside the session.
- The client sends the same value in the `x-csrf-token` header for every
  non-`GET`/`HEAD`/`OPTIONS` request (`withCsrf()`).
- The server calls `verifyCsrf()` before any write and fails closed with
  `CSRF_MISSING` (no cookie/header) or `CSRF_MISMATCH` (values differ). Tokens
  are compared in constant time and never logged.
- Rollback: removing the `verifyCsrf()` call restores the previous behavior; no
  data migration is required.

## Optimistic UI

Optimistic updates are allowed **only** for idempotent mutations
(`src/lib/optimistic.ts`):

- A mutation may render optimistically only when it carries an idempotency key.
- Money-path writes (spends, recovery, admin) are never optimistic; the UI
  waits for the server result.
- On failure the previous state is restored and the error surfaced; a failed
  write is never displayed as success.

## Revoked API keys

Revoked API keys must be visually distinct from active keys
(`src/components/ApiKeyStatusBadge.tsx`): muted and struck-through, marked
`aria-disabled`, and labelled with a "Revoked" badge so the state does not rely
on color alone. Only masked key prefixes are rendered, never raw key material.

## Storybook theme tokens

Storybook backgrounds are sourced from `src/theme/tokens.ts`, the single source
of truth for light/dark palette values, so stories match production styling.

## 429 Retry-After UX

Issue #801. Rate limits are enforced by the server; the client's job is to
respect them without hammering the endpoint or losing work. Implementation:
`src/lib/http/retry-after.ts`, `src/components/RateLimitNotice.tsx`,
`src/hooks/useRetryCountdown.ts`.

### Invariants

- **Parsing.** `Retry-After` is accepted as delta-seconds or an HTTP-date.
  The resolved wait is clamped to **1 s – 5 min**. A missing or malformed
  header falls back to **30 s**, never to "retry immediately", so a
  misbehaving proxy cannot trigger a retry storm.
- **Automatic retry is for idempotent reads only.** `fetchWithRetryAfter()`
  retries `GET`/`HEAD`/`OPTIONS` at most 3 attempts in total, and only when
  the server asks for ≤ 10 s. Longer waits are surfaced to the user.
- **Writes are never auto-retried.** Spends, recovery, and admin actions
  surface a `RATE_LIMITED` state; the user re-submits with the *same*
  `Idempotency-Key`, so a retry cannot double-apply.
- **Gated retry.** `RateLimitNotice` shows a countdown and keeps its Retry
  control disabled until the wait has elapsed. The countdown is recomputed
  from the wall clock (not decremented), so throttled background tabs never
  enable retry early.
- **Our own limits.** `/api/transactions/send` (10/min) and `/api/activity`
  (60/min) apply per-instance griefing guards keyed by a SHA-256 of the
  caller credential + IP (`src/lib/http/rate-limiter.ts`). The backend's
  limits remain authoritative; upstream 429s are passed through with a
  clamped `Retry-After`.

### Observability

- The `onMetric` hook emits `{ name: "http.rate_limited", method, path,
  retryAfterMs, autoRetried, correlationId }`. `path` is the pathname only:
  query strings can carry cursors or tokens and are never included.
- The notice renders the correlation id as a support reference. Correlation
  ids from headers are only displayed when they match
  `^[A-Za-z0-9._:-]{1,128}$` (`src/lib/http/correlation.ts`).

## Maintenance 503 UX

Issue #802. A `503` is either planned maintenance or an unplanned
dependency outage (RPC/DB/Horizon). Implementation:
`src/lib/http/maintenance.ts`, `src/components/MaintenanceNotice.tsx`.

### Invariants

- **Signal.** Maintenance is `x-mux-maintenance: true` (or `1`) or a JSON
  body `{ "error": { "code": "MAINTENANCE" } }`. Every other `503` is
  classified `DEPENDENCY_UNAVAILABLE`. Neither is ever treated as success
  or satisfied from a cache.
- **Writes stay disabled** for both codes until a later request succeeds.
  Pages must not render privileged actions while the notice is shown.
- **Fixed copy only.** The notice never renders server-provided text, so a
  spoofed or proxied 503 cannot inject phishing copy or links.
- **Retry-After** is clamped exactly as for 429s, and "Check again" stays
  disabled until it elapses.
- **Proxy routes preserve the signal.** `/api/transactions/send` and
  `/api/activity` re-emit `x-mux-maintenance: true` and a clamped
  `Retry-After` when the backend is in maintenance, and map every other
  upstream 5xx to their stable unavailable codes (`SEND_BACKEND_UNAVAILABLE`,
  `backend_unavailable`).

## Feature-flagged send flows

Issue #803. Send is a money path, so it is deny-by-default and guarded by a
kill switch. Implementation: `src/lib/feature-flags/send-flows.ts`,
`src/lib/send/send-request.ts`, `src/app/api/transactions/send/route.ts`,
`src/components/SendFlowGate.tsx`.

### Flags

| Server (authoritative) | Client (UI only) | Semantics |
| --- | --- | --- |
| `MUX_SEND_FLOWS_ENABLED` | `NEXT_PUBLIC_SEND_FLOWS_ENABLED` | Opt-in. Only `true`/`1` enables. |
| `MUX_SEND_KILL_SWITCH` | `NEXT_PUBLIC_SEND_KILL_SWITCH` | Wins over everything. Unset/`false`/`0` is off; **any other value engages it** (fail closed on typos). |
| `MUX_SEND_MAINNET_ENABLED` | `NEXT_PUBLIC_SEND_MAINNET_ENABLED` | Second opt-in required on mainnet. |
| `MUX_STELLAR_NETWORK` → `NEXT_PUBLIC_STELLAR_NETWORK` | `NEXT_PUBLIC_STELLAR_NETWORK` | Must be `testnet`, `futurenet`, or `mainnet`/`public`. Anything else is `SEND_NETWORK_MISCONFIGURED`. Blank values count as unset. |

Client flags only decide whether `SendFlowGate` renders the send UI. The
route reads **only** the server flags on every request, so flipping a
client flag (or sending hint headers) cannot bypass the gate.

### Entrypoint: `POST /api/transactions/send`

Checks run in this order, and each one fails closed before the next:

1. Credential present (`Authorization: Bearer|ApiKey`, `x-api-key`, or the
   `mux_session` cookie) → else `401 SEND_UNAUTHORIZED`.
2. CSRF: a cookie-only request must carry a same-origin `Origin` → else
   `403 SEND_FORBIDDEN`.
3. Per-caller rate limit → `429 SEND_RATE_LIMITED` + `Retry-After`.
4. Server flag gate → `503 SEND_KILL_SWITCH_ENGAGED`,
   `403 SEND_DISABLED`, `503 SEND_NETWORK_MISCONFIGURED`,
   `403 SEND_MAINNET_NOT_ENABLED`.
5. `Idempotency-Key` (16–128 URL-safe chars) → else
   `400 SEND_IDEMPOTENCY_KEY_REQUIRED`.
6. Body ≤ 4 KiB, strict schema, no unknown keys → else
   `413`/`400 SEND_INVALID_INPUT`. Amounts are positive decimal strings with
   ≤ 7 fractional digits, and never JS numbers.
7. `body.network` must equal the configured network → else
   `400 SEND_NETWORK_MISMATCH` (a mainnet send is never satisfied by
   testnet config, and vice versa).
8. Backend configured → else `503 SEND_BACKEND_UNAVAILABLE`. **Sends are
   never mocked, including in local dev.**
9. A concurrent duplicate (same caller + key) on this instance →
   `409 SEND_REQUEST_IN_PROGRESS`. Sequential replays are forwarded so the
   backend returns the original outcome.

The route forwards the credential, `Idempotency-Key`, and correlation id to
`${backend}/transactions`. The backend decides authorization, and its
verdict is mapped to stable codes: `SEND_AUTH_EXPIRED`,
`SEND_UNAUTHORIZED`, `SEND_DELEGATE_REVOKED`, `SEND_FORBIDDEN`,
`SEND_IDEMPOTENCY_CONFLICT`, `SEND_INVALID_INPUT`, `SEND_RATE_LIMITED`,
`SEND_MAINTENANCE`, and `SEND_BACKEND_UNAVAILABLE`. An unrecognised status or
a non-JSON 2xx is `502 SEND_UPSTREAM_ERROR` ("check activity before
retrying"), never a success. Upstream message text is never echoed.

### Observability

Each request logs `{ event: "send.request", correlationId, code, status,
network }`. Credentials, addresses, amounts, memos, and idempotency keys
are never logged. Alert on the `SEND_*` code distribution. A spike in
`SEND_UPSTREAM_ERROR` or `SEND_BACKEND_UNAVAILABLE` warrants engaging the
kill switch.

### Rollout and rollback

- Ship with every flag unset, which leaves sends disabled. Enable on testnet
  (`MUX_SEND_FLOWS_ENABLED=true`, `MUX_STELLAR_NETWORK=testnet`), then on
  mainnet by also setting `MUX_SEND_MAINNET_ENABLED=true` after the mainnet
  readiness checklist.
- **Rollback:** set `MUX_SEND_KILL_SWITCH=true` or unset
  `MUX_SEND_FLOWS_ENABLED`. The route reads flags on every request, so the
  change applies as soon as the server process sees the new environment
  (on most hosts, the next restart/redeploy). Also flip the matching
  `NEXT_PUBLIC_*` flag so the UI hides the form. No data migration is
  involved.

### Tests

- Unit: `src/lib/**/*.test.ts`, `src/app/api/transactions/send/route.test.ts`,
  `src/app/api/activity/route.test.ts`, `src/components/*.test.tsx`
  (authz negatives, flag/kill-switch matrix, idempotency, fail-closed
  mapping, log redaction).
- E2E: `tests/e2e/send-flow-flags.spec.ts`,
  `tests/e2e/audit-log-pagination.spec.ts`.

Coverage for these invariants lives in `tests/e2e/` (including
`tests/e2e/real-backend/`). Required cases:

- cookie parity: login set attributes match logout clear attributes
- auth negatives: expired session, tampered cookie, revoked delegate
- idempotency: replayed request does not double-execute
- notifications: list renders, mark-as-read and clear-all are idempotent,
  and the empty state is shown and announced when there are none

See `README.md` and `tests/e2e/` for how to run the suite.
