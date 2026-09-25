# Mux Frontend

Mux Protocol provides invisible wallets and account abstraction on Stellar/Soroban.
This repository contains the Mux frontend.

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

## Development

```bash
npm install
npm run dev
```

## References

- [`docs/security-ux-guards.md`](docs/security-ux-guards.md)
- [`tests/e2e/`](tests/e2e/)
