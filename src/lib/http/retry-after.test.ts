import { describe, expect, it, vi } from "vitest";
import {
	classifyRateLimit,
	DEFAULT_RETRY_AFTER_MS,
	fetchWithRetryAfter,
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
