# Spending Limits UI

## Overview

The spending limits screen is built around `SpendingLimitsCard`, which loads current limits from `/api/spending-limits`, lets the user edit daily and per-transaction caps, and saves changes back to the same route.

The card also keeps a local cache in `localStorage` under `spending-limits` so the last known values remain visible when the API is stale or disconnected.

## Component Props

### `SpendingLimitsCard`

```tsx
<SpendingLimitsCard loading={false} />
```

- `loading?: boolean`
- When `true`, the component renders its skeleton state and skips the live fetch.
- When omitted, the component fetches the current limits on mount.

## API Contract

### `GET /api/spending-limits`

Returns the current limits and today’s usage.

```ts
type SpendingLimitsResponse = {
  limits: {
    dailyLimit: number;
    transactionLimit: number;
  };
  todayUsage: number;
};
```

### `PUT /api/spending-limits`

Accepts the same limit fields and validates that both values are finite numbers between `1` and `1,000,000`.

```ts
type SpendingLimitsUpdate = {
  dailyLimit: number;
  transactionLimit: number;
};
```

## Runtime Notes

- Invalid cached data is ignored and the UI falls back to defaults.
- Failed fetches keep the last cached values visible when possible.
- Save errors are surfaced inline and via toast feedback.
- The UI uses dark-mode classes throughout and collapses cleanly on mobile.
