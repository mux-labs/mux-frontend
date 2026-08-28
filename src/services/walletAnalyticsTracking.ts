import { getApiBaseUrl } from "@/lib/api/config";

/**
 * Analytics tracking for the Wallet Detail UI.
 *
 * Provides a lightweight, typed event-tracking interface that dispatches to a
 * real analytics provider:
 *   1. A client-side SDK (e.g. Segment, PostHog, Amplitude) exposed as
 *      `window.analytics`, when one has been installed on the page.
 *   2. Otherwise, the Mux backend analytics endpoint (`/analytics/events`),
 *      when an API base URL is configured.
 *
 * In development events are also logged to the console for manual
 * verification. Delivery failures are swallowed — analytics must never break
 * the UI or block user interactions.
 *
 * Usage:
 *   import { trackWalletEvent } from "@/services/walletAnalyticsTracking";
 *   trackWalletEvent("wallet_detail_view", { walletId: "wallet-001" });
 */

declare global {
	interface Window {
		analytics?: {
			track: (eventName: string, payload?: Record<string, unknown>) => void;
		};
	}
}

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
 * during manual testing. It is then dispatched to a real provider: an
 * installed `window.analytics` SDK if present, otherwise the backend
 * analytics endpoint when one is configured.
 */
export function trackWalletEvent(
	eventName: WalletEventName,
	payload: WalletEventPayload = {},
): void {
	if (process.env.NODE_ENV === "development") {
		// biome-ignore lint/suspicious/noConsole: allowed in dev
		console.log(`[Analytics] ${eventName}`, payload);
	}

	if (typeof window === "undefined") return;

	// Prefer a client-side analytics SDK when one has been installed on the page.
	if (window.analytics?.track) {
		try {
			window.analytics.track(eventName, payload);
		} catch {
			// Analytics delivery must never break the UI.
		}
		return;
	}

	// Otherwise forward to the Mux backend analytics endpoint, when configured.
	// This runs in the browser, so it must never attach Mux credentials
	// (MUX_API_KEY/MUX_API_SECRET are server-only) — the endpoint accepts
	// unauthenticated event pings.
	const baseUrl = getApiBaseUrl();
	if (!baseUrl) return;

	fetch(`${baseUrl}/analytics/events`, {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
		},
		body: JSON.stringify({
			event: eventName,
			source: "wallet",
			properties: payload,
			timestamp: Date.now(),
		}),
		keepalive: true,
	}).catch(() => {
		// Analytics delivery failures must never surface to the user.
	});
}
