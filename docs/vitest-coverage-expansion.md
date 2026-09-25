# Vitest coverage expansion (recovery, login, transactions-table, middleware)

## Gap

`vitest.config.ts`'s `coverage.include` list only covers a subset of the app:

```
src/components/wallet/**
src/components/analytics/**
src/components/ui/**
src/components/transactions/**
src/lib/**
src/utils/**
src/hooks/**
src/mock-data/**
src/services/**
src/app/**/wallets/**
src/app/**/analytics/**
```

It omits `/recovery`, `/login`, `/transactions-table`, `src/middleware.ts`,
and most of `src/app/api/**`. Tests already exist for all of these areas —
see:

* `src/app/recovery/__tests__/page.test.tsx`
* `src/app/login/__tests__/*.test.tsx`
* `src/app/transactions-table/page.test.tsx`
* `src/test/middleware.test.ts`, `src/__tests__/middleware.test.ts`
* `src/app/api/**/*.test.ts` (every route under `src/app/api` has a
  matching `route.test.ts`)

— they just aren't reflected in the coverage report, so a regression in
any of these areas wouldn't show up as a coverage drop and could go
unnoticed.

## Fix

`vitest.coverage.full.config.ts` (repo root) is an additive, standalone
Vitest config — kept separate from `vitest.config.ts` rather than editing
it in place — that extends the same coverage setup with:

```
src/app/recovery/**
src/app/login/**
src/app/transactions-table/**
src/middleware.ts
src/app/api/**
```

Run it with:

```bash
pnpm exec vitest run --config vitest.coverage.full.config.ts --coverage
```

This uses the same test files, setup, and alias resolution as
`vitest.config.ts` — only the reported coverage surface is wider.

## Critical-path coverage (api-client, session, api routes)

The expanded surface above is exercised by the existing suite. The
critical-path modules below are covered by dedicated Vitest tests that
run under both `vitest.config.ts` and `vitest.coverage.full.config.ts`:

* `src/lib/api-client.ts` — request/response handling, error mapping,
  and correlation-id propagation.
* `src/lib/session.ts` — session lifecycle, expiry, and revocation.
* `src/app/api/**/route.ts` — authz, idempotency, and fail-closed
  negatives for the `api-keys` and `wallets` routes.

### Authz / idempotency / fail-closed negatives

Where the existing code already enforces policy, the tests assert the
negative path so a regression fails CI rather than silently widening
access:

* **Authz** — requests without a valid owner/delegate/guardian/API-key
  credential are rejected; revoked delegates and expired sessions are
  denied by default.
* **Idempotency** — replayed requests with the same idempotency key do
  not double-apply a write; concurrent duplicates resolve to a single
  effect.
* **Fail-closed** — dependency outages (RPC/DB/Horizon) cause writes to
  fail closed rather than partially apply; oversized/adversarial input
  is rejected before reaching the money path.

These tests do not change production behavior — they only pin the
contracts the routes and clients already implement.

## CI

Both configs run in the existing CI workflow. `vitest.config.ts` stays
the default gate; `vitest.coverage.full.config.ts` is the wider
reporting surface used to catch regressions in the areas listed above.
No new required check is added by this change.
