# Security & UX Guards — Issues #701–704, #757, #758

This document covers security and UX correctness fixes shipped together.
Each section describes the failure mode, what was fixed, and what the
automated tests verify.

---

## #701 Balance visibility toggle — DOM leak guard

**File:** `src/hooks/useBalanceVisibility.ts`  
**Component:** `src/components/wallet/WalletBalance.tsx`  
**Tests:** `src/hooks/__tests__/useBalanceVisibility.dom-leak.test.ts`

### Failure mode

A balance visibility toggle that renders the real formatted amount in DOM
text (even behind CSS `display:none` or `opacity:0`) leaks the amount to:

- Screen readers via the accessibility tree
- Browser extensions (password managers, page scrapers) that read DOM text
- The Clipboard API if a copy handler does not check the visibility state
  before writing to the clipboard

### What the implementation does

`useBalanceVisibility` exposes an `isInitialized` flag. Consumers **must**
gate their amount render on this flag to avoid a flash of the real value
before the persisted preference is read from `localStorage`:

```tsx
if (isLoading || !isInitialized) {
  // render a loading skeleton — not the real amount
  return <LoadingSkeleton />;
}
```

`WalletBalance` renders `••••••` (not the formatted amount) in the
`data-testid="balance-display"` span when `isVisible` is false, so the
real amount is never present in the DOM text when hidden.

**Clipboard contract.** Copy handlers must check `isVisible` before writing
the amount to the clipboard:

```ts
if (isVisible) {
  copyToClipboard(formattedBalance);
}
```

### Tests

The test suite (`useBalanceVisibility.dom-leak.test.ts`) fails if:

- `isInitialized` is removed (pre-hydration exposure).
- The toggle returns the wrong value after an even number of flips.
- `localStorage` and in-memory state diverge.
- A caller ignores `isVisible` and copies the amount while hidden.
- `localStorage` errors unexpectedly flip the balance to visible.

### Production vs demo/mock split

`useBalanceVisibility` is purely client-side state — no backend call
involved. The `localStorage` key is `mux_balance_visibility`. There is no
mock mode for this hook; it behaves identically in dev and production.

---

## #702 Copy-to-clipboard — no silent failure

**File:** `src/utils/copyToClipboardUx.ts`  
**Hook:** `src/hooks/useCopyToClipboardUx.ts`  
**Tests:** `src/hooks/__tests__/useCopyToClipboardUx.test.ts`

### Failure mode

If the Clipboard API throws (e.g. `NotAllowedError` when the user has
denied clipboard permission, or when `navigator.clipboard` is absent in an
embedded WebView), a silent failure means:

- The user believes the wallet address was copied but it was not.
- Sending funds to a manually-typed address increases the error rate.

### What the implementation does

`useCopyToClipboardUx` catches all Clipboard errors and sets a non-null,
non-empty `error` string. The `copy()` function returns `false` on failure.
Callers (e.g. `CopyButton`) use the `error` field to show a visible toast:

```tsx
const { copy, error, copied } = useCopyToClipboardUx();

// in JSX:
{error && <Toast variant="error">{error}</Toast>}
{copied && <Toast variant="success">Copied!</Toast>}
```

`copyToClipboardWithFallback` tries the modern `navigator.clipboard.writeText`
API first and falls back to `document.execCommand('copy')` for older
browsers. Both paths throw on failure so `useCopyToClipboardUx` always
surfaces the error.

### Tests

The test suite (`useCopyToClipboardUx.test.ts`) fails if:

- The `catch` block sets `error` to `null` or `""` on a Clipboard failure.
- `copied` is set to `true` after a failed write.
- The error is swallowed silently.
- `reset()` does not clear the error state.

### Production vs demo/mock split

No mock path exists for clipboard operations. The same code runs in dev and
production. `copyToClipboardWithFallback` never calls a backend route.

---

## #703 Keyboard commands — command palette conflict guard

**File:** `src/utils/keyboardCommands.ts`  
**Hook:** `src/hooks/useCommandPalette.ts`  
**Tests:** `src/hooks/__tests__/useCommandPalette.test.ts`

### Failure mode

Two independent keyboard handler systems exist:

1. `useCommandPalette` — opens the palette on `Ctrl+K` / `Cmd+K` and
   handles `Escape`, `ArrowUp/Down`, `Enter` while open.
2. `useCommandShortcut` / `useGlobalKeyboardCommands` — register shortcuts
   for individual commands.

If a command is registered with `Ctrl+K`, both systems fire simultaneously
when that key combination is pressed (double-fire conflict). If the palette
component is not mounted (e.g. on a page that does not render it),
`Ctrl+K` does nothing and the documented shortcut silently fails.

### What the implementation does

- `useCommandPalette` attaches a single `window` keydown listener that
  intercepts `Ctrl+K` / `Cmd+K` to open and navigation keys while open.
- `useCommandShortcut` / `useGlobalKeyboardCommands` each attach their own
  independent listener.
- `e.preventDefault()` is called on every intercepted key, which prevents
  the browser default but does **not** stop other `window` listeners from
  firing in jsdom (or most real browsers, for non-bubble-stopping events).

**Known limitation (documented conflict):** a command registered with the
same shortcut as the palette-open key (`Ctrl+K`) will fire alongside the
palette opening. De-conflicting requires either:
- Not registering commands on the palette-open shortcut, or
- Checking a shared "palette is open" flag in every command shortcut handler.

The test in section C of `useCommandPalette.test.ts` documents this known
conflict so a regression is caught if the behaviour changes silently.

### Tests

The test suite (`useCommandPalette.test.ts`) fails if:

- The palette does not open on `Ctrl+K` or `Cmd+K`.
- `Escape` does not close the palette.
- `useCommandShortcut` fires when `enabled=false`.
- Listener cleanup on unmount is missing (memory/event leak).
- `ArrowDown`/`ArrowUp`/`Enter` stop working while the palette is open.
- Multiple global commands fire for the same key press.

### Production vs demo/mock split

`useCommandPalette` is purely client-side. No backend or mock data path is
involved. Behaviour is identical in dev and production.

---

## #704 Date range validation — analytics export DoS guard

**File:** `src/lib/dateRangeValidation.ts`  
**Hook:** `src/hooks/useAnalyticsExport.ts`  
**Tests (unit):** `src/lib/__tests__/dateRangeValidation.test.ts`  
**Tests (integration):** `src/hooks/__tests__/useAnalyticsExport.dateRange.test.ts`

### Failure mode

An analytics export with an inverted or excessively large date range (e.g.
`from: today, to: 5 years ago` or a 3-year span) would send a request to
the metrics API that it cannot efficiently serve, acting as a
denial-of-service vector for the backend.

### What the implementation does

`validateDateRange` (in `src/lib/dateRangeValidation.ts`) rejects:

| Condition | Default limit | Error field |
|---|---|---|
| Inverted range (start > end) | — | `range` |
| Range span too large | 365 days | `range` |
| Future start date | — | `from` |
| Future end date | — | `to` |
| Start more than N years in the past | 2 years | `from` |
| Invalid date format | YYYY-MM-DD | `from`/`to` |
| Calendar-impossible date (e.g. Feb 30) | — | `from`/`to` |

All limits are configurable via the `options` parameter:

```ts
validateDateRange(range, {
  maxDays: 90,       // tighter limit for a specific export type
  maxYearsBack: 1,   // shorter historical window
  allowFuture: true, // for scheduled/forecast exports
});
```

`useAnalyticsExport` guards against the empty-data case (no transactions
to export) and surfaces any export error as a non-null `errorMessage` so
the UI can show a toast.

### Tests

The integration test suite (`useAnalyticsExport.dateRange.test.ts`) fails if:

- `validateDateRange` no longer checks `fromDate > toDate`.
- The `maxDays` guard is removed or its default is raised above 365.
- `useAnalyticsExport` sends a request for an empty transaction set.
- An export error is swallowed instead of surfaced via `errorMessage`.

### Production vs demo/mock split

`validateDateRange` is a pure function with no backend dependency. The
`useAnalyticsExport` hook calls the real metrics API in production and a
mock exporter in demo mode; the validation guard runs identically in both.

---

## #757 Spending limits proxy — fail-closed without `MUX_BACKEND_URL`

**File:** `src/lib/spendingLimitsProxy.ts`  
**Route:** `src/app/api/spending-limits/route.ts`  
**Tests:** `src/lib/__tests__/spendingLimitsProxy.test.ts`

### Failure mode

When `MUX_BACKEND_URL` is unset (misconfigured deploy, testnet/mainnet
mix-up, or a missing secret in the environment), the spending-limits proxy
must **not** fall through to a permissive default or forward the request to
an attacker-controlled host. A silent fallback would let clients bypass
spending-limit policy — the server/contract is the source of truth for
spends, so the proxy must fail closed.

### What the implementation does

`resolveBackendUrl()` returns `null` when `MUX_BACKEND_URL` is missing or
blank. The proxy then returns a deterministic **503** with a stable error
code and a correlation id, and never logs or echoes the backend URL:

```json
{
  "error": "spending_limits_unavailable",
  "code": "SPENDING_LIMITS_BACKEND_UNCONFIGURED",
  "correlationId": "<uuid>"
}
```

- **Stable error code** — `SPENDING_LIMITS_BACKEND_UNCONFIGURED` lets
  clients and dashboards distinguish misconfiguration from a transient
  backend outage.
- **Correlation id** — generated per request and returned in the response
  and the `x-correlation-id` header so ops can trace the failure without
  exposing internals.
- **Redaction** — the backend URL, API keys, and JWTs are never included in
  the response body or logs. Only the error code and correlation id are
  emitted.
- **Authz (deny-by-default)** — the proxy entrypoint requires an
authenticated session/API key before any spend-limit read or write. A
missing or invalid credential returns **401/403** and never reaches the
backend, so clients cannot bypass spending-limit policy.

### Tests

The test suite (`spendingLimitsProxy.test.ts`) fails if:

- `MUX_BACKEND_URL` unset does not return 503 with
  `SPENDING_LIMITS_BACKEND_UNCONFIGURED`.
- The response omits a correlation id or leaks the backend URL/keys.
- An unauthenticated request is not rejected (authz negative).
- A request with a revoked/expired credential is not rejected.
- The proxy forwards to a fallback host when the env var is missing.

### Production vs demo/mock split

In demo mode the proxy is not mounted; the UI reads mock spending limits
directly. In production the proxy is the only path to the backend and
fails closed when `MUX_BACKEND_URL` is unset. The kill-switch
(`SPENDING_LIMITS_PROXY_ENABLED=false`) disables the route entirely and
returns 503 with the same stable error code.
