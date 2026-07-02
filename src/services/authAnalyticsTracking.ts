/**
 * Auth & session analytics tracking stub.
 *
 * Provides event tracking for authentication flows (login, logout, session
 * expiry, etc.). This stub logs to console in development and can be swapped
 * for a real analytics provider (Segment, PostHog, Amplitude) without
 * changing call sites throughout the auth components.
 *
 * Usage:
 *   import { trackAuthEvent } from "@/services/authAnalyticsTracking";
 *   trackAuthEvent("login_success", { email: user.email });
 */

// ---------------------------------------------------------------------------
// Event names
// ---------------------------------------------------------------------------

export type AuthEventName =
	| "login_page_view"
	| "login_attempt"
	| "login_success"
	| "login_failed"
	| "login_validation_failed"
	| "logout"
	| "session_expired"
	| "session_rehydrated"
	| "password_reset_request"
	| "password_reset_complete";

// ---------------------------------------------------------------------------
// Payload type
// ---------------------------------------------------------------------------

export type AuthEventPayload = Record<string, unknown>;

// ---------------------------------------------------------------------------
// Stub track function
// ---------------------------------------------------------------------------

/**
 * Record an authentication-related analytics event.
 *
 * In development, logs to console for verification during testing. In
 * production this becomes a no-op until wired to a real analytics provider.
 *
 * @param eventName - The auth event identifier
 * @param payload - Optional metadata attached to the event
 */
export function trackAuthEvent(
	eventName: AuthEventName,
	payload: AuthEventPayload = {},
): void {
	if (process.env.NODE_ENV === "development") {
		// biome-ignore lint/suspicious/noConsoleLog: allowed in dev for analytics verification
		console.log(`[Auth Analytics] ${eventName}`, payload);
	}

	// TODO: Replace with real analytics provider integration:
	//   if (typeof window !== "undefined" && window.analytics) {
	//     window.analytics.track(eventName, {
	//       ...payload,
	//       category: "auth",
	//       timestamp: Date.now(),
	//     });
	//   }
}

// ---------------------------------------------------------------------------
// Convenience helpers (optional)
// ---------------------------------------------------------------------------

/**
 * Track successful user login.
 */
export function trackLogin(email: string, role: string) {
	trackAuthEvent("login_success", { email, role });
}

/**
 * Track user logout.
 */
export function trackLogout(email?: string) {
	trackAuthEvent("logout", email ? { email } : {});
}

/**
 * Track session expiry event.
 */
export function trackSessionExpired() {
	trackAuthEvent("session_expired", {});
}
