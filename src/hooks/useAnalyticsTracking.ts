"use client";

import { useCallback, useEffect, useRef } from "react";

export interface TrackEventPayload {
	/** Logical event name, e.g. "date_range_changed" */
	event: string;
	/** Optional key-value metadata attached to the event */
	properties?: Record<string, unknown>;
}

/**
 * Stub analytics tracking hook.
 *
 * Fires a page-view on mount and exposes a `track` function for custom events.
 * All events are logged to the console in development and can be swapped for a
 * real analytics provider (e.g. Segment, PostHog) by replacing the `dispatch`
 * call below.
 *
 * @param pageName - Identifies the page/screen for the automatic page-view event.
 */
export function useAnalyticsTracking(pageName: string) {
	const pageNameRef = useRef(pageName);
	pageNameRef.current = pageName;

	/** Central dispatch — replace with your real analytics SDK call. */
	const dispatch = useCallback((payload: TrackEventPayload) => {
		if (process.env.NODE_ENV !== "production") {
			// eslint-disable-next-line no-console
			console.debug("[analytics]", payload.event, payload.properties ?? {});
		}
		// TODO: window.analytics?.track(payload.event, payload.properties);
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
