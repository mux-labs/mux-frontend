# Security & UX Guards — Issues #701–704, #757, #758, #759

This document covers security and UX correctness fixes shipped together.
Each section describes the failure mode, what was fixed, and what the
automated tests verify.

---

## #756 MUX_API_KEY / MUX_API_SECRET never client-bundled

**Guard:** `src/lib/serverEnv.ts`  
**Tests:** `src/lib/__tests__/serverEnv.test.ts`

### Failure mode

`MUX_API_KEY` and `MUX_API_SECRET` authenticate the frontend to the Mux
backend. If either is read from a module that is imported by a client
component, Next.js inlines the value into the client bundle and it is
shipped to every browser. A leaked `MUX_API_SECRET` lets an attacker mint
sessions, sign spends, or impersonate the app against the Mux API — a
money-path and account-takeover gap.

### What the implementation does

- The secrets are read **only** in server-only modules (route handlers,
  server actions, server utilities). They are never referenced from client
  components or from shared modules that the client imports.
- They are **never** exposed via `NEXT_PUBLIC_*` and are not passed through
  any public-env passthrough in `next.config.ts`.
- `src/lib/serverEnv.ts` is marked server-only and exposes a fail-closed
  accessor. Accessing the secret from a client context, or with the required
  server env missing, throws a typed `ServerEnvError` with a stable `code`
  and a secret-free `message`:

| Condition | Code |
|---|---|
| Secret accessed from a client context | `CLIENT_SECRET_ACCESS` |
| Required server env missing | `MISSING_SERVER_ENV` |

```ts
import { getMuxApiCredentials } from '@/lib/serverEnv';

// server-only: route handler / server action / server utility
const { apiKey, apiSecret } = getMuxApiCredentials();
```

### Tests

The test suite (`serverEnv.test.ts`) fails if:

- The secret is read from a client context without throwing.
- Missing required server env does not throw `MISSING_SERVER_ENV`.
- Error messages leak the key or secret value.
- The secret is re-exported from a client-importable module.

### Production vs demo/mock split

There is no mock path for credentials. The guard behaves identically in dev
and production; in production a missing secret fails closed rather than
falling back to a mock or empty value.

---

## #754 Env validation never serves mocks in production

**File:** `src/lib/envValidation.ts`  
**Tests:** `src/lib/__tests__/envValidation.test.ts`

### Failure mode

If a production build is misconfigured — a mock flag left on, a mock API
base URL, or a testnet endpoint in mainnet mode — the app could silently
serve mock wallet/AA/payment data. That is a money-path correctness and
security gap: users would see fabricated balances or route real actions
against mock backends.

### What the implementation does

`validateEnv` is **fail-closed**: in production it throws a typed
`EnvValidationError` (stable `code`, secret-free `message`) for any
configuration that would enable mocks. Mock providers/data are gated behind
non-production checks, so mocks can never be served in production.

| Condition | Code |
|---|---|
| Mock flag enabled in production | `MOCK_IN_PRODUCTION` |
| Mock API base URL in production | `MOCK_URL_IN_PRODUCTION` |
| Testnet endpoint in mainnet mode | `NETWORK_MISMATCH` |
| Missing required production var | `MISSING_REQUIRED` |

### Tests

The test suite (`envValidation.test.ts`) fails if:

- Production + mock flag does not throw.
- Production + mock API base URL does not throw.
- Mainnet mode + testnet endpoint does not throw.
- Non-production environments are incorrectly rejected.
- Error messages leak secret values.

### Production vs demo/mock split

Mock data paths are only reachable when `NODE_ENV !== 'production'` **and**
the mock flag is explicitly set. Production validation rejects both, so the
mock path is unreachable in production.

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
- The `maxYearsBack` guard is removed.
- A future `from`/`to` date is accepted when `allowFuture` is false.
- An invalid or calendar-impossible date is accepted.
- `useAnalyticsExport` sends a request for an empty transaction set.
- An export failure does not surface a non-null `errorMessage`.

### Production vs demo/mock split

`validateDateRange` is a pure function with no backend dependency. The
`useAnalyticsExport` hook calls the real metrics API in production; in demo
mode it short-circuits to a local fixture and never hits the network. The
validation runs in both modes so the guard cannot be bypassed by toggling
demo mode.

---

## #757 Wallet address validation — checksum & network guard

**File:** `src/lib/walletAddressValidation.ts`  
**Hook:** `src/hooks/useWalletAddressValidation.ts`  
**Tests:** `src/lib/__tests__/walletAddressValidation.test.ts`

### Failure mode

A wallet address that is syntactically valid but belongs to the wrong
network (e.g. a Stellar mainnet `G...` address pasted into a testnet flow)
or that fails the StrKey checksum would be accepted by a naive
length/prefix check. Sending funds to such an address is unrecoverable.

### What the implementation does

`validateWalletAddress` performs, in order:

1. **Format check** — `G` prefix, 56 characters, base32 alphabet.
2. **StrKey checksum** — decodes the base32 payload and verifies the
   CRC16-XModem checksum. A single transposed character fails here.
3. **Network check** — the address is validated against the active network
   from `NetworkContext`; a mainnet address in a testnet session (or vice
   versa) is rejected with `WALLET_ADDRESS_WRONG_NETWORK`.

All failures return a stable error code (`WALLET_ADDRESS_INVALID_FORMAT`,
`WALLET_ADDRESS_BAD_CHECKSUM`, `WALLET_ADDRESS_WRONG_NETWORK`) so callers
can branch on the code rather than parsing a message string.

### Tests

The test suite (`walletAddressValidation.test.ts`) fails if:

- A 56-char string with a valid prefix but a broken checksum is accepted.
- A mainnet address is accepted while the active network is testnet.
- A testnet address is accepted while the active network is mainnet.
- The returned error code is not one of the stable codes above.

### Production vs demo/mock split

`validateWalletAddress` is a pure function. The active network is injected
by the caller (from `NetworkContext`), so the same code runs in dev and
production with no mock path.

---

## #758 Transaction confirmation — reorg & timeout guard

**File:** `src/hooks/useTransactionConfirmation.ts`  
**Tests:** `src/hooks/__tests__/useTransactionConfirmation.test.ts`

### Failure mode

A transaction that is included in a block but later reorged out would be
reported as confirmed if the hook only checks for a single inclusion. A
transaction that never confirms would leave the UI in a permanent
"pending" state with no timeout, and a dependency outage (Horizon/RPC
down) would surface as an unhandled rejection.

### What the implementation does

`useTransactionConfirmation`:

- Polls the confirmation source until the transaction reaches the
  configured confirmation depth (default 1 for testnet, 2 for mainnet).
- Re-checks the transaction hash on every poll; if the transaction is no
  longer found after having been seen, it transitions to `reorged` rather
  than `confirmed`.
- Enforces a `timeoutMs` (default 120s). On timeout it transitions to
  `timedOut` and surfaces a non-null `error`.
- Treats any RPC/Horizon error as fail-closed: the state stays `pending`
  (never `confirmed`) and the error is surfaced.

### Tests

The test suite (`useTransactionConfirmation.test.ts`) fails if:

- A transaction seen once is reported `confirmed` without reaching the
  required depth.
- A transaction that disappears after being seen is reported `confirmed`
  instead of `reorged`.
- The timeout does not fire, or fires without setting `error`.
- An RPC error is swallowed and the state advances to `confirmed`.

### Production vs demo/mock split

The hook calls the real confirmation source in production. In demo mode it
uses a deterministic in-memory source that never reports a reorg, so the
reorg path is only exercised by the unit tests. The confirmation depth is
derived from the active network in `NetworkContext`.

---

## #759 NetworkContext scopes wallets query only

**File:** `src/contexts/NetworkContext.tsx`  
**Consumer:** `src/hooks/useWallets.ts`  
**Tests:** `src/contexts/__tests__/NetworkContext.test.tsx`

### Failure mode

If the wallets query is not scoped to the active network, a session on
testnet can read mainnet wallet data (or vice versa). This leaks
cross-network data, lets a user act on a wallet that does not exist on the
active chain, and makes AA/payment behavior depend on whichever network
happened to be cached first. An unknown or unsupported network must never
produce a wallet query at all.

### What the implementation does

`NetworkContext` exposes a typed, stable API:

```ts
type NetworkId = 'mainnet' | 'testnet' | 'futurenet';

interface NetworkContextValue {
  networkId: NetworkId;
  chain: 'stellar';
  isMainnet: boolean;
  isTestnet: boolean;
  /** Stable error code when the configured network is unknown/unsupported. */
  errorCode: NetworkErrorCode | null;
  /** Correlation id for logs/metrics; never contains secrets. */
  correlationId: string;
}
```

`NetworkErrorCode` is a closed union (`NETWORK_UNKNOWN`,
`NETWORK_UNSUPPORTED`, `NETWORK_MISCONFIGURED`) so callers branch on the
code, not on a message string.

**Scoping invariant.** The wallets query key includes `networkId`, and the
query is disabled unless the context reports a supported network:

```ts
const { networkId, errorCode } = useNetwork();

useQuery({
  queryKey: ['wallets', networkId],
  queryFn: () => fetchWallets(networkId),
  enabled: errorCode === null, // fail-closed on unknown network
});
```

Because `networkId` is part of the query key, switching networks cannot
serve a cached result from the previous network. When `errorCode` is
non-null the query never runs, so no wallet data is fetched against an
unknown/unsupported network.

**Fail-closed on dependency outage.** If the network cannot be resolved
(e.g. the config/RPC lookup fails), `NetworkContext` sets `errorCode`
rather than defaulting to mainnet. The wallets query stays disabled and the
UI shows an actionable error instead of querying the wrong chain.

### Tests

The test suite (`NetworkContext.test.tsx`) fails if:

- The wallets query key does not include `networkId`.
- The wallets query runs while `errorCode` is non-null (unknown network).
- Switching from testnet to mainnet serves a cached testnet result.
- An unknown/unsupported network defaults to mainnet instead of failing
  closed.
- `errorCode` is not one of the stable `NetworkErrorCode` values.
- `correlationId` is empty or contains raw key material.

### Production vs demo/mock split

`NetworkContext` reads the active network from the build-time env
(`VITE_NETWORK`) and the runtime config. In demo mode it pins to `testnet`
and never queries mainnet. The scoping invariant is enforced in both modes
so demo mode cannot be used to bypass the network guard.
