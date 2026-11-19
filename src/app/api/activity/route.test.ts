import { describe, expect, it } from "vitest";
import { createFixedWindowLimiter } from "@/lib/http/rate-limiter";

/**
 * Regression tests for the fixed-window limiter used by the activity route
 * (issue #1117). The route relies on `createFixedWindowLimiter(limit, windowMs)`
 * to fail closed: once the window budget is exhausted, further calls must be
 * denied with a positive retry delay, and the budget must reset after the
 * window elapses.
 */
describe("createFixedWindowLimiter", () => {
	it("allows calls up to the limit and denies the next one (fail closed)", () => {
		const limiter = createFixedWindowLimiter(3, 60_000);

		for (let i = 0; i < 3; i += 1) {
			const decision = limiter.check("caller-a");
			expect(decision.allowed).toBe(true);
		}

		const denied = limiter.check("caller-a");
		expect(denied.allowed).toBe(false);
		expect(denied.retryAfterMs).toBeGreaterThan(0);
	});

	it("tracks each caller independently", () => {
		const limiter = createFixedWindowLimiter(1, 60_000);

		expect(limiter.check("caller-a").allowed).toBe(true);
		expect(limiter.check("caller-a").allowed).toBe(false);
		expect(limiter.check("caller-b").allowed).toBe(true);
	});

	it("resets the budget once the window elapses", () => {
		const limiter = createFixedWindowLimiter(1, 10);

		expect(limiter.check("caller-a").allowed).toBe(true);
		expect(limiter.check("caller-a").allowed).toBe(false);

		const start = Date.now();
		while (Date.now() - start < 15) {
			// Busy-wait past the fixed window so the next check starts fresh.
		}

		expect(limiter.check("caller-a").allowed).toBe(true);
	});
});
