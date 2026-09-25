# Security UX Guards

This document describes the security and UX guardrails that protect Mux
Protocol users, wallets, and money-path operations. It is the canonical
reference for contributors working on session handling, authz, and
fail-closed behavior.

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

