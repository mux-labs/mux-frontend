/**
 * Global ambient type declarations.
 *
 * Declares the shape of the third-party analytics SDK (e.g. Segment,
 * PostHog, Amplitude) that is expected to be attached to `window` by an
 * external script tag. Analytics services across the app call
 * `window.analytics?.track(...)` defensively since the SDK may not be
 * loaded (e.g. in demo mode, tests, or before the script tag resolves).
 */
export {};

declare global {
	interface Window {
		analytics?: {
			track: (event: string, properties?: Record<string, unknown>) => void;
			page?: (name?: string, properties?: Record<string, unknown>) => void;
			identify?: (userId: string, traits?: Record<string, unknown>) => void;
		};
	}
}
