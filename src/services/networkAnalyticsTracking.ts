/**
 * Analytics tracking stub for the Network & Stellar UX.
 *
 * Provides a lightweight, typed event-tracking interface that can be swapped
 * for a real analytics SDK (e.g. Segment, PostHog, Amplitude) without changing
 * call sites. In development the stubs log to the console; in production they
 * are no-ops until a real provider is wired in.
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
// Stub track function
// ---------------------------------------------------------------------------

/**
 * Record a network or Stellar-related analytics event.
 *
 * In development this logs to the console so you can verify tracking calls
 * during manual testing. In production it becomes a no-op until a real
 * analytics provider adapter is implemented.
 */
export function trackNetworkEvent(
	eventName: NetworkEventName,
	payload: NetworkEventPayload = {},
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
