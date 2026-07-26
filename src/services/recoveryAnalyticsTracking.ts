/**
 * Analytics tracking stub for the Recovery UI.
 *
 * Follows the same lightweight event-tracking interface as analyticsTracking.ts
 * so it can be swapped for a real analytics SDK (e.g. Segment, PostHog,
 * Amplitude) without changing call sites. In development the stubs log to the
 * console; in production they are no-ops until a real provider is wired in.
 *
 * Usage:
 *   import { trackRecoveryEvent } from "@/services/recoveryAnalyticsTracking";
 *   trackRecoveryEvent("recovery_view");
 */

// ---------------------------------------------------------------------------
// Event names
// ---------------------------------------------------------------------------

export type RecoveryEventName =
	| "recovery_view"
	| "recovery_initiated"
	| "recovery_confirmed"
	| "recovery_cancelled"
	| "recovery_reset"
	| "recovery_faq_expanded"
	| "recovery_faq_collapsed"
	| "recovery_docs_link_clicked";

// ---------------------------------------------------------------------------
// Payload type
// ---------------------------------------------------------------------------

export type RecoveryEventPayload = Record<string, unknown>;

// ---------------------------------------------------------------------------
// Stub track function
// ---------------------------------------------------------------------------

/**
 * Record a recovery-related analytics event.
 *
 * In development this logs to the console so you can verify the tracking
 * calls during manual testing. In production it becomes a no-op until a
 * real analytics provider adapter is implemented.
 */
export function trackRecoveryEvent(
	eventName: RecoveryEventName,
	payload: RecoveryEventPayload = {},
): void {
	if (process.env.NODE_ENV === "development") {
		// biome-ignore lint/suspicious/noConsoleLog: allowed in dev
		console.log(`[Analytics] ${eventName}`, payload);
	}

	// TODO: Replace with real analytics provider integration, e.g.:
	//   if (typeof window !== "undefined" && window.analytics) {
	//     window.analytics.track(eventName, payload);
	//   }
}
