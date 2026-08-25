/**
 * Analytics tracking for the Spending Limits UI.
 *
 * Provides a lightweight, typed event-tracking interface backed by
 * `window.analytics.track` (Segment, PostHog, Amplitude, ...). In
 * non-production environments the events are additionally logged to the
 * console; when the SDK isn't present (tests, demo mode, etc.) tracking is a
 * no-op.
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
// Track function
// ---------------------------------------------------------------------------

/**
 * Record a spending-limits-related analytics event.
 *
 * In non-production environments this logs to the console so you can verify
 * tracking calls during manual testing. It always forwards the event to
 * `window.analytics.track` when the SDK is present; otherwise it's a no-op
 * (e.g. demo mode, tests, or before the script tag resolves).
 */
export function trackSpendingLimitsEvent(
	eventName: SpendingLimitsEventName,
	payload: SpendingLimitsEventPayload = {},
): void {
	if (process.env.NODE_ENV !== "production") {
		// biome-ignore lint/suspicious/noConsoleLog: allowed in dev/test
		console.log(`[Analytics] ${eventName}`, payload);
	}

	if (typeof window !== "undefined") {
		window.analytics?.track(eventName, payload);
	}
}
