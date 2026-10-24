import { describe, expect, it, vi } from "vitest";
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

	it("never calls state.set for money-path mutations", async () => {
		const s = store(1);
		const set = vi.spyOn(s, "set");
		await runMutation(
			{ idempotencyKey: "k1", moneyPath: true },
			s,
			(p) => p + 1,
			async () => {},
		);
		expect(set).not.toHaveBeenCalled();
		expect(s.get()).toBe(1);
	});

	it("never calls state.set when the idempotency key is missing", async () => {
		const s = store(1);
		const set = vi.spyOn(s, "set");
		await runMutation(
			{},
			s,
			(p) => p + 1,
			async () => {},
		);
		expect(set).not.toHaveBeenCalled();
		expect(s.get()).toBe(1);
	});

	it("never calls state.set when the idempotency key is blank", async () => {
		const s = store(1);
		const set = vi.spyOn(s, "set");
		await runMutation(
			{ idempotencyKey: "   " },
			s,
			(p) => p + 1,
			async () => {},
		);
		expect(set).not.toHaveBeenCalled();
		expect(s.get()).toBe(1);
	});

	it("retains the optimistic value on a successful commit", async () => {
		const s = store(1);
		const set = vi.spyOn(s, "set");
		await runMutation(
			{ idempotencyKey: "k1" },
			s,
			(p) => p + 1,
			async () => {},
		);
		expect(set).toHaveBeenCalledTimes(1);
		expect(set).toHaveBeenCalledWith(2);
		expect(s.get()).toBe(2);
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

	it("restores the exact previous reference on failure", async () => {
		const previous = { count: 1 };
		let value = previous;
		const s = {
			get: () => value,
			set: (next: typeof previous) => {
				value = next;
			},
		};
		const set = vi.spyOn(s, "set");
		const before = s.get();
		await expect(
			runMutation(
				{ idempotencyKey: "k1" },
				s,
				(p) => ({ count: p.count + 1 }),
				async () => {
					throw new Error("fail");
				},
			),
		).rejects.toThrow("fail");
		expect(set).toHaveBeenCalledTimes(2);
		expect(set).toHaveBeenNthCalledWith(1, { count: 2 });
		expect(set).toHaveBeenNthCalledWith(2, before);
		expect(s.get()).toBe(before);
	});

	it("rethrows the commit rejection unchanged", async () => {
		const s = store(1);
		const error = new Error("boom");
		await expect(
			runMutation(
				{ idempotencyKey: "k1" },
				s,
				(p) => p + 1,
				async () => {
					throw error;
				},
			),
		).rejects.toBe(error);
	});
});
