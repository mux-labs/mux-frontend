/**
 * Auth & session analytics tracking.
 *
 * Provides event tracking for authentication flows (login, logout, session
 * expiry, etc.). Events are forwarded to `window.analytics.track` (Segment,
 * PostHog, Amplitude, ...) when the SDK is present, and additionally logged
 * to the console in development for local verification.
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
 * In development, logs to console for verification during testing. Always
 * forwards the event to `window.analytics.track` when the SDK is present
 * (e.g. loaded via a script tag), which is a no-op in environments where it
 * hasn't been injected (tests, demo mode, etc).
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

	if (typeof window !== "undefined") {
		window.analytics?.track(eventName, {
			...payload,
			category: "auth",
			timestamp: Date.now(),
		});
	}
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
