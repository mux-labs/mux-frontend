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
