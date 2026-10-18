import { describe, expect, it } from "vitest";
import {
	balanceReducer,
	initialBalanceState,
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
