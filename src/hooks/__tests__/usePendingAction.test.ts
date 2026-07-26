import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { usePendingAction } from "../usePendingAction";

describe("usePendingAction", () => {
	it("starts not pending", () => {
		const { result } = renderHook(() =>
			usePendingAction(async () => "done"),
		);
		expect(result.current.isPending).toBe(false);
	});

	it("sets isPending true while the action runs, false after", async () => {
		let resolveFn: (v: string) => void = () => {};
		const action = vi.fn(
			() =>
				new Promise<string>((resolve) => {
					resolveFn = resolve;
				}),
		);
		const { result } = renderHook(() => usePendingAction(action));

		let runPromise: Promise<string | undefined>;
		act(() => {
			runPromise = result.current.run();
		});
		expect(result.current.isPending).toBe(true);

		await act(async () => {
			resolveFn("done");
			await runPromise;
		});
		expect(result.current.isPending).toBe(false);
	});

	it("ignores a second call while already pending", async () => {
		let resolveFn: (v: string) => void = () => {};
		const action = vi.fn(
			() =>
				new Promise<string>((resolve) => {
					resolveFn = resolve;
				}),
		);
		const { result } = renderHook(() => usePendingAction(action));

		act(() => {
			result.current.run();
		});
		await act(async () => {
			await result.current.run();
		});

		expect(action).toHaveBeenCalledTimes(1);
		resolveFn("done");
	});
});
