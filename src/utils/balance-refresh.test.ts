import { describe, expect, it, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import {
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
});
