# Security & UX Guards

This document describes the security and UX guardrails enforced across the Mux
frontend. It is the canonical reference for contributors working on privileged
surfaces (wallets, account abstraction, payments, activity feeds, notification
preferences).

## Principles

- **Server/contract is the source of truth.** The frontend never decides spends,
  recovery, or admin actions on its own; it only reflects and requests them.
- **Deny by default.** New privileged surfaces must explicitly authorize every
  caller before returning data or performing a write.
- **Fail closed on writes.** If a dependency (RPC, DB, Horizon) is unavailable,
  write paths must reject rather than silently succeed.
- **No secrets in the repo or logs.** Redact keys, JWTs, and webhook secrets.

## Wallet detail deep links

Wallet detail views are addressable via deep links so that support, ops, and
partner surfaces can hand a user a stable URL to a specific wallet. Deep links
are a privileged surface: they resolve a wallet identifier to wallet detail and
must not become a policy bypass.

### Route contract

- Canonical route: `/wallets/:walletId` (wallet detail).
- The route accepts an optional `?network=` query parameter. Only `testnet` and
  `mainnet` are valid values; any other value is rejected and the link fails
  closed to the default network for the session.
- Unknown or malformed `walletId` values render the wallet-not-found state; they
  must never fall back to a different wallet or to a list view.

### Typed entrypoints and error codes

Deep-link resolution is exposed through a typed entrypoint that returns a
discriminated result. Callers must branch on the error code rather than on
message text. Stable error codes:

| Code | Meaning |
| --- | --- |
| `WALLET_NOT_FOUND` | No wallet matches the identifier. |
| `WALLET_FORBIDDEN` | Caller is not authorized for this wallet. |
| `WALLET_AUTH_EXPIRED` | Session/JWT expired; re-auth required. |
| `WALLET_NETWORK_MISMATCH` | Requested network does not match the wallet. |
| `WALLET_DEPENDENCY_UNAVAILABLE` | Upstream RPC/Horizon/DB unavailable. |
| `WALLET_INVALID_INPUT` | Malformed identifier or query parameters. |

Every resolution carries a correlation id that is propagated to logs and to the
user-facing error surface so support can trace a single deep-link attempt.

### Authorization

- Deny by default. A deep link does not grant access; it only identifies the
  wallet to resolve.
- The server remains the source of truth for ownership, delegation, and
  guardian relationships. The client must not infer access from the URL.
- Owner, delegate, and guardian roles are evaluated server-side. Revoked
  delegates and expired sessions must fail closed with `WALLET_FORBIDDEN` or
  `WALLET_AUTH_EXPIRED` respectively.
- API-key/JWT callers are subject to the same policy as interactive users; a
  valid token is not sufficient on its own.

### Edge cases and failure modes

- **Replay / concurrency:** resolution is read-only and idempotent. Repeated or
  concurrent deep-link opens for the same wallet must produce the same result
  and must not trigger writes.
- **Dependency outage:** if RPC/Horizon/DB is unavailable, reads fail closed
  with `WALLET_DEPENDENCY_UNAVAILABLE`. No write path may proceed on a degraded
  dependency.
- **Auth expiry / wrong role / revoked delegate:** surface the specific error
  code and prompt re-auth; never silently downgrade to a less privileged view.
- **Adversarial input:** oversized or malformed identifiers are rejected with
  `WALLET_INVALID_INPUT` before any upstream call. Rate-limit deep-link
  resolution per session and per IP.
- **Testnet vs mainnet misconfig:** a network mismatch is an error, not a
  silent switch. Never resolve a mainnet wallet under a testnet session or vice
  versa.

### Observability

- Emit structured logs with the correlation id, the resolved error code, and
  the network. Do not log raw key material, JWTs, webhook secrets, or full
  wallet secrets.
- Redact identifiers in logs where they could be used to correlate a user
  across surfaces.
- Track resolution success/failure counts and latency so ops can alert on
  dependency outages and auth failures.

### Rollout and rollback

- Deep-link resolution changes that touch money paths or mainnet behavior must
  land behind a feature flag or kill-switch.
- Document the rollback path in the PR description: disabling the flag must
  restore the previous resolution behavior without data migration.

## Activity feed pagination

The activity feed is a privileged read surface: it exposes wallet, payment, and
account-abstraction history. Pagination must be cursor-based and authorized.

### Request contract

- `limit` — integer, `1..100` (default `25`). Values outside the range are
  rejected with `ACTIVITY_INVALID_LIMIT`; oversized batches are never silently
  truncated.
- `cursor` — opaque, server-issued token. Clients must treat it as opaque and
  must not construct or mutate it. Malformed cursors are rejected with
  `ACTIVITY_INVALID_CURSOR`.

### Response contract

- `items` — array of activity entries for the requested page.
- `nextCursor` — opaque token for the next page, or `null` when exhausted.
- `hasMore` — boolean mirror of `nextCursor !== null`.

Cursors are stable and monotonic: a cursor issued for a page continues to
resolve to the same position even as new activity is appended, so clients never
skip or duplicate entries across concurrent requests.

### Authorization

Every activity feed request is authorized before any data is read. The caller
must present a valid session (JWT) and hold one of the following roles for the
requested account:

- **owner** — full access to their own activity.
- **delegate** — access only while the delegation is active and not revoked.
- **guardian** — access only for accounts they guard.
- **API key** — scoped to the accounts and actions granted to the key.

Requests with an expired session, wrong role, or revoked delegate are rejected
with `ACTIVITY_UNAUTHORIZED` (deny by default). Authorization is re-evaluated on
every page request; a cursor does not carry or extend authorization.

### Error codes

| Code | Meaning |
| --- | --- |
| `ACTIVITY_INVALID_LIMIT` | `limit` missing, non-integer, or out of range. |
| `ACTIVITY_INVALID_CURSOR` | Cursor malformed, tampered, or expired. |
| `ACTIVITY_UNAUTHORIZED` | Missing/expired session, wrong role, or revoked delegate. |
| `ACTIVITY_DEPENDENCY_UNAVAILABLE` | Upstream RPC/DB/Horizon outage; fail closed. |

Errors are actionable and never include raw key material, JWTs, or webhook
secrets. Each response carries a correlation id for support and tracing.

### Idempotency & concurrency

- Read requests are safe to retry; a repeated request with the same cursor
  returns the same page.
- Concurrent requests with the same cursor do not advance shared state.
- Writes triggered from the feed (e.g. retry/claim actions) require an
  idempotency key and are rejected on replay.

### Observability

- Emit metrics for request count, latency, and error code on the activity feed
  path.
- Log correlation ids and error codes only; never log cursors, tokens, keys, or
  full request bodies.

### Environment safety

- Testnet and mainnet configurations are distinct; a mainnet-affecting change to
  the feed must be gated behind a feature flag or kill-switch with a documented
  rollback.
- Misconfigured environments fail closed rather than serving cross-environment
  data.

## Notification preferences

The notification preferences page is a privileged surface: it reads and writes
per-account delivery settings (channels and event subscriptions). Reads and
writes must be authorized and fail closed.

### Request contract

- `channels` — object keyed by channel (`email`, `push`, `webhook`), each with a
  boolean `enabled` flag. Unknown channels are rejected with
  `NOTIFICATIONS_INVALID_CHANNEL`.
- `events` — object keyed by event type (e.g. `payment.received`,
  `recovery.initiated`), each with a boolean `enabled` flag. Unknown event types
  are rejected with `NOTIFICATIONS_INVALID_EVENT`.
- `idempotencyKey` — required on writes. Replayed keys return the original
  result and never apply the update twice.

### Response contract

- `preferences` — the persisted channel/event map for the account.
- `updatedAt` — server timestamp of the last accepted write.

### Authorization

Every read and write is authorized before any data is touched. The caller must
present a valid session (JWT) and hold one of the following roles for the
requested account:

- **owner** — full read/write of their own preferences.
- **delegate** — read/write only while the delegation is active and not revoked.
- **guardian** — read/write only for accounts they guard.
- **API key** — scoped to the accounts and actions granted to the key.

Requests with an expired session, wrong role, or revoked delegate are rejected
with `NOTIFICATIONS_UNAUTHORIZED` (deny by default). Privileged surfaces are
deny-by-default: absence of an explicit grant is a rejection, not a default
allow.

### Error codes

| Code | Meaning |
| --- | --- |
| `NOTIFICATIONS_INVALID_CHANNEL` | Unknown or malformed channel in the payload. |
| `NOTIFICATIONS_INVALID_EVENT` | Unknown or malformed event type in the payload. |
| `NOTIFICATIONS_UNAUTHORIZED` | Missing/expired session, wrong role, or revoked delegate. |
| `NOTIFICATIONS_DEPENDENCY_UNAVAILABLE` | Upstream RPC/DB outage; fail closed on writes. |
| `NOTIFICATIONS_REPLAYED` | Idempotency key already applied; original result returned. |

Errors are actionable and never include raw key material, JWTs, or webhook
secrets. Each response carries a correlation id for support and tracing.

### Idempotency & concurrency

- Reads are safe to retry and return the persisted preferences.
- Writes require an idempotency key; concurrent or replayed updates with the
  same key are collapsed to a single applied write.
- A write that cannot reach the backing store fails closed with
  `NOTIFICATIONS_DEPENDENCY_UNAVAILABLE` rather than reporting success.

### Observability

- Emit metrics for request count, latency, and error code on the notification
  preferences path.
- Log correlation ids and error codes only; never log tokens, keys, or full
  request bodies.

### Environment safety

- Testnet and mainnet configurations are distinct; a mainnet-affecting change to
  notification delivery must be gated behind a feature flag or kill-switch with
  a documented rollback.
- Misconfigured environments fail closed rather than serving cross-environment
  preferences.

## Spending limits a11y labels

The spending-limits surface lets an owner or delegate view and edit per-wallet
spending limits. It is a money-path control: an assistive-technology user must
be able to read the current limit, understand its scope, and change it without
ambiguity. Accessibility is a correctness requirement here, not a nicety — a
mis-announced limit or an unlabeled control can cause an unintended spend.

### Labeling contract

- Every spending-limit control (amount input, period selector, enable/disable
toggle, save/reset buttons) has a programmatic accessible name. Visible text is
  associated via `htmlFor`/`id`; icon-only controls use `aria-label`.
- Help text and validation messages are associated with their control via
  `aria-describedby` so screen readers announce purpose, current value, and
  validation state together.
- The current limit and its period are exposed as text, not color or position
alone. Units (for example, XLM or the asset code) are part of the accessible
  name or description.
- Toggles expose their state via `role="switch"` with `aria-checked`, or a
  native checkbox; the state must never be conveyed by styling alone.
- Validation errors use `role="alert"` (or an `aria-live="assertive"` region)
  and are linked to the offending field. Success and loading states use a
  polite live region (`aria-live="polite"` / `role="status"`).

### Keyboard and focus

- All spending-limit controls are reachable and operable by keyboard alone, in
  a logical tab order.
- Focus is visible on every interactive control; focus styles must not be
  removed. Focus is moved to the first invalid field on a failed save and to the
  status message on success.
- Disabled controls are conveyed with the native `disabled` attribute (or
  `aria-disabled`) so assistive tech reports them as unavailable.

### Live-region semantics

- Dynamic state changes are announced without leaking secrets or raw key
  material: "limit saved", "validation error", and "loading" are announced via
  live regions. Announcements contain only the limit value, period, and error
  code/message — never key material, JWTs, or webhook secrets.
- Announcements are debounced so rapid edits do not flood the live region.

### Edge cases and failure modes

- **Adversarial input:** oversized or malformed limit values are rejected with a
  linked, announced validation error; the control is marked invalid with
  `aria-invalid="true"`.
- **Auth expiry / wrong role / revoked delegate:** the save control is disabled
  and the reason is announced; the client never infers permission from the UI.
- **Dependency outage:** a failed save fails closed and is announced as an
  error; the previous limit remains displayed and is not optimistically
  committed.
- **Testnet vs mainnet misconfig:** the active network is part of the limit's
  accessible description so a user cannot mistake a testnet limit for a mainnet
  one.

### Observability

- Emit the validation error code and a correlation id on rejection. Do not log
  raw key material, JWTs, or webhook secrets.
- Track save success/failure counts so ops can alert on regressions.

### Rollout and rollback

- Spending-limit changes that touch money paths or mainnet behavior must land
  behind a feature flag or kill-switch.
- Document the rollback path in the PR description: disabling the flag must
  restore the previous limit behavior without data migration.

## Send form strkey validation

The Send form accepts a recipient address. Recipient addresses are Stellar
strkeys and are a money-path input: an invalid or ambiguous strkey must never be
submitted to the backend. Validation is fail-closed and runs before submission.

### Validation contract

- The recipient field is validated as a Stellar strkey before the send is
  allowed to proceed. Malformed or unsupported strkeys block submission.
- Only strkey types valid for a send recipient are accepted. Unsupported strkey
  types (for example, a secret seed or a non-recipient key type) are rejected
  rather than passed through.
- Validation is deterministic and side-effect free: it performs no network call
  and no write. The server remains the source of truth for spends; client
  validation is a guard, not an authorization decision.
- The form fails closed: if validation cannot positively confirm a valid
  recipient strkey, submission is blocked. There is no pass-through path for
  unvalidated input.

### Typed result and error codes

Validation returns a typed, discriminated result. Callers must branch on the
error code rather than on message text. Stable error codes:

| Code | Meaning |
| --- | --- |
| `SEND_RECIPIENT_REQUIRED` | Recipient field is empty. |
| `SEND_RECIPIENT_INVALID_STRKEY` | Recipient is not a well-formed strkey. |
| `SEND_RECIPIENT_UNSUPPORTED_TYPE` | Strkey is well-formed but not a valid recipient type. |
| `SEND_RECIPIENT_NETWORK_MISMATCH` | Strkey does not match the active network. |

Error messages are stable and human-readable. They must not echo raw key
material, secrets, or full recipient values into errors or logs.

### Edge cases and failure modes

- **Adversarial input:** oversized, truncated, or checksum-invalid strkeys are
  rejected with `SEND_RECIPIENT_INVALID_STRKEY` before any submission.
- **Ambiguous input:** a strkey that is well-formed but not a supported
  recipient type is rejected with `SEND_RECIPIENT_UNSUPPORTED_TYPE`; it is never
  coerced into a recipient.
- **Testnet vs mainnet misconfig:** a recipient strkey for the wrong network is
  rejected with `SEND_RECIPIENT_NETWORK_MISMATCH`; never silently switch
  networks.
- **Replay / concurrency:** validation is pure and idempotent; repeated
  validation of the same input yields the same result and triggers no writes.
- **Dependency outage:** validation does not depend on RPC/Horizon/DB. If a
  downstream dependency is unavailable, the send still fails closed and is not
  submitted.

### Observability

- Emit the validation error code and a correlation id on rejection. Do not log
  raw recipient strkeys, key material, JWTs, or webhook secrets.
- Track validation rejection counts by error code so ops can alert on spikes.

### Rollout and rollback

- Send-form validation changes that touch money paths or mainnet behavior must
  land behind a feature flag or kill-switch.
- Document the rollback path in the PR description: disabling the flag must
  restore the previous submission behavior without data migration.

## Receive QR + network badge

The Receive surface renders a scannable QR that encodes the wallet's
Stellar/Soroban receive address, together with an unambiguous network badge. The
QR is a money-path surface: a QR that encodes the wrong address or the wrong
network can cause funds to be sent to an unrecoverable destination. Rendering is
fail-closed.

### Rendering contract

- The QR encodes the wallet's receive address as a Stellar strkey. The address
  is sourced from the server (the source of truth for the wallet); the client
  must not synthesize or derive an address locally.
- The QR payload uses the canonical Stellar URI form for the active network so
  that scanners resolve the correct network. The payload must not embed secrets,
  key material, or session tokens.
- The network badge is derived from configuration, not from user input or the
  URL. It must display exactly one of `testnet` or `mainnet`.
- Rendering fails closed: if the network cannot be positively determined, or if
  the receive address is missing or malformed, the QR is not rendered and an
error state is shown instead.
