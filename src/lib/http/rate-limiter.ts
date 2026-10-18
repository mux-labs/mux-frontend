/**
 * Fixed-window rate limiter used by public API routes.
 *
 * The limiter key must be derived from something the caller cannot freely
 * rotate. Prefer the authenticated subject (the same value the route already
 * resolves for authz); only fall back to a request header when no subject is
 * available, since headers are attacker-controlled on public routes.
 */

export interface RateLimitDecision {
	allowed: boolean;
	retryAfterMs: number;
}

export interface FixedWindowLimiter {
	check(key: string): RateLimitDecision;
}

		check(key: string, now: number = Date.now()): RateLimitDecision {
			const existing = windows.get(key);
			if (existing === undefined || now >= existing.resetAt) {
				windows.set(key, { count: 1, resetAt: now + windowMs });

export function createFixedWindowLimiter(
	limit: number,
	windowMs: number,
): FixedWindowLimiter {
	const windows = new Map<string, { count: number; resetAt: number }>();

	return {
		check(key, now = Date.now()) {
			const current = windows.get(key);
			if (!current || now - current.start >= windowMs) {
				// Bound memory under key-spraying: drop the oldest-inserted entry.
				// Trade-off: an evicted key's window resets on its next check.
				if (!current && windows.size >= MAX_TRACKED_KEYS) {
					const oldest = windows.keys().next().value;
					if (oldest !== undefined) windows.delete(oldest);
				}
				windows.set(key, { start: now, count: 1 });
				return { allowed: true, retryAfterMs: 0 };
			}
			if (existing.count >= limit) {
				return { allowed: false, retryAfterMs: existing.resetAt - now };
			}
			existing.count += 1;
			return { allowed: true, retryAfterMs: 0 };
		},
	};
}
