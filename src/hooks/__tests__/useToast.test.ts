import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useToast } from "../useToast";

describe("useToast", () => {
	beforeEach(() => {
		vi.useFakeTimers();
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	describe("initial state", () => {
		it("starts with toast closed", () => {
			const { result } = renderHook(() => useToast());
			expect(result.current.toast.open).toBe(false);
		});

		it("starts with empty message", () => {
			const { result } = renderHook(() => useToast());
			expect(result.current.toast.message).toBe("");
		});

		it("starts with success variant", () => {
			const { result } = renderHook(() => useToast());
			expect(result.current.toast.variant).toBe("success");
		});
	});

	describe("showToast", () => {
		it("opens the toast with the given message", () => {
			const { result } = renderHook(() => useToast());
			act(() => {
				result.current.showToast("Hello");
			});
			expect(result.current.toast.open).toBe(true);
			expect(result.current.toast.message).toBe("Hello");
		});

		it("defaults variant to success when no options are provided", () => {
			const { result } = renderHook(() => useToast());
			act(() => {
				result.current.showToast("Done");
			});
			expect(result.current.toast.variant).toBe("success");
		});

		it("accepts error variant", () => {
			const { result } = renderHook(() => useToast());
			act(() => {
				result.current.showToast("Oops", { variant: "error" });
			});
			expect(result.current.toast.variant).toBe("error");
		});

		it("accepts info variant", () => {
			const { result } = renderHook(() => useToast());
			act(() => {
				result.current.showToast("Note", { variant: "info" });
			});
			expect(result.current.toast.variant).toBe("info");
		});

		it("accepts a custom title", () => {
			const { result } = renderHook(() => useToast());
			act(() => {
				result.current.showToast("msg", { title: "My Title" });
			});
			expect(result.current.toast.title).toBe("My Title");
		});

		it("clears title when called without a title after a previous call with one", () => {
			const { result } = renderHook(() => useToast());
			act(() => {
				result.current.showToast("first", { title: "Title A" });
			});
			act(() => {
				result.current.showToast("second");
			});
			expect(result.current.toast.title).toBeUndefined();
		});
	});

	describe("auto-dismiss", () => {
		it("closes after the default 3000ms duration", () => {
			const { result } = renderHook(() => useToast());
			act(() => {
				result.current.showToast("Hi");
			});
			expect(result.current.toast.open).toBe(true);

			act(() => {
				vi.advanceTimersByTime(3000);
			});
			expect(result.current.toast.open).toBe(false);
		});

		it("closes after a custom duration", () => {
			const { result } = renderHook(() => useToast(1500));
			act(() => {
				result.current.showToast("Hi");
			});
			act(() => {
				vi.advanceTimersByTime(1499);
			});
			expect(result.current.toast.open).toBe(true);

			act(() => {
				vi.advanceTimersByTime(1);
			});
			expect(result.current.toast.open).toBe(false);
		});

		it("resets the dismiss timer when showToast is called again before it fires", () => {
			const { result } = renderHook(() => useToast(1000));

			act(() => {
				result.current.showToast("First");
			});
			act(() => {
				vi.advanceTimersByTime(500);
				result.current.showToast("Second");
			});

			// 500ms after the second call — first timer would have fired but second hasn't
			act(() => {
				vi.advanceTimersByTime(500);
			});
			expect(result.current.toast.open).toBe(true);

			// Remaining 500ms — second timer fires now
			act(() => {
				vi.advanceTimersByTime(500);
			});
			expect(result.current.toast.open).toBe(false);
		});
	});

	describe("hideToast", () => {
		it("closes the toast immediately", () => {
			const { result } = renderHook(() => useToast());
			act(() => {
				result.current.showToast("Hi");
			});
			expect(result.current.toast.open).toBe(true);

			act(() => {
				result.current.hideToast();
			});
			expect(result.current.toast.open).toBe(false);
		});

		it("cancels the auto-dismiss timer", () => {
			const { result } = renderHook(() => useToast(1000));
			act(() => {
				result.current.showToast("Hi");
			});

			act(() => {
				result.current.hideToast();
			});

			// Timer would have fired here if not cancelled
			act(() => {
				vi.advanceTimersByTime(1000);
			});
			// Toast is still closed — no double-toggle
			expect(result.current.toast.open).toBe(false);
		});
	});
});
