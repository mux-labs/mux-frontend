import { describe, expect, it } from "vitest";
import { callerKey, createFixedWindowLimiter } from "./rate-limiter";

// Mirrors MAX_TRACKED_KEYS in rate-limiter.ts. The cap is not exported, so we
// assert the bound via behaviour: spraying this many distinct keys must never
// grow the tracked-window map past the cap.
const MAX_TRACKED_KEYS = 10_000;

function makeRequest(headers: Record<string, string> = {}): Request {
	return new Request("https://example.test/api", { headers });
}

describe("createFixedWindowLimiter", () => {
	it("allows up to `limit` requests then denies with a positive retryAfterMs", () => {
		const limiter = createFixedWindowLimiter(3, 1_000);
		const now = 1_000;

		for (let i = 0; i < 3; i += 1) {
			const result = limiter.check("caller", now);
			expect(result.allowed).toBe(true);
		}

		const denied = limiter.check("caller", now);
		expect(denied.allowed).toBe(false);
		expect(denied.retryAfterMs).toBeGreaterThan(0);
	});

	it("allows again after windowMs elapses", () => {
		const limiter = createFixedWindowLimiter(2, 1_000);
		const start = 5_000;

		expect(limiter.check("caller", start).allowed).toBe(true);
		expect(limiter.check("caller", start).allowed).toBe(true);
		expect(limiter.check("caller", start).allowed).toBe(false);

		// Still inside the window: denied.
		expect(limiter.check("caller", start + 999).allowed).toBe(false);

		// Window has elapsed: fresh window, allowed again.
		expect(limiter.check("caller", start + 1_000).allowed).toBe(true);
	});

	it("tracks independent windows per key", () => {
		const limiter = createFixedWindowLimiter(1, 1_000);
		const now = 0;

		expect(limiter.check("a", now).allowed).toBe(true);
		expect(limiter.check("a", now).allowed).toBe(false);
		expect(limiter.check("b", now).allowed).toBe(true);
	});

	it("never exceeds MAX_TRACKED_KEYS under key spraying", () => {
		const limiter = createFixedWindowLimiter(1, 60_000);
		const now = 0;

		for (let i = 0; i < MAX_TRACKED_KEYS; i += 1) {
			expect(limiter.check(`spray-${i}`, now).allowed).toBe(true);
		}

		// A brand-new key arriving at capacity is still allowed and does not
		// grow the map past the cap (eviction keeps the bound).
		const overflow = limiter.check("spray-overflow", now);
		expect(overflow.allowed).toBe(true);

		// The map is bounded: re-checking an early key that was evicted starts a
		// fresh window rather than being denied, proving the cap was enforced.
		const evicted = limiter.check("spray-0", now);
		expect(evicted.allowed).toBe(true);
	});

	it("resets an evicted key's window (documented trade-off)", () => {
		const limiter = createFixedWindowLimiter(1, 60_000);
		const now = 0;

		// Exhaust the first key's window.
		expect(limiter.check("victim", now).allowed).toBe(true);
		expect(limiter.check("victim", now).allowed).toBe(false);

		// Spray enough distinct keys to force eviction of the oldest entry.
		for (let i = 0; i < MAX_TRACKED_KEYS; i += 1) {
			limiter.check(`spray-${i}`, now);
		}

		// The victim's window was evicted, so its next check starts fresh.
		expect(limiter.check("victim", now).allowed).toBe(true);
	});

	it("reset() clears all windows", () => {
		const limiter = createFixedWindowLimiter(1, 60_000);
		const now = 0;

		expect(limiter.check("caller", now).allowed).toBe(true);
		expect(limiter.check("caller", now).allowed).toBe(false);

		limiter.reset();

		expect(limiter.check("caller", now).allowed).toBe(true);
	});
});

describe("callerKey", () => {
	it("prefers the first x-forwarded-for hop", () => {
		const request = makeRequest({
			"x-forwarded-for": "203.0.113.7, 10.0.0.1",
		});
		expect(callerKey(request)).toBe("203.0.113.7");
	});

	it("falls back to x-real-ip", () => {
		const request = makeRequest({ "x-real-ip": "198.51.100.4" });
		expect(callerKey(request)).toBe("198.51.100.4");
	});

	it("returns a stable fallback when no client IP header is present", () => {
		const request = makeRequest();
		expect(callerKey(request)).toBe(callerKey(makeRequest()));
	});
});
