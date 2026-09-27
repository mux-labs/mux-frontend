# Invisible Wallet UI Copy Guide

User-facing wording for Mux invisible wallets. Mux hides seed phrases,
signing keys, and gas from users, so the UI must describe outcomes in plain
language while staying truthful about what the server/contract actually did.
Pair this with `docs/security-ux-guards.md` (guard behavior) and
`README.md` (setup).

## Invariants

1. **Never claim success before the source of truth confirms it.** Only say
   "sent", "created", or "recovered" after the backend/contract responds
   with success. Use "Sending…"/"Pending" until then.
2. **Never expose secrets.** No private keys, seed phrases, JWTs, API keys,
   or webhook secrets in copy, toasts, tooltips, or error details. Show only
   public keys, truncated addresses (`GABC…WXYZ`), and key ids.
3. **Always name the network.** Anything touching funds shows `Testnet` or
   `Mainnet`. Testnet copy must never imply real value.
4. **Errors are actionable.** Say what happened, what the user can do, and
   include the correlation id for support.
5. **Fail closed, say so.** When a dependency is down we block the action;
   copy must say the action did *not* happen, not "something went wrong".

## Vocabulary

| Use | Avoid | Why |
| --- | --- | --- |
| Wallet | Account, keypair, smart account | One user-facing noun |
| Sign in | Connect wallet | No wallet extension is required |
| Approve | Sign transaction | Users approve an action, not a XDR |
| Network fee (covered) | Gas, stroops | Fees are sponsored/abstracted |
| Recovery contacts | Guardians (in end-user copy) | "Guardian" is fine in admin/dev UI |
| Delegate | Sub-key, session key | Matches authz role names |
| Spending limit | Allowance, cap | Matches `/api/spending-limits` |

## Core flows

### Wallet creation

- In progress: "Creating your wallet on {network}…"
- Success: "Your wallet is ready." (+ truncated address)
- Replayed request (`replayed: true`): same success copy — do not create a
  second "new wallet" toast.
- Mainnet disabled (`ONBOARDING_NETWORK_DISABLED`): "Mainnet wallets aren't
  available yet. You can create a Testnet wallet instead."
- Invalid network (`ONBOARDING_INVALID_NETWORK`): "Choose Testnet or
  Mainnet and try again."

### Sending / payments

- Confirm step: "Send {amount} {asset} to {GABC…WXYZ} on {network}?"
- Pending: "Sending… this usually takes a few seconds."
- Success: "Sent {amount} {asset}." Only after on-chain confirmation.
- Spending limit hit: "This would exceed your daily spending limit of
  {limit}. Try a smaller amount or adjust your limit."

### Recovery

- Start: "We'll ask your recovery contacts to confirm it's you."
- Waiting: "{n} of {m} recovery contacts have confirmed."
- Done: "Your wallet has been recovered on this device."
- Never say "your keys were restored" — keys are rotated, not restored.

### Permissions (delegates / API keys)

- Grant: "{name} can {scope} until {expiry}."
- Revoke: "{name} can no longer act on this wallet." Show immediately; the
  server rejects revoked credentials regardless of UI state.
- API key created: show the key once with "Copy it now — you won't see it
  again." Never re-display it.

## Error copy

Map stable error codes to copy; always append
"Reference: {correlationId}".

| Code / status | Copy |
| --- | --- |
| `401` / `*_UNAUTHORIZED` | "Your session has expired. Sign in again to continue." |
| `403` / `*_FORBIDDEN` | "You don't have permission to do this for this wallet." |
| `409` / `*_IDEMPOTENCY_CONFLICT` | "This request is already being processed." |
| `503` / `*_UPSTREAM_UNAVAILABLE`, `backend_not_configured` | "We couldn't reach the network. Nothing was changed — try again shortly." |
| `500` / `*_INTERNAL` | "Something went wrong on our side. Nothing was changed." |

Do not surface raw upstream messages, stack traces, backend URLs, or
Horizon/RPC error payloads.

## Review checklist

- [ ] Success copy only follows a confirmed server/contract response.
- [ ] Network label is visible on every money-path screen.
- [ ] No secret or raw key material appears in copy or logs.
- [ ] Every error shows an action and a correlation id.
- [ ] Vocabulary matches the table above.

## Rollback

Copy changes are UI-only and ship without a flag; revert the PR to roll
back. Copy for mainnet-only states stays hidden while `MUX_MAINNET_ENABLED`
is not `true`.
