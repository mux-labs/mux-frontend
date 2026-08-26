/**
 * Analytics tracking for the Network & Stellar UX.
 *
 * Provides a lightweight, typed event-tracking interface backed by
 * `window.analytics.track` (Segment, PostHog, Amplitude, ...). In development
 * the events are additionally logged to the console; when the SDK isn't
 * present (tests, demo mode, etc.) tracking is a no-op.
 *
 * Usage:
 *   import { trackNetworkEvent } from "@/services/networkAnalyticsTracking";
 *   trackNetworkEvent("network_switched", { from: "mainnet", to: "testnet" });
 */

// ---------------------------------------------------------------------------
// Event names (enumerate here for discoverability)
// ---------------------------------------------------------------------------

export type NetworkEventName =
	| "network_page_view"
	| "network_switched"
	| "network_filter_applied"
	| "network_filter_cleared"
	| "stellar_address_viewed"
	| "stellar_explorer_opened"
	| "stellar_testnet_funded";

// ---------------------------------------------------------------------------
// Payload type
// ---------------------------------------------------------------------------

export type NetworkEventPayload = Record<string, unknown>;

// ---------------------------------------------------------------------------
// Track function
// ---------------------------------------------------------------------------

/**
 * Record a network or Stellar-related analytics event.
 *
 * In development this logs to the console so you can verify tracking calls
 * during manual testing. It always forwards the event to
 * `window.analytics.track` when the SDK is present; otherwise it's a no-op
 * (e.g. demo mode, tests, or before the script tag resolves).
 */
export function trackNetworkEvent(
	eventName: NetworkEventName,
	payload: NetworkEventPayload = {},
): void {
	if (process.env.NODE_ENV === "development") {
		// biome-ignore lint/suspicious/noConsoleLog: allowed in dev
		console.log(`[Analytics] ${eventName}`, payload);
	}

	if (typeof window !== "undefined") {
		window.analytics?.track(eventName, payload);
	}
}
