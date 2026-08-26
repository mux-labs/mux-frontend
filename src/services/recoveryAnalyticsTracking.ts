/**
 * Analytics tracking for the Recovery UI.
 *
 * Follows the same lightweight event-tracking interface as analyticsTracking.ts,
 * backed by `window.analytics.track` (Segment, PostHog, Amplitude, ...). In
 * development the events are additionally logged to the console; when the SDK
 * isn't present (tests, demo mode, etc.) tracking is a no-op.
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
// Track function
// ---------------------------------------------------------------------------

/**
 * Record a recovery-related analytics event.
 *
 * In development this logs to the console so you can verify the tracking
 * calls during manual testing. It always forwards the event to
 * `window.analytics.track` when the SDK is present; otherwise it's a no-op
 * (e.g. demo mode, tests, or before the script tag resolves).
 */
export function trackRecoveryEvent(
	eventName: RecoveryEventName,
	payload: RecoveryEventPayload = {},
): void {
	if (process.env.NODE_ENV === "development") {
		// biome-ignore lint/suspicious/noConsoleLog: allowed in dev
		console.log(`[Analytics] ${eventName}`, payload);
	}

	if (typeof window !== "undefined") {
		window.analytics?.track(eventName, payload);
	}
}
