/**
 * Analytics tracking for the Transactions UI.
 *
 * This module provides a lightweight event-tracking interface backed by
 * `window.analytics.track` (Segment, PostHog, Amplitude, ...) without
 * changing call sites. In development the events are additionally logged to
 * the console; when the SDK isn't present (tests, demo mode, etc.) tracking
 * is a no-op.
 *
 * Usage:
 *   import { trackTransactionEvent } from "@/services/analyticsTracking";
 *   trackTransactionEvent("transactions_view", { address: "G…" });
 */

// ---------------------------------------------------------------------------
// Event names (enumerate here for discoverability)
// ---------------------------------------------------------------------------

export type TransactionEventName =
	| "transactions_view"
	| "transactions_sort"
	| "transactions_filter_changed"
	| "transactions_filters_cleared"
	| "transactions_page_change"
	| "transactions_items_per_page"
	| "transaction_row_click"
	| "transactions_export_csv";

// ---------------------------------------------------------------------------
// Payload type
// ---------------------------------------------------------------------------

export type TransactionEventPayload = Record<string, unknown>;

// ---------------------------------------------------------------------------
// Stub track function
// ---------------------------------------------------------------------------

/**
 * Record a transaction-related analytics event.
 *
 * In development this logs to the console so you can verify the tracking
 * calls during manual testing. It always forwards the event to
 * `window.analytics.track` when the SDK is present; otherwise it's a no-op.
 */
export function trackTransactionEvent(
	eventName: TransactionEventName,
	payload: TransactionEventPayload = {},
): void {
	if (process.env.NODE_ENV === "development") {
		console.log(`[Analytics] ${eventName}`, payload);
	}

	if (typeof window !== "undefined") {
		window.analytics?.track(eventName, payload);
	}
}

// ---------------------------------------------------------------------------
// Named convenience helpers (optional — uncomment when needed)
// ---------------------------------------------------------------------------

// export function trackTransactionView(address: string) {
//   trackTransactionEvent("transactions_view", { address });
// }
