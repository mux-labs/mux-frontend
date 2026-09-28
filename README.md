# Mux Frontend

Mux Protocol provides invisible wallets and account abstraction on Stellar/Soroban.
This repository (`mux-frontend`) contains the web client.

## Getting started

```bash
npm install
npm run dev
```

## Security

See [`docs/security-ux-guards.md`](docs/security-ux-guards.md) for the security and UX guardrails that apply to this frontend.

### Content Security Policy: `connect-src` API allowlist

The frontend ships a strict Content Security Policy. The `connect-src` directive is
**fail-closed**: it only permits the API/RPC origins that are explicitly allowlisted,
and it never falls back to a wildcard (`*`) or a broad scheme source (e.g. `https:`).

- The allowlist is derived from a single, typed, explicit source of truth rather than
  inline string literals scattered across the config.
- Origins are environment-driven with safe defaults, so unset or unknown origins are
  **not** silently permitted.
- Adding a new backend, RPC, or Horizon endpoint requires adding its origin to the
  allowlist; anything not listed is blocked by the browser.

When you introduce a new external API dependency, update the `connect-src` allowlist
in the CSP configuration and document the origin here so reviewers can verify it.

## Testing

End-to-end tests live in [`tests/e2e/`](tests/e2e/).
