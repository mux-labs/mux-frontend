import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useRetryCountdown } from "./useRetryCountdown";

const START = Date.UTC(2026, 8, 27, 12, 0, 0);
const TICK_MS = 250;

// Injected wall clock. Real time never advances in these tests; the clock only
// moves when a test sets it, so fake-timer ticks and wall-clock time are
// fully decoupled (exactly what a throttled background tab looks like).
let clockMs = START;
const now = () => clockMs;

function tick(ms = TICK_MS) {
	act(() => {
		vi.advanceTimersByTime(ms);
	});
}

beforeEach(() => {
	clockMs = START;
	// Only fake the interval APIs so vi.getTimerCount() counts the hook's
	// interval and nothing else.
	vi.useFakeTimers({ toFake: ["setInterval", "clearInterval"] });
});

afterEach(() => {
	cleanup();
	vi.useRealTimers();
});

describe("useRetryCountdown", () => {
	it("is not ready while remainingMs > 0", () => {
		const { result } = renderHook(() => useRetryCountdown(START + 1_000, now));

		expect(result.current).toEqual({ remainingMs: 1_000, ready: false });

		clockMs = START + 600;
		tick();
		expect(result.current).toEqual({ remainingMs: 400, ready: false });

		clockMs = START + 999;
		tick();
		expect(result.current).toEqual({ remainingMs: 1, ready: false });
	});

	it("flips ready on the first tick after the injected clock reaches retryAt", () => {
		const { result } = renderHook(() => useRetryCountdown(START + 1_000, now));

		clockMs = START + 1_000;
		// Not recomputed until the next tick fires.
		expect(result.current.ready).toBe(false);

		tick();
		expect(result.current).toEqual({ remainingMs: 0, ready: true });
	});

	it("recomputes from the wall clock rather than decrementing per tick", () => {
		const { result } = renderHook(() => useRetryCountdown(START + 1_000, now));

		// Far more tick time than the countdown length elapses, but the wall
		// clock has not moved: a decrementing implementation would enable early.
		tick(10_000);
		expect(result.current).toEqual({ remainingMs: 1_000, ready: false });
	});

	it("is ready on the next tick after a large wall-clock jump (throttled tab)", () => {
		const { result } = renderHook(() =>
			useRetryCountdown(START + 60_000, now),
		);

		tick();
		expect(result.current).toEqual({ remainingMs: 60_000, ready: false });

		// The tab was throttled: ten minutes of wall-clock time pass while only
		// one interval callback gets to run.
		clockMs = START + 10 * 60_000;
		tick();
		expect(result.current).toEqual({ remainingMs: 0, ready: true });
	});

	it("never enables early when the wall clock lags behind the tick count", () => {
		const { result } = renderHook(() => useRetryCountdown(START + 1_000, now));

		// Many ticks fire while the wall clock barely moves (a throttled tab
		// whose timers are coalesced): a per-tick decrement would reach zero.
		for (let i = 0; i < 20; i += 1) {
			clockMs = START + 10 * (i + 1);
			tick();
		}

		expect(result.current).toEqual({ remainingMs: 800, ready: false });
	});

	it("does not leave retry stuck disabled when the clock jumps past retryAt", () => {
		const { result } = renderHook(() => useRetryCountdown(START + 1_000, now));

		// The tab was suspended: the clock jumps far past retryAt while the
		// interval callback runs only once.
		clockMs = START + 5 * 60_000;
		tick();

		expect(result.current).toEqual({ remainingMs: 0, ready: true });
		expect(vi.getTimerCount()).toBe(0);
	});

	it("clears the interval once the clock passes retryAt", () => {
		const { result } = renderHook(() => useRetryCountdown(START + 500, now));
		expect(vi.getTimerCount()).toBe(1);

		clockMs = START + 500;
		tick();

		expect(result.current.ready).toBe(true);
		expect(vi.getTimerCount()).toBe(0);
	});

	it("returns { remainingMs: 0, ready: true } and starts no interval when retryAt is null", () => {
		const { result } = renderHook(() => useRetryCountdown(null, now));

		expect(result.current).toEqual({ remainingMs: 0, ready: true });
		expect(vi.getTimerCount()).toBe(0);

		tick(5_000);
		expect(result.current).toEqual({ remainingMs: 0, ready: true });
		expect(vi.getTimerCount()).toBe(0);
	});

	it("clears the interval on unmount", () => {
		const { unmount } = renderHook(() =>
			useRetryCountdown(START + 60_000, now),
		);
		expect(vi.getTimerCount()).toBe(1);

		unmount();

		expect(vi.getTimerCount()).toBe(0);
	});

	it("does not schedule an interval when retryAt is already in the past", () => {
		clockMs = START + 1_000;
		renderHook(() => useRetryCountdown(START + 500, now));

		expect(vi.getTimerCount()).toBe(0);
	});

	it("reports ready immediately when retryAt is already in the past", () => {
		clockMs = START + 1_000;
		const { result } = renderHook(() => useRetryCountdown(START + 500, now));

		expect(result.current.ready).toBe(true);
		expect(result.current.remainingMs).toBe(0);
	});

	it("clears the outstanding interval when retryAt transitions to null", () => {
		const { result, rerender } = renderHook(
			({ retryAt }: { retryAt: number | null }) =>
				useRetryCountdown(retryAt, now),
			{ initialProps: { retryAt: START + 1_000 } },
		);

		expect(vi.getTimerCount()).toBe(1);

		rerender({ retryAt: null });

		expect(vi.getTimerCount()).toBe(0);
		expect(result.current.ready).toBe(true);
		expect(result.current.remainingMs).toBe(0);
	});
});
