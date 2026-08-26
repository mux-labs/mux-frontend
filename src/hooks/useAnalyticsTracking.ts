"use client";

import { useCallback, useEffect, useRef } from "react";

export interface TrackEventPayload {
	/** Logical event name, e.g. "date_range_changed" */
	event: string;
	/** Optional key-value metadata attached to the event */
	properties?: Record<string, unknown>;
}

/**
 * Analytics tracking hook.
 *
 * Fires a page-view on mount and exposes a `track` function for custom events.
 * Events are forwarded to `window.analytics.track` (Segment, PostHog, etc.)
 * when the SDK is present, and are additionally logged to the console outside
 * production for local/demo verification.
 *
 * @param pageName - Identifies the page/screen for the automatic page-view event.
 */
export function useAnalyticsTracking(pageName: string) {
	const pageNameRef = useRef(pageName);
	pageNameRef.current = pageName;

	/** Central dispatch — forwards to the analytics SDK when it's available. */
	const dispatch = useCallback((payload: TrackEventPayload) => {
		if (process.env.NODE_ENV !== "production") {
			// eslint-disable-next-line no-console
			console.debug("[analytics]", payload.event, payload.properties ?? {});
		}
		if (typeof window !== "undefined") {
			window.analytics?.track(payload.event, payload.properties);
		}
	}, []);

	// Automatic page-view on mount
	useEffect(() => {
		dispatch({ event: "page_view", properties: { page: pageNameRef.current } });
	}, [dispatch]);

	const track = useCallback(
		(event: string, properties?: Record<string, unknown>) => {
			dispatch({ event, properties });
		},
		[dispatch],
	);

	return { track };
}
