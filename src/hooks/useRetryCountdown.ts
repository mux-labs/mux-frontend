"use client";

import { useEffect, useState } from "react";

export interface RetryCountdown {
	remainingMs: number;
	ready: boolean;
}

/**
 * Ticks down to `retryAt` (epoch ms). Remaining time is recomputed from the
 * wall clock on every tick rather than decremented, so throttled background
 * tabs never enable a retry early or leave it stuck disabled.
 */
export function useRetryCountdown(
	retryAt: number | null,
	now: () => number = Date.now,
): RetryCountdown {
	const initialNowMs = retryAt !== null && now() >= retryAt ? now() : now();
	const [nowMs, setNowMs] = useState(initialNowMs);

	useEffect(() => {
		if (retryAt === null) return;
		// Already elapsed (e.g. a cached 429 whose Retry-After has already
		// passed): reflect that immediately and never start a timer.
		if (now() >= retryAt) {
			return;
		}
		const tick = () => {
			const current = now();
			setNowMs(current);
			if (current >= retryAt) clearInterval(timer);
		};
		const timer = setInterval(tick, 250);
		return () => clearInterval(timer);
	}, [retryAt, now]);

	const remainingMs = retryAt === null ? 0 : Math.max(0, retryAt - nowMs);
	return { remainingMs, ready: remainingMs === 0 };
}