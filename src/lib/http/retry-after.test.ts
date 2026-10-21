import { describe, expect, it, vi } from "vitest";
import {
	classifyRateLimit,
	DEFAULT_RETRY_AFTER_MS,
	fetchWithRetryAfter,
	formatRetryAfterSeconds,
	formatRetryCountdown,
	MAX_RETRY_AFTER_MS,
	MIN_RETRY_AFTER_MS,
	parseRetryAfter,
	resolveRetryDelayMs,
} from "./retry-after";

const NOW = Date.UTC(2026, 8, 27, 12, 0, 0);

function rateLimited(retryAfter?: string, correlationId?: string): Response {
	const headers = new Headers();
	if (retryAfter !== undefined) headers.set("retry-after", retryAfter);
	if (correlationId !== undefined)
		headers.set("x-correlation-id", correlationId);
	return new Response(null, { status: 429, headers });
}

describe("parseRetryAfter", () => {
	it("parses delta-seconds", () => {
		expect(parseRetryAfter("12", NOW)).toBe(12_000);
		expect(parseRetryAfter(" 0 ", NOW)).toBe(0);
	});

	it("parses an HTTP-date relative to now", () => {
		const at = new Date(NOW + 45_000).toUTCString();
		expect(parseRetryAfter(at, NOW)).toBe(45_000);
	});

	it("treats a past HTTP-date as zero, not negative", () => {
		const at = new Date(NOW - 60_000).toUTCString();
		expect(parseRetryAfter(at, NOW)).toBe(0);
	});

	it.each([
		null,
		undefined,
		"",
		"-5",
		"1.5",
		"soon",
		"x".repeat(65),
	])("rejects malformed value %s", (value) => {
		expect(parseRetryAfter(value, NOW)).toBeNull();
	});

	it("does not overflow on an enormous delta", () => {
		const parsed = parseRetryAfter("9".repeat(40), NOW);
		expect(parsed).not.toBeNull();
		expect(Number.isFinite(parsed)).toBe(true);
	});
});

describe("resolveRetryDelayMs", () => {
	it("falls back to the default for missing/malformed headers (never 0)", () => {
		expect(resolveRetryDelayMs(null, NOW)).toBe(DEFAULT_RETRY_AFTER_MS);
		expect(resolveRetryDelayMs("garbage", NOW)).toBe(DEFAULT_RETRY_AFTER_MS);
	});

	it("clamps to the floor and ceiling", () => {
		expect(resolveRetryDelayMs("0", NOW)).toBe(MIN_RETRY_AFTER_MS);
		expect(resolveRetryDelayMs("999999", NOW)).toBe(MAX_RETRY_AFTER_MS);
	});
});

describe("classifyRateLimit", () => {
	it("returns null for non-429 responses", () => {
		expect(
			classifyRateLimit(new Response(null, { status: 503 }), NOW),
		).toBeNull();
	});

	it("returns a typed state with retryAt and a safe correlation id", () => {
		const state = classifyRateLimit(rateLimited("5", "corr-123"), NOW);
		expect(state).toEqual({
			code: "RATE_LIMITED",
			retryAfterMs: 5_000,
			retryAt: NOW + 5_000,
			correlationId: "corr-123",
		});
	});

	it("drops unsafe correlation ids instead of rendering them", () => {
		const state = classifyRateLimit(
			rateLimited("5", "<script>alert(1)</script>"),
			NOW,
		);
		expect(state?.correlationId).toBeNull();
	});
});

describe("fetchWithRetryAfter", () => {
	const noSleep = vi.fn(async () => undefined);

	it("auto-retries an idempotent GET after a short wait", async () => {
		const fetchImpl = vi
			.fn<typeof fetch>()
			.mockResolvedValueOnce(rateLimited("2"))
			.mockResolvedValueOnce(new Response("ok", { status: 200 }));
		const onMetric = vi.fn();

		const result = await fetchWithRetryAfter(
			"/api/activity?cursor=secret-ish",
			{},
			{ fetchImpl, sleep: noSleep, now: () => NOW, onMetric },
		);

		expect(result.kind).toBe("response");
		expect(result.attempts).toBe(2);
		expect(noSleep).toHaveBeenCalledWith(2_000, undefined);
		// Metrics carry the pathname only — never the query string.
		expect(onMetric).toHaveBeenCalledWith(
			expect.objectContaining({ path: "/api/activity", autoRetried: true }),
		);
	});

	it("never auto-retries a write, even with a short wait", async () => {
		const fetchImpl = vi.fn<typeof fetch>().mockResolvedValue(rateLimited("1"));

		const result = await fetchWithRetryAfter(
			"/api/transactions/send",
			{ method: "POST", headers: { "idempotency-key": "k".repeat(20) } },
			{ fetchImpl, sleep: noSleep, now: () => NOW },
		);

		expect(fetchImpl).toHaveBeenCalledTimes(1);
		expect(result.kind).toBe("rate_limited");
	});

	it("surfaces long waits instead of blocking the UI", async () => {
		const fetchImpl = vi
			.fn<typeof fetch>()
			.mockResolvedValue(rateLimited("120"));

		const result = await fetchWithRetryAfter(
			"/api/activity",
			{},
			{
				fetchImpl,
				sleep: noSleep,
				now: () => NOW,
			},
		);

		expect(fetchImpl).toHaveBeenCalledTimes(1);
		expect(result.kind === "rate_limited" && result.rateLimit.retryAt).toBe(
			NOW + 120_000,
		);
	});

	it("stops after the attempt cap", async () => {
		const fetchImpl = vi.fn<typeof fetch>().mockResolvedValue(rateLimited("1"));

		const result = await fetchWithRetryAfter(
			"/api/activity",
			{},
			{
				fetchImpl,
				sleep: noSleep,
				now: () => NOW,
				maxAttempts: 99,
			},
		);

		expect(fetchImpl).toHaveBeenCalledTimes(3);
		expect(result.kind).toBe("rate_limited");
	});

	it("aborts the wait when the caller aborts", async () => {
		const fetchImpl = vi.fn<typeof fetch>().mockResolvedValue(rateLimited("5"));
		const controller = new AbortController();
		const pending = fetchWithRetryAfter(
			"/api/activity",
			{ signal: controller.signal },
			{ fetchImpl, now: () => NOW },
		);
		await Promise.resolve();
		controller.abort(new Error("cancelled"));

		await expect(pending).rejects.toThrow("cancelled");
		expect(fetchImpl).toHaveBeenCalledTimes(1);
	});
});

describe("formatRetryCountdown", () => {
	it.each([
		[0, "0s"],
		[-500, "0s"],
		[1_200, "2s"],
		[59_000, "59s"],
		[125_000, "2m 05s"],
	])("formats %i ms as %s", (ms, expected) => {
		expect(formatRetryCountdown(ms)).toBe(expected);
	});
});

/**
 * Boundary inputs from issue #999, each paired with the exact `retry-after`
 * header value it must produce. These reach the client as an HTTP header, so
 * the assertions below pin the observable 429 contract, not just internals.
 */
const BOUNDARY_INPUTS: Array<[delayMs: number, seconds: string]> = [
	[0, "1"],
	[1, "1"],
	[999, "1"],
	[1_000, "1"],
	[1_001, "2"],
	[60_000, "60"],
	[Number.MAX_SAFE_INTEGER, "9007199254741"],
	[-1, "1"],
];

describe.each(BOUNDARY_INPUTS)(
	"formatRetryAfterSeconds(%i)",
	(delayMs, expected) => {
		it("pins the delta-seconds header value", () => {
			expect(formatRetryAfterSeconds(delayMs)).toBe(expected);
		});

		it("is a positive integer, never 0 or a negative delta", () => {
			// `retry-after: 0` reads as "retry immediately" and invites the retry
			// storm the 429 contract exists to prevent.
			expect(formatRetryAfterSeconds(delayMs)).toMatch(/^[1-9]\d*$/);
		});

		it("is pure", () => {
			expect(formatRetryAfterSeconds(delayMs)).toBe(
				formatRetryAfterSeconds(delayMs),
			);
		});
	},
);

describe("formatRetryAfterSeconds", () => {
	it("never formats a zero or negative delay below 1 second", () => {
		for (const delayMs of [0, -1, -1_000, -Number.MAX_SAFE_INTEGER]) {
			const seconds = Number(formatRetryAfterSeconds(delayMs));
			expect(seconds).toBeGreaterThanOrEqual(1);
		}
	});

	it("rounds up rather than down", () => {
		expect(formatRetryAfterSeconds(1_000)).toBe("1");
		expect(formatRetryAfterSeconds(1_001)).toBe("2");
		expect(formatRetryAfterSeconds(1_500)).toBe("2");
		expect(formatRetryAfterSeconds(1_999)).toBe("2");
		expect(formatRetryAfterSeconds(60_000)).toBe("60");
	});

	it("falls back to the floor for non-finite input instead of emitting NaN", () => {
		expect(formatRetryAfterSeconds(Number.NaN)).toBe("1");
		expect(formatRetryAfterSeconds(Number.POSITIVE_INFINITY)).toBe("1");
		expect(formatRetryAfterSeconds(Number.NEGATIVE_INFINITY)).toBe("1");
	});

	it("round-trips every resolved header back to a usable delay", () => {
		for (const header of [
			null,
			undefined,
			"",
			"0",
			"1",
			"999",
			"60000",
			"9007199254740991",
			"-1",
			"garbage",
		]) {
			const seconds = Number(
				formatRetryAfterSeconds(resolveRetryDelayMs(header, NOW)),
			);
			expect(Number.isInteger(seconds)).toBe(true);
			expect(seconds).toBeGreaterThanOrEqual(1);
		}
	});
});

describe.each(BOUNDARY_INPUTS)("resolveRetryDelayMs(%i)", (delayMs) => {
	it("returns a finite delay inside the documented bounds", () => {
		const delay = resolveRetryDelayMs(String(delayMs), NOW);
		expect(Number.isFinite(delay)).toBe(true);
		expect(delay).toBeGreaterThanOrEqual(MIN_RETRY_AFTER_MS);
		expect(delay).toBeLessThanOrEqual(MAX_RETRY_AFTER_MS);
	});

	it("is pure", () => {
		expect(resolveRetryDelayMs(String(delayMs), NOW)).toBe(
			resolveRetryDelayMs(String(delayMs), NOW),
		);
	});
});
