import { createHash } from "node:crypto";
import { credentialFingerprintSource } from "./credentials";

/**
 * Minimal in-process fixed-window rate limiter for Next.js API routes.
 *
 * This is a per-instance griefing guard, not the source of truth: the Mux
 * backend enforces the authoritative limits. Callers are keyed by a hash of
 * their credential (never the raw token) plus client IP, so neither value is
 * retained in memory in a recoverable form.
 */

export interface RateLimitDecision {
	allowed: boolean;
	retryAfterMs: number;
}

export interface FixedWindowLimiter {
	check(key: string, now?: number): RateLimitDecision;
	reset(): void;
}

const MAX_TRACKED_KEYS = 10_000;

export function createFixedWindowLimiter(
	limit: number,
	windowMs: number,
): FixedWindowLimiter {
	const windows = new Map<string, { start: number; count: number }>();

	return {
		check(key, now = Date.now()) {
			const current = windows.get(key);
			if (!current || now - current.start >= windowMs) {
				// Bound memory under key-spraying: drop the oldest entry.
				if (!current && windows.size >= MAX_TRACKED_KEYS) {
					const oldest = windows.keys().next().value;
					if (oldest !== undefined) windows.delete(oldest);
				}
				windows.set(key, { start: now, count: 1 });
				return { allowed: true, retryAfterMs: 0 };
			}
			if (current.count >= limit) {
				return {
					allowed: false,
					retryAfterMs: current.start + windowMs - now,
				};
			}
			current.count += 1;
			return { allowed: true, retryAfterMs: 0 };
		},
		reset() {
			windows.clear();
		},
	};
}

/** Stable, non-reversible limiter key for a request's caller. */
export function callerKey(request: Request): string {
	const credential = credentialFingerprintSource(request);
	const ip =
		request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
		request.headers.get("x-real-ip") ??
		"unknown";
	return createHash("sha256").update(`${credential}\u0000${ip}`).digest("hex");
}
