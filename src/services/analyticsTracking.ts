/**
 * Analytics tracking stub for the Transactions UI.
 *
 * This module provides a lightweight event-tracking interface that can be
 * swapped for a real analytics SDK (e.g. Segment, PostHog, Amplitude) without
 * changing call sites.  In development the stubs log to the console; in
 * production they are no-ops until a real provider is wired in.
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
	| "transaction_row_click";

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
 * calls during manual testing. In production it becomes a no-op until a
 * real analytics provider adapter is implemented.
 */
export function trackTransactionEvent(
	eventName: TransactionEventName,
	payload: TransactionEventPayload = {},
): void {
	if (process.env.NODE_ENV === "development") {
		console.log(`[Analytics] ${eventName}`, payload);
	}

	// TODO: Replace with real analytics provider integration, e.g.:
	//   if (typeof window !== "undefined" && window.analytics) {
	//     window.analytics.track(eventName, payload);
	//   }
}

// ---------------------------------------------------------------------------
// Named convenience helpers (optional — uncomment when needed)
// ---------------------------------------------------------------------------

// export function trackTransactionView(address: string) {
//   trackTransactionEvent("transactions_view", { address });
// }
