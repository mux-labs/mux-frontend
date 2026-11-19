import { describe, expect, it, vi } from "vitest";
import { canApplyOptimistic, runMutation } from "./optimistic";

describe("canApplyOptimistic", () => {
	it("allows idempotent, non-money-path mutations", () => {
		expect(canApplyOptimistic({ idempotencyKey: "key-1" })).toBe(true);
	});

	it("rejects money-path mutations even with an idempotency key", () => {
		expect(
			canApplyOptimistic({ idempotencyKey: "key-1", moneyPath: true }),
		).toBe(false);
	});

	it("rejects mutations without a usable idempotency key", () => {
		expect(canApplyOptimistic({})).toBe(false);
		expect(canApplyOptimistic({ idempotencyKey: null })).toBe(false);
		expect(canApplyOptimistic({ idempotencyKey: "   " })).toBe(false);
	});
});

describe("runMutation", () => {
	it("never calls state.set when optimistic is not allowed", async () => {
		const previous = { count: 0 };
		const state = { get: vi.fn(() => previous), set: vi.fn() };
		const optimistic = vi.fn((prev: { count: number }) => ({
			count: prev.count + 1,
		}));
		const commit = vi.fn(async () => "ok");

		const result = await runMutation(
			{ idempotencyKey: null },
			state,
			optimistic,
			commit,
		);

		expect(result).toBe("ok");
		expect(state.set).not.toHaveBeenCalled();
		expect(optimistic).not.toHaveBeenCalled();
		expect(commit).toHaveBeenCalledTimes(1);
	});

	it("applies the optimistic value once when allowed", async () => {
		const previous = { count: 0 };
		const next = { count: 1 };
		const state = { get: vi.fn(() => previous), set: vi.fn() };
		const optimistic = vi.fn(() => next);
		const commit = vi.fn(async () => "ok");

		const result = await runMutation(
			{ idempotencyKey: "key-1" },
			state,
			optimistic,
			commit,
		);

		expect(result).toBe("ok");
		expect(state.set).toHaveBeenCalledTimes(1);
		expect(state.set).toHaveBeenCalledWith(next);
	});

	it("restores the exact previous reference and rethrows on failure", async () => {
		const previous = { count: 0 };
		const next = { count: 1 };
		const state = { get: vi.fn(() => previous), set: vi.fn() };
		const optimistic = vi.fn(() => next);
		const error = new Error("commit failed");
		const commit = vi.fn(async () => {
			throw error;
		});

		await expect(
			runMutation({ idempotencyKey: "key-1" }, state, optimistic, commit),
		).rejects.toBe(error);

		expect(state.set).toHaveBeenCalledTimes(2);
		expect(state.set).toHaveBeenNthCalledWith(1, next);
		expect(state.set).toHaveBeenNthCalledWith(2, previous);
		expect(state.set.mock.calls[1][0]).toBe(previous);
	});

	it("does not restore state on failure when optimistic is not allowed", async () => {
		const previous = { count: 0 };
		const state = { get: vi.fn(() => previous), set: vi.fn() };
		const error = new Error("commit failed");
		const commit = vi.fn(async () => {
			throw error;
		});

		await expect(
			runMutation(
				{ idempotencyKey: "key-1", moneyPath: true },
				state,
				(prev) => ({ count: prev.count + 1 }),
				commit,
			),
		).rejects.toBe(error);

		expect(state.set).not.toHaveBeenCalled();
	});
});
