import { describe, expect, it } from "vitest";
import { canApplyOptimistic, runMutation } from "./optimistic";

const store = (initial: number) => {
	let value = initial;
	return {
		get: () => value,
		set: (next: number) => {
			value = next;
		},
	};
};

describe("canApplyOptimistic", () => {
	it("requires an idempotency key", () => {
		expect(canApplyOptimistic({})).toBe(false);
		expect(canApplyOptimistic({ idempotencyKey: " " })).toBe(false);
		expect(canApplyOptimistic({ idempotencyKey: "k1" })).toBe(true);
	});

	it("never allows money-path writes", () => {
		expect(canApplyOptimistic({ idempotencyKey: "k1", moneyPath: true })).toBe(
			false,
		);
	});
});

describe("runMutation", () => {
	it("skips optimistic state for non-idempotent mutations", async () => {
		const s = store(1);
		let seen = 0;
		await runMutation(
			{},
			s,
			(p) => p + 1,
			async () => {
				seen = s.get();
			},
		);
		expect(seen).toBe(1);
	});

	it("rolls back on failure", async () => {
		const s = store(1);
		await expect(
			runMutation(
				{ idempotencyKey: "k1" },
				s,
				(p) => p + 1,
				async () => {
					throw new Error("fail");
				},
			),
		).rejects.toThrow("fail");
		expect(s.get()).toBe(1);
	});
});
