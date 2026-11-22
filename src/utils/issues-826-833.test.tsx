import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { contrastRatio, NETWORK_BADGE_STYLES } from "@/components/NetworkBadge";
import { useInFlightAction } from "./in-flight-action";
import { validateLimits } from "./limits-validation";
import { createTodayUsageRefresher } from "./today-usage-refresh";

describe("todayUsage refresher (#833)", () => {
	it("shares a single in-flight fetch across concurrent callers", async () => {
		const fetcher = vi
			.fn()
			.mockResolvedValue({ spent: 1, limit: 10, asOf: "t" });
		const r = createTodayUsageRefresher({ fetcher });
		await Promise.all([r.get("w"), r.get("w"), r.get("w")]);
		expect(fetcher).toHaveBeenCalledTimes(1);
		await r.get("w");
		expect(fetcher).toHaveBeenCalledTimes(1);
	});

	it("fails closed and rate-limits retries after an error", async () => {
		let t = 0;
		const fetcher = vi.fn().mockRejectedValue(new Error("rpc down"));
		const r = createTodayUsageRefresher({ fetcher, now: () => t });
		await expect(r.get("w")).rejects.toMatchObject({
			code: "USAGE_DEPENDENCY_UNAVAILABLE",
		});
		await expect(r.get("w")).rejects.toMatchObject({
			code: "USAGE_RATE_LIMITED",
		});
		t = 10_000;
		await expect(r.get("w")).rejects.toMatchObject({
			code: "USAGE_DEPENDENCY_UNAVAILABLE",
		});
		expect(fetcher).toHaveBeenCalledTimes(2);
	});
});

describe("validateLimits (#832)", () => {
	it("accepts valid limits", () => {
		expect(
			validateLimits({ perTransaction: "5", daily: "10", monthly: "100" }).ok,
		).toBe(true);
	});

	it("rejects bad input with stable codes", () => {
		const { ok, errors } = validateLimits({
			perTransaction: "20",
			daily: "10",
			monthly: "1.12345678",
			extra: "1",
		});
		expect(ok).toBe(false);
		expect(errors).toMatchObject({
			_form: "LIMIT_UNKNOWN_KEY",
			perTransaction: "LIMIT_PER_TX_EXCEEDS_DAILY",
			monthly: "LIMIT_TOO_PRECISE",
		});
		expect(
			validateLimits({ perTransaction: "-1", daily: "abc", monthly: "" })
				.errors,
		).toEqual({
			perTransaction: "LIMIT_NEGATIVE",
			daily: "LIMIT_NOT_NUMERIC",
			monthly: "LIMIT_REQUIRED",
		});
	});
});

describe("useInFlightAction (#828)", () => {
	it("ignores repeat invocations while pending", async () => {
		let resolve!: () => void;
		const action = vi.fn(
			() =>
				new Promise<void>((r) => {
					resolve = r;
				}),
		);
		const { result } = renderHook(() => useInFlightAction(action));
		let first!: Promise<unknown>;
		act(() => {
			first = result.current.run();
		});
		expect(result.current.ctaProps.disabled).toBe(true);
		await act(async () => {
			await result.current.run();
		});
		expect(action).toHaveBeenCalledTimes(1);
		await act(async () => {
			resolve();
			await first;
		});
		expect(result.current.pending).toBe(false);
	});

	it("exposes pending and ignores repeat clicks, including the failure path", async () => {
		let reject!: (err: Error) => void;
		const action = vi.fn(
			() =>
				new Promise<void>((_r, rj) => {
					reject = rj;
				}),
		);
		const { result } = renderHook(() => useInFlightAction(action));
		expect(result.current.pending).toBe(false);
		expect(result.current.ctaProps).toEqual({
			disabled: false,
			"aria-busy": false,
		});

		let first!: Promise<unknown>;
		act(() => {
			first = result.current.run();
		});
		expect(result.current.pending).toBe(true);
		expect(result.current.ctaProps).toEqual({
			disabled: true,
			"aria-busy": true,
		});

		// Repeated clicks while pending are ignored and resolve to undefined.
		await act(async () => {
			await expect(result.current.run()).resolves.toBeUndefined();
		});
		expect(action).toHaveBeenCalledTimes(1);

		// Failure path: the error propagates and pending is cleared.
		await act(async () => {
			reject(new Error("boom"));
			await expect(first).rejects.toThrow("boom");
		});
		expect(result.current.pending).toBe(false);
		expect(result.current.ctaProps.disabled).toBe(false);

		// The guard is released, so a later click runs the action again.
		await act(async () => {
			await expect(result.current.run()).resolves.toBeUndefined();
		});
		expect(action).toHaveBeenCalledTimes(2);
	});
});

describe("NetworkBadge contrast (#826)", () => {
	it("meets WCAG AA 4.5:1 for every network", () => {
		for (const { bg, fg } of Object.values(NETWORK_BADGE_STYLES)) {
			expect(contrastRatio(bg, fg)).toBeGreaterThanOrEqual(4.5);
		}
	});
});
