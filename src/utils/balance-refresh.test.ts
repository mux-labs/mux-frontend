import { describe, expect, it } from "vitest";
import { balanceReducer, initialBalanceState } from "./balance-refresh";

describe("balanceReducer", () => {
	const loaded = { ...initialBalanceState, balance: "100", requestId: 1 };

	it("keeps the previous balance while refreshing", () => {
		const next = balanceReducer(loaded, { type: "start", requestId: 2 });
		expect(next.balance).toBe("100");
		expect(next.refreshing).toBe(true);
	});

	it("drops stale responses", () => {
		const refreshing = balanceReducer(loaded, { type: "start", requestId: 3 });
		const stale = balanceReducer(refreshing, { type: "success", requestId: 2, balance: "1" });
		expect(stale.balance).toBe("100");
		const fresh = balanceReducer(stale, { type: "success", requestId: 3, balance: "250" });
		expect(fresh.balance).toBe("250");
		expect(fresh.refreshing).toBe(false);
	});

	it("keeps the last balance on failure", () => {
		const refreshing = balanceReducer(loaded, { type: "start", requestId: 2 });
		const failed = balanceReducer(refreshing, { type: "failure", requestId: 2, error: "BALANCE_REFRESH_FAILED" });
		expect(failed.balance).toBe("100");
		expect(failed.error).toBe("BALANCE_REFRESH_FAILED");
	});
});
