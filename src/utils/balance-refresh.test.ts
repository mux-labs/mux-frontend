import { describe, expect, it, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import {
	BALANCE_REFRESH_FAILED,
	balanceReducer,
	initialBalanceState,
	useBalanceRefresh,
	type BalanceAction,
	type BalanceState,
} from "./balance-refresh";

const start = (requestId: number): BalanceAction => ({ type: "start", requestId });
const success = (requestId: number, balance: number): BalanceAction => ({
	type: "success",
	requestId,
	balance,
});
const failure = (requestId: number): BalanceAction => ({ type: "failure", requestId });

const reduce = (actions: BalanceAction[], from: BalanceState = initialBalanceState) =>
	actions.reduce(balanceReducer, from);

describe("balanceReducer", () => {
	it("drops a stale success whose requestId does not match the current request", () => {
		const state = reduce([start(1), start(2), success(1, 999)]);

		expect(state.balance).toBe(initialBalanceState.balance);
		expect(state.refreshing).toBe(true);
	});

	it("applies a success for the current requestId", () => {
		const state = reduce([start(1), success(1, 250)]);

		expect(state.balance).toBe(250);
		expect(state.refreshing).toBe(false);
		expect(state.error).toBeNull();
	});

	it("keeps the last known balance when the current request fails", () => {
		const loaded = reduce([start(1), success(1, 250)]);
		const state = reduce([start(2), failure(2)], loaded);

		expect(state.balance).toBe(250);
		expect(state.refreshing).toBe(false);
		expect(state.error).toBe("BALANCE_REFRESH_FAILED");
	});

	it("returns the state unchanged for a stale failure", () => {
		const loaded = reduce([start(1), success(1, 250)]);
		const state = reduce([start(2), failure(1)], loaded);

		expect(state).toBe(loaded);
	});

	it("preserves the last stable state so a stale failure is a true no-op", () => {
		const loaded = reduce([start(1), success(1, 250)]);
		const refreshing = reduce([start(2)], loaded);

		expect(refreshing.lastStable).toBe(loaded);

		const state = reduce([failure(1)], refreshing);

		expect(state).toBe(loaded);
		expect(state.balance).toBe(250);
		expect(state.refreshing).toBe(false);
		expect(state.error).toBeNull();
		expect(state.requestId).toBe(1);
	});

	it("keeps the original last stable state across overlapping refreshes", () => {
		const loaded = reduce([start(1), success(1, 250)]);
		const state = reduce([start(2), start(3), failure(2)], loaded);

		expect(state).toBe(loaded);
		expect(state.balance).toBe(250);
		expect(state.refreshing).toBe(false);
	});
});

describe("useBalanceRefresh", () => {
	it("fetches exactly once on mount with a stable callback", async () => {
		const fetchBalance = vi.fn().mockResolvedValue(100);

		const { result } = renderHook(() => useBalanceRefresh(fetchBalance));

		await act(async () => {});

		expect(fetchBalance).toHaveBeenCalledTimes(1);
		expect(result.current.balance).toBe(100);
	});

	it("does not refetch on re-render with a new inline callback identity", async () => {
		const fetchBalance = vi.fn().mockResolvedValue(100);

		const { rerender } = renderHook(() => useBalanceRefresh(() => fetchBalance()));

		await act(async () => {});
		expect(fetchBalance).toHaveBeenCalledTimes(1);

		rerender();
		await act(async () => {});

		expect(fetchBalance).toHaveBeenCalledTimes(1);
	});

	it("triggers exactly one additional fetch when refresh is called", async () => {
		const fetchBalance = vi.fn().mockResolvedValue(100);

		const { result } = renderHook(() => useBalanceRefresh(fetchBalance));

		await act(async () => {});
		expect(fetchBalance).toHaveBeenCalledTimes(1);

		await act(async () => {
			await result.current.refresh();
		});

		expect(fetchBalance).toHaveBeenCalledTimes(2);
	});

	it("keeps the last known balance visible while a refresh is in flight", async () => {
		let resolveRefresh: (value: number) => void = () => {};
		const fetchBalance = vi
			.fn()
			.mockResolvedValueOnce(100)
			.mockImplementationOnce(
				() =>
					new Promise<number>((resolve) => {
						resolveRefresh = resolve;
					}),
			);

		const { result } = renderHook(() => useBalanceRefresh(fetchBalance));

		await act(async () => {});
		expect(result.current.balance).toBe(100);

		let pending: Promise<void> = Promise.resolve();
		act(() => {
			pending = result.current.refresh();
		});

		// Stale-while-revalidate: the old balance stays on screen, no flicker.
		expect(result.current.refreshing).toBe(true);
		expect(result.current.balance).toBe(100);

		await act(async () => {
			resolveRefresh(250);
			await pending;
		});

		expect(result.current.refreshing).toBe(false);
		expect(result.current.balance).toBe(250);
		expect(result.current.error).toBeNull();
	});

	it("keeps the last known balance and surfaces the error when a refresh fails", async () => {
		const fetchBalance = vi
			.fn()
			.mockResolvedValueOnce(100)
			.mockRejectedValueOnce(new Error("network down"));

		const { result } = renderHook(() => useBalanceRefresh(fetchBalance));

		await act(async () => {});
		expect(result.current.balance).toBe(100);

		await act(async () => {
			await result.current.refresh();
		});

		expect(fetchBalance).toHaveBeenCalledTimes(2);
		expect(result.current.balance).toBe(100);
		expect(result.current.refreshing).toBe(false);
		expect(result.current.error).toBe(BALANCE_REFRESH_FAILED);
	});

	it("drops an out-of-order response so an older request cannot overwrite a newer balance", async () => {
		let resolveFirst: (value: number) => void = () => {};
		let resolveSecond: (value: number) => void = () => {};
		const fetchBalance = vi
			.fn()
			.mockResolvedValueOnce(100)
			.mockImplementationOnce(
				() =>
					new Promise<number>((resolve) => {
						resolveFirst = resolve;
					}),
			)
			.mockImplementationOnce(
				() =>
					new Promise<number>((resolve) => {
						resolveSecond = resolve;
					}),
			);

		const { result } = renderHook(() => useBalanceRefresh(fetchBalance));

		await act(async () => {});
		expect(result.current.balance).toBe(100);

		let first: Promise<void> = Promise.resolve();
		let second: Promise<void> = Promise.resolve();
		act(() => {
			first = result.current.refresh();
		});
		act(() => {
			second = result.current.refresh();
		});

		await act(async () => {
			resolveSecond(300);
			await second;
		});
		expect(result.current.balance).toBe(300);

		await act(async () => {
			resolveFirst(999);
			await first;
		});

		expect(result.current.balance).toBe(300);
		expect(result.current.refreshing).toBe(false);
	});
});
