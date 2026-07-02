/**
 * Analytics tracking stub for the Spending Limits UI.
 *
 * Provides a lightweight, typed event-tracking interface that can be swapped
 * for a real analytics SDK (e.g. Segment, PostHog, Amplitude) without changing
 * call sites. In development the stubs log to the console; in production they
 * are no-ops until a real provider is wired in.
 *
 * Usage:
 *   import { trackSpendingLimitsEvent } from "@/services/spendingLimitsTracking";
 *   trackSpendingLimitsEvent("spending_limits_saved", { dailyLimit: 5000, transactionLimit: 1000 });
 */

// ---------------------------------------------------------------------------
// Event names (enumerate here for discoverability)
// ---------------------------------------------------------------------------

export type SpendingLimitsEventName =
	/** Fired when the user successfully saves their spending limits. */
	| "spending_limits_saved"
	/** Fired when a save attempt fails (e.g. localStorage quota exceeded). */
	| "spending_limits_save_failed"
	/** Fired when previously persisted limits are loaded on mount. */
	| "spending_limits_loaded"
	/** Fired when the user changes the daily limit input value. */
	| "spending_limits_daily_changed"
	/** Fired when the user changes the per-transaction limit input value. */
	| "spending_limits_transaction_changed"
	/** Fired when an input value fails front-end validation. */
	| "spending_limits_validation_error";

// ---------------------------------------------------------------------------
// Payload type
// ---------------------------------------------------------------------------

export type SpendingLimitsEventPayload = Record<string, unknown>;

// ---------------------------------------------------------------------------
// Stub track function
// ---------------------------------------------------------------------------

/**
 * Record a spending-limits-related analytics event.
 *
 * In development this logs to the console so you can verify tracking calls
 * during manual testing. In production it becomes a no-op until a real
 * analytics provider adapter is implemented.
 */
export function trackSpendingLimitsEvent(
	eventName: SpendingLimitsEventName,
	payload: SpendingLimitsEventPayload = {},
): void {
	if (process.env.NODE_ENV !== "production") {
		// biome-ignore lint/suspicious/noConsoleLog: allowed in dev/test
		console.log(`[Analytics] ${eventName}`, payload);
	}

	// TODO: Replace with real analytics provider integration, e.g.:
	//   if (typeof window !== "undefined" && window.analytics) {
	//     window.analytics.track(eventName, payload);
	//   }
}
