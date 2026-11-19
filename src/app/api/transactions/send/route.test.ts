import { describe, expect, it } from "vitest";
import { createFixedWindowLimiter } from "@/lib/http/rate-limiter";

describe("createFixedWindowLimiter", () => {
	it("allows up to the limit within the window and rejects beyond it", () => {
		const limiter = createFixedWindowLimiter(3, 60_000);
		expect(limiter.check("caller").allowed).toBe(true);
		expect(limiter.check("caller").allowed).toBe(true);
		expect(limiter.check("caller").allowed).toBe(true);
		const denied = limiter.check("caller");
		expect(denied.allowed).toBe(false);
		expect(denied.retryAfterMs).toBeGreaterThan(0);
	});

	it("tracks callers independently", () => {
		const limiter = createFixedWindowLimiter(1, 60_000);
		expect(limiter.check("a").allowed).toBe(true);
		expect(limiter.check("a").allowed).toBe(false);
		expect(limiter.check("b").allowed).toBe(true);
	});

	it("resets after the window elapses", () => {
		const limiter = createFixedWindowLimiter(1, 10);
		expect(limiter.check("caller").allowed).toBe(true);
		expect(limiter.check("caller").allowed).toBe(false);
		const start = Date.now();
		while (Date.now() - start < 15) {
			// busy-wait past the fixed window
		}
		expect(limiter.check("caller").allowed).toBe(true);
	});
});
