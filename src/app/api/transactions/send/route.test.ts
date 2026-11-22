import { describe, expect, it } from "vitest";
import { createFixedWindowLimiter } from "@/lib/http/rate-limiter";
import { maintenanceRetryAfterSeconds } from "./route";

function maintenanceUpstream(retryAfter?: string): Response {
	const headers = new Headers();
	if (retryAfter !== undefined) headers.set("retry-after", retryAfter);
	return new Response(null, { status: 503, headers });
}

describe("maintenanceRetryAfterSeconds", () => {
	it("clamps waits over an hour to 3600 seconds", () => {
		expect(maintenanceRetryAfterSeconds(maintenanceUpstream("86400"), 0)).toBe(
			"3600",
		);
		expect(maintenanceRetryAfterSeconds(maintenanceUpstream("3601"), 0)).toBe(
			"3600",
		);
	});

	it("keeps waits within the hour unchanged", () => {
		expect(maintenanceRetryAfterSeconds(maintenanceUpstream("3600"), 0)).toBe(
			"3600",
		);
		expect(maintenanceRetryAfterSeconds(maintenanceUpstream("120"), 0)).toBe(
			"120",
		);
	});

	it("falls back to the resolved delay when retry-after is missing or invalid", () => {
		expect(maintenanceRetryAfterSeconds(maintenanceUpstream(), 90_000)).toBe(
			"90",
		);
		expect(
			maintenanceRetryAfterSeconds(maintenanceUpstream("soon"), 90_000),
		).toBe("90");
	});

	it("clamps the fallback delay to an hour as well", () => {
		expect(
			maintenanceRetryAfterSeconds(maintenanceUpstream(), 7_200_000),
		).toBe("3600");
	});

	it("never returns less than one second", () => {
		expect(maintenanceRetryAfterSeconds(maintenanceUpstream("0"), 0)).toBe("1");
		expect(maintenanceRetryAfterSeconds(maintenanceUpstream(), 0)).toBe("1");
	});
});

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
