export type AnalyticsConsent = "granted" | "denied" | "unknown";

export const ANALYTICS_CONSENT_KEY = "mux.analytics-consent";

export function getAnalyticsConsent(): AnalyticsConsent {
	if (typeof window === "undefined") return "unknown";
	try {
		const value = window.localStorage.getItem(ANALYTICS_CONSENT_KEY);
		return value === "granted" || value === "denied" ? value : "unknown";
	} catch {
		return "unknown";
	}
}

export function setAnalyticsConsent(
	consent: Exclude<AnalyticsConsent, "unknown">,
): void {
	if (typeof window === "undefined") return;
	try {
		window.localStorage.setItem(ANALYTICS_CONSENT_KEY, consent);
	} catch {
		// storage unavailable; consent stays unknown (fail closed)
	}
}

/** Third-party analytics may only load after explicit opt-in. */
export function canLoadThirdPartyAnalytics(): boolean {
	return getAnalyticsConsent() === "granted";
}
