# Security UX Guards

This document describes the security and UX guardrails that protect Mux
Protocol users, wallets, and money-path operations. It is the canonical
reference for contributors working on session handling, authz, and
fail-closed behavior.

## Session handling cookie parity

Session cookies MUST be defined by a single source of truth so that the
client and server code paths cannot drift. Any change to cookie attributes
must be made in one place and consumed everywhere.

### Canonical cookie attributes

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

Money-path and session-mutating requests MUST be idempotent. Replayed
requests with the same idempotency key return the original result rather
than re-executing the side effect. Revoked delegates and expired sessions
are rejected before any write occurs.

### Observability

- Errors returned to clients use the stable codes above plus a correlation id.
- Logs and metrics MUST NOT contain raw session tokens, JWTs, webhook
  secrets, or key material. Redact before logging.
- Metrics on money/realtime paths are emitted without per-user identifiers.

### Tests

Automated coverage for these invariants lives in `tests/e2e/` (including
`tests/e2e/real-backend/`). Required cases:

- cookie parity: login set attributes match logout clear attributes
- auth negatives: expired session, tampered cookie, revoked delegate
- idempotency: replayed request does not double-execute

See `README.md` and `tests/e2e/` for how to run the suite.
