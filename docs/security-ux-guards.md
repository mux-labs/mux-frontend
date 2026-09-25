# Security UX Guards

This document describes the security and UX guardrails that Mux frontend surfaces
must respect. It is the reference for contributors working on wallet, account
abstraction, and payment flows.

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

## References

- `README.md`
- `tests/e2e/`
