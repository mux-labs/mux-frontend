/**
 * Analytics tracking stub for the Wallet Detail UI.
 *
 * Provides a lightweight, typed event-tracking interface that can be swapped
 * for a real analytics SDK (e.g. Segment, PostHog, Amplitude) without changing
 * call sites. In development the stubs log to the console; in production they
 * are no-ops until a real provider is wired in.
 *
 * Usage:
 *   import { trackWalletEvent } from "@/services/walletAnalyticsTracking";
 *   trackWalletEvent("wallet_detail_view", { walletId: "wallet-001" });
 */

// ---------------------------------------------------------------------------
// Event names (enumerate here for discoverability)
// ---------------------------------------------------------------------------

export type WalletEventName =
	| "wallets_list_view"
	| "wallet_detail_view"
	| "wallet_balance_refresh"
	| "wallet_address_copied"
	| "wallet_send_opened"
	| "wallet_receive_opened";

// ---------------------------------------------------------------------------
// Payload type
// ---------------------------------------------------------------------------

export type WalletEventPayload = Record<string, unknown>;

// ---------------------------------------------------------------------------
// Stub track function
// ---------------------------------------------------------------------------

/**
 * Record a wallet-related analytics event.
 *
 * In development this logs to the console so you can verify tracking calls
 * during manual testing. In production it becomes a no-op until a real
 * analytics provider adapter is implemented.
 */
export function trackWalletEvent(
	eventName: WalletEventName,
	payload: WalletEventPayload = {},
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
