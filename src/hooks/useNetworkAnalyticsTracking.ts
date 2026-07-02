"use client";

import { useCallback, useEffect, useRef } from "react";
import {
	type NetworkEventName,
	type NetworkEventPayload,
	trackNetworkEvent,
} from "@/services/networkAnalyticsTracking";

/**
 * Stub analytics tracking hook for the Network & Stellar UX.
 *
 * Fires a `network_page_view` event on mount and exposes a `track` function
 * for custom network/Stellar events. All calls delegate to
 * {@link trackNetworkEvent} so the same dev-logging and production no-op
 * behaviour applies.
 *
 * @param network - The currently active network ("mainnet" | "testnet").
 *                  Attached automatically to every event as `{ network }`.
 */
export function useNetworkAnalyticsTracking(network?: string) {
	const networkRef = useRef(network);
	networkRef.current = network;

	useEffect(() => {
		trackNetworkEvent("network_page_view", { network: networkRef.current });
	}, []);

	const track = useCallback(
		(eventName: NetworkEventName, payload?: NetworkEventPayload) => {
			trackNetworkEvent(eventName, { network: networkRef.current, ...payload });
		},
		[],
	);

	return { track };
}
