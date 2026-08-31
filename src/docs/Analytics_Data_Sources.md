# Analytics Data Sources

This document describes every data source consumed by the Mux Protocol analytics
dashboard, how each source is structured, where it lives in the codebase, and
how to swap mock data for a real backend when one becomes available.

---

## Table of Contents

1. [Overview](#overview)
2. [Data Types](#data-types)
   - [Metric](#metric)
   - [ChartDataPoint](#chartdatapoint)
   - [AssetData](#assetdata)
   - [TransactionVolumePoint](#transactionvolumepoint)
   - [Transaction (export)](#transaction-export)
3. [Mock Data Sources](#mock-data-sources)
   - [analytics mock-data](#analytics-mock-data)
   - [transaction-volume mock-data](#transaction-volume-mock-data)
4. [Components and Their Data Dependencies](#components-and-their-data-dependencies)
   - [MetricsCards](#metricscards)
   - [AnalyticsChart](#analyticschart)
   - [TopAssetsTable](#topassetstable)
   - [TransactionVolumeChart](#transactionvolumechart)
   - [AnalyticsExportButton](#analyticsexportbutton)
5. [Hooks](#hooks)
   - [useAnalyticsTransactions](#useanalyticstransactions)
   - [useAnalyticsExport](#useanalyticsexport)
6. [Environment Variables](#environment-variables)
7. [Replacing Mock Data with a Real Backend](#replacing-mock-data-with-a-real-backend)
8. [Stale and Disconnected State Handling](#stale-and-disconnected-state-handling)
9. [Export Formats](#export-formats)

---

## Overview

The analytics dashboard fetch metrics, chart data, and the top-assets table from
the Mux backend when an API base URL is configured (`NEXT_PUBLIC_API_URL` / its
aliases) and falls back to deterministic **local mock data** otherwise, so the
UI stays functional in development, CI, and demo environments without a live
backend. The **CSV / JSON export** is backed by real, date-scoped transaction
records (`GET /analytics/transactions-list`, consumed via
`useAnalyticsTransactions`) — never synthetic objects derived from the
top-assets aggregation.

The architecture is designed so that swapping in a real API requires only
changing the data-loading layer (a single async function per data type) without
touching any component.

```
┌─────────────────────────────────────────────────────────┐
│                   Analytics Page                        │
│  src/app/dashboard/analytics/page.tsx                   │
│  src/app/demo/dashboard/analytics/page.tsx              │
└────────────────┬────────────────────────────────────────┘
                 │ props
     ┌───────────┼───────────────────────────┐
     ▼           ▼                           ▼
MetricsCards  AnalyticsChart          TopAssetsTable
     │           │                           │
     └───────────┴───────────────────────────┘
                 │ all read from
     ┌───────────▼───────────────────────────┐
     │     src/mock-data/analytics.ts        │
     │  metrics · volumeData ·               │
     │  transactionsData · topAssets         │
     └───────────────────────────────────────┘

TransactionVolumeChart reads from:
     src/mock-data/transaction-volume.ts  (dailyTransactionVolume)

AnalyticsExportButton + useAnalyticsExport read from:
     src/types/analytics.ts  (Transaction[])
     src/utils/exportData.ts (serialisation helpers)
```

---

## Data Types

All shared types are defined in two files:

| File | Purpose |
|------|---------|
| `src/mock-data/analytics.ts` | `Metric`, `ChartDataPoint`, `AssetData` — chart and table shapes |
| `src/types/analytics.ts` | `Transaction`, `AnalyticsSummary`, `ExportFormat`, `ExportStatus` — transaction and export shapes |

### Metric

```ts
// src/mock-data/analytics.ts
interface Metric {
  label: string;       // Display name, e.g. "Total Volume"
  value: string;       // Pre-formatted display value, e.g. "$12.4M"
  change: number;      // Percentage change vs previous period (negative = down)
  changeLabel: string; // Context label, e.g. "vs last period"
}
```

Used by: `MetricsCards`

### ChartDataPoint

```ts
// src/mock-data/analytics.ts
interface ChartDataPoint {
  date: string;  // X-axis label, e.g. "Mon" or "2024-01-01"
  value: number; // Raw numeric value for the bar height
}
```

Used by: `AnalyticsChart` (both volume and transactions charts)

### AssetData

```ts
// src/mock-data/analytics.ts
interface AssetData {
  rank: number;        // 1-based ranking position
  name: string;        // Full asset name, e.g. "Mux Protocol"
  symbol: string;      // Ticker symbol, e.g. "MUX"
  volume: string;      // Pre-formatted volume string, e.g. "$4,234,567"
  volumeChange: number; // Percentage change (negative = down)
  tvl: string;         // Pre-formatted TVL string, e.g. "$18.2M"
  txCount: number;     // Raw transaction count
}
```

Used by: `TopAssetsTable`

### TransactionVolumePoint

```ts
// src/mock-data/transaction-volume.ts
interface TransactionVolumePoint {
  date: string;   // ISO date string YYYY-MM-DD
  count: number;  // Number of transactions on this day
  volume: number; // Total volume in XLM on this day
}
```

Used by: `TransactionVolumeChart`

### Transaction (export)

```ts
// src/types/analytics.ts
interface Transaction {
  id: string;
  description: string;
  date: string;      // ISO date string, e.g. "2023-10-24"
  humanDate: string; // Human-readable, e.g. "Oct 24, 2023"
  category: string;
  status: "completed" | "pending" | "failed";
  amount: number;
  currency: string;
  type: "incoming" | "outgoing";
}
```

Used by: `useAnalyticsExport`, `exportTransactions`

---

## Mock Data Sources

### analytics mock-data

**File:** `src/mock-data/analytics.ts`

Exports four named constants consumed directly by the analytics page and its
child components:

| Export | Type | Description |
|--------|------|-------------|
| `metrics` | `Metric[]` | Four KPI cards: Total Volume, Total Transactions, Active Wallets, Success Rate |
| `volumeData` | `ChartDataPoint[]` | Seven daily volume data points (Mon–Sun), values in USD |
| `transactionsData` | `ChartDataPoint[]` | Seven daily transaction count data points (Mon–Sun) |
| `topAssets` | `AssetData[]` | Five assets ranked by volume: MUX, XLM, USDC, ETH, BTC |
| `exportTransactions` | `Transaction[]` | Five export-shaped transaction rows consumed by the CSV / JSON downloads (via `useAnalyticsTransactions`). Used only as the non-production mock fallback. |

All metrics/chart values are static and representative of a typical week of
platform activity.
`exportTransactions` are genuine per-transaction rows (not derived from
`topAssets`) so the export always has representative data to download locally.
They are intentionally pre-formatted (e.g. `"$12.4M"`) so components do not need
to perform currency formatting themselves.

### transaction-volume mock-data

**File:** `src/mock-data/transaction-volume.ts`

Exports one named constant:

| Export | Type | Description |
|--------|------|-------------|
| `dailyTransactionVolume` | `TransactionVolumePoint[]` | 90 days of deterministic daily data generated via a seeded pseudo-random function |

The data is generated at module load time using a deterministic seed so it is
stable across renders and test runs. Weekend days have a 50% volume reduction
applied to simulate realistic traffic patterns.

---

## Components and Their Data Dependencies

### MetricsCards

**File:** `src/components/analytics/MetricsCards.tsx`

| Prop | Type | Source |
|------|------|--------|
| `metrics` | `Metric[]` | `metrics` from `src/mock-data/analytics.ts` |

Renders a responsive grid of four KPI stat cards. Each card shows the metric
label, formatted value, and a colour-coded percentage change badge.

### AnalyticsChart

**File:** `src/components/analytics/AnalyticsChart.tsx`

| Prop | Type | Source |
|------|------|--------|
| `title` | `string` | Caller-provided |
| `description` | `string?` | Caller-provided |
| `data` | `ChartDataPoint[]` | `volumeData` or `transactionsData` from `src/mock-data/analytics.ts` |
| `formatValue` | `(v: number) => string` | Caller-provided (optional) |

Renders a bar chart. The bar height for each point is computed as
`(point.value / max) * 100` percent. The footer shows the total and average
across all data points using the `formatValue` formatter.

### TopAssetsTable

**File:** `src/components/analytics/TopAssetsTable.tsx`

| Prop | Type | Source |
|------|------|--------|
| `assets` | `AssetData[]` | `topAssets` from `src/mock-data/analytics.ts` |

Renders a sortable-ready table of the top five assets by volume. Volume change
is colour-coded (green = positive, red = negative).

### TransactionVolumeChart

**File:** `src/components/analytics/TransactionVolumeChart.tsx`

| Prop | Type | Source |
|------|------|--------|
| `data` | `TransactionVolumePoint[]` | `dailyTransactionVolume` from `src/mock-data/transaction-volume.ts` |
| `metric` | `"count" \| "volume"` | Caller-provided (default: `"count"`) |

Renders an SVG line chart with area fill, Y/X axis labels, and an interactive
tooltip crosshair. The `metric` prop switches between transaction count and XLM
volume on the Y axis.

### AnalyticsExportButton

**File:** `src/components/analytics/AnalyticsExportButton.tsx`

A controlled component — it receives all state from `useAnalyticsExport` as
props and emits `onExport(format)` / `onReset()` callbacks. It has no direct
data dependency; the data flows through the hook.

| Prop | Type | Description |
|------|------|-------------|
| `status` | `ExportStatus` | Current export lifecycle state |
| `errorMessage` | `string \| null` | Error text shown inline |
| `onExport` | `(format: ExportFormat) => void` | Triggers export |
| `onReset` | `() => void` | Dismisses error state |
| `rowCount` | `number` | Number of rows to be exported |

---

## Hooks

### useAnalyticsTransactions

**File:** `src/hooks/useAnalyticsTransactions.ts`

Fetches the real, export-shaped transaction list for a date range
(`GET /analytics/transactions-list`), mirroring the production/mock split of
`useAnalyticsMetrics`:

- Backend URL configured → fetch real rows via `fetchExportTransactions`.
- No backend, non-production → fall back to `exportTransactions` from
  `src/mock-data/analytics.ts`.
- No backend, **production** → surface an error. The export never silently
  reports success with mock rows in production.

This hook supplies the `transactions` array the analytics page passes to
`useAnalyticsExport` — so the CSV / JSON download contains genuine
per-transaction records for the selected range rather than synthetic objects
synthesised from the aggregated `topAssets` table.

### useAnalyticsExport

**File:** `src/hooks/useAnalyticsExport.ts`

Manages the full lifecycle of a CSV or JSON export operation.

```ts
const { status, errorMessage, exportAs, reset } = useAnalyticsExport({
  transactions,          // Transaction[] — the data to export
  filenameBase,          // string — base filename without extension (default: "analytics-export")
  successResetDelay,     // number — ms before auto-reset to idle after success (default: 2000)
});
```

**State machine:**

```
idle ──► exporting ──► success ──► idle (auto-reset after successResetDelay)
                   └──► error  ──► idle (manual reset via reset())
```

**Guards:**
- If `status === "exporting"`, subsequent calls to `exportAs` are no-ops.
- If `transactions` is empty, the hook transitions directly to `"error"` with
  the message `"No data available to export."` without attempting serialisation.

**Serialisation** is handled by `src/utils/exportData.ts`:
- `transactionsToCsv(transactions)` — RFC 4180-compliant CSV with header row
- `transactionsToJson(transactions)` — pretty-printed JSON array
- `triggerDownload(content, filename, mimeType)` — creates a `Blob`, attaches a
  temporary `<a>` element, clicks it, and revokes the object URL after 100 ms

---

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `NEXT_PUBLIC_MUX_API_URL` | No | `https://api.muxprotocol.com` | Base URL for the Mux Protocol API. When empty, the analytics page falls back to mock data. |
| `NEXT_PUBLIC_APP_URL` | No | `http://localhost:3000` | Public-facing URL of the application |
| `MUX_API_KEY` | No | — | Server-side API key for authenticated requests |
| `MUX_API_SECRET` | No | — | Server-side API secret |

All variables are validated at startup by `src/lib/env.ts`. Missing optional
variables produce console warnings; missing required variables throw in
production.

---

## Replacing Mock Data with a Real Backend

The analytics page currently imports mock data directly. To wire in a real API:

### 1. Set the environment variable

```bash
# .env.local
NEXT_PUBLIC_MUX_API_URL=https://api.muxprotocol.com
```

### 2. Expected API response shapes

The backend must return JSON matching these shapes:

**`GET /analytics/metrics?from=YYYY-MM-DD&to=YYYY-MM-DD`**
```json
{
  "metrics": [
    { "label": "Total Volume", "value": "$12.4M", "change": 12.5, "changeLabel": "vs last period" }
  ]
}
```

**`GET /analytics/volume?from=YYYY-MM-DD&to=YYYY-MM-DD`**
```json
{
  "data": [
    { "date": "Mon", "value": 2400000 }
  ]
}
```

**`GET /analytics/transactions?from=YYYY-MM-DD&to=YYYY-MM-DD`**
```json
{
  "data": [
    { "date": "Mon", "value": 12000 }
  ]
}
```

**`GET /analytics/top-assets?from=YYYY-MM-DD&to=YYYY-MM-DD`**
```json
{
  "assets": [
    {
      "rank": 1,
      "name": "Mux Protocol",
      "symbol": "MUX",
      "volume": "$4,234,567",
      "volumeChange": 15.2,
      "tvl": "$18.2M",
      "txCount": 28432
    }
  ]
}
```

**`GET /analytics/transactions-list?from=YYYY-MM-DD&to=YYYY-MM-DD`** — the
backing source for the analytics **export** (CSV / JSON download). Returns the
real, export-shaped `Transaction[]` records for the selected range — not the
aggregated top-assets table:
```json
{
  "transactions": [
    {
      "id": "txn_mainnet_48291034",
      "description": "SDK wallet payout",
      "date": "2025-05-28",
      "humanDate": "May 28, 2025",
      "category": "MW",
      "status": "completed",
      "amount": 250,
      "currency": "XLM",
      "type": "outgoing"
    }
  ]
}
```
Consumed by `fetchExportTransactions` (`src/services/analyticsService.ts`) via
the `useAnalyticsTransactions` hook. In a production build with no backend, the
hook surfaces an error rather than exporting mock rows.

### 3. Create a data-loading function

Add a function in `src/services/analyticsService.ts` (or equivalent) that uses
`ApiClient` from `src/lib/api/client.ts`:

```ts
import ApiClient from "@/lib/api/client";
import type { Metric, ChartDataPoint, AssetData } from "@/mock-data/analytics";

export async function fetchAnalyticsMetrics(
  client: ApiClient,
  from: string,
  to: string,
): Promise<Metric[]> {
  const res = await client.get<{ metrics: Metric[] }>(
    `/analytics/metrics?from=${from}&to=${to}`,
  );
  return res.metrics;
}
```

### 4. Update the page

Replace the static import in the analytics page with a call to your service
function. The components themselves require no changes — they accept the same
typed props regardless of where the data comes from.

---

## Stale and Disconnected State Handling

The current mock-data implementation is synchronous and never fails. When a real
API is introduced, the following patterns should be applied:

| Scenario | Recommended handling |
|----------|---------------------|
| Network request in-flight | Show `AnalyticsLoadingSkeleton` (see issues #116, #117) |
| Request succeeds, empty data | Show `AnalyticsEmptyState` with a "Try a different date range" message |
| Request fails | Show `ErrorState` with a retry button that calls `refetch()` |
| Component unmounts before request resolves | Use a `cancelled` flag in `useEffect` cleanup to discard stale responses |
| User changes date range mid-flight | Cancel the previous request (via `cancelled` flag) and start a new one |

These patterns are already implemented in the loading skeleton (#116) and empty
state (#117) issues. The `ApiClient` in `src/lib/api/client.ts` surfaces HTTP
errors as `ApiError` objects with `message`, `status`, and `details` fields.

---

## Export Formats

The `useAnalyticsExport` hook supports two formats:

### CSV

- Header row: `ID,Date,Description,Category,Type,Status,Amount,Currency`
- RFC 4180 compliant: cells containing commas, newlines, or double-quotes are
  wrapped in double-quotes with internal double-quotes escaped as `""`
- MIME type: `text/csv;charset=utf-8;`
- File extension: `.csv`

### JSON

- Pretty-printed with 2-space indentation
- Full `Transaction` object array — all fields preserved
- MIME type: `application/json;charset=utf-8;`
- File extension: `.json`

Both formats are triggered via `triggerDownload()` which creates a temporary
`Blob` URL, clicks a hidden `<a>` element, and revokes the URL after 100 ms to
avoid memory leaks.
