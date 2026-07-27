import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useCopyToClipboard } from "../useCopyToClipboard";

// Mock address validation
vi.mock("@/utils/addressValidation", () => ({
	isSafeToCopy: vi.fn((text, fullAddress) => {
		// Valid Stellar address format
		if (/^G[A-Z2-7]{55}$/.test(text)) return true;
		// Truncated format with full address
		if (/^G[A-Z2-7]{5}\.\.\.[A-Z2-7]{4}$/.test(text) && fullAddress) {
			return /^G[A-Z2-7]{55}$/.test(fullAddress);
		}
		return false;
	}),
	getAddressToCopy: vi.fn((text, fullAddress) => {
		if (/^G[A-Z2-7]{55}$/.test(text)) return text;
		if (/^G[A-Z2-7]{5}\.\.\.[A-Z2-7]{4}$/.test(text) && fullAddress) {
			return /^G[A-Z2-7]{55}$/.test(fullAddress) ? fullAddress : null;
		}
		return null;
	}),
}));

describe("useCopyToClipboard hook", () => {
	const validAddress =
		"GBZXN7PIRZGNMHGA7MUUUF4GWPY5AYPV6LY4UV2GL6VJGIQRXFDNMADI";
	const truncatedAddress = "GBZXN7...MADI";
	const invalidAddress = "INVALID_ADDRESS";
	const regularText = "Hello World";

	// Spy on the jsdom clipboard stub (defined in src/test/setup.tsx) instead of
	// replacing navigator.clipboard per-test — swapping the whole object was a
	// source of flakiness when tests ran out of order in the same worker.
	let writeTextSpy: ReturnType<typeof vi.spyOn>;

	beforeEach(() => {
		vi.clearAllMocks();
		writeTextSpy = vi
			.spyOn(navigator.clipboard, "writeText")
			.mockResolvedValue(undefined);
	});

	// Guaranteed via afterEach (not inline at the end of each test) so a failed
	// assertion can't leave fake timers active and bleed into later tests.
	afterEach(() => {
		vi.useRealTimers();
		vi.restoreAllMocks();
	});

	describe("basic functionality", () => {
		it("should copy regular text", async () => {
			const { result } = renderHook(() => useCopyToClipboard());

			await act(async () => {
				await result.current.copy(regularText);
			});

			expect(writeTextSpy).toHaveBeenCalledWith(regularText);
			expect(result.current.copied).toBe(true);
			expect(result.current.error).toBeNull();
		});

		it("should copy valid Stellar address", async () => {
			const { result } = renderHook(() => useCopyToClipboard());

			await act(async () => {
				await result.current.copy(validAddress, validAddress);
			});

			expect(writeTextSpy).toHaveBeenCalledWith(validAddress);
			expect(result.current.copied).toBe(true);
			expect(result.current.error).toBeNull();
		});

		it("should reject invalid address", async () => {
			const { result } = renderHook(() => useCopyToClipboard());

			await act(async () => {
				await result.current.copy(invalidAddress);
			});

			expect(writeTextSpy).not.toHaveBeenCalled();
			expect(result.current.copied).toBe(false);
			expect(result.current.error).not.toBeNull();
		});
	});

	describe("address validation", () => {
		it("should validate full address before copying", async () => {
			const { result } = renderHook(() => useCopyToClipboard());

			await act(async () => {
				await result.current.copy(validAddress, validAddress);
			});

			expect(result.current.error).toBeNull();
			expect(result.current.copied).toBe(true);
		});

		it("should reject invalid address format", async () => {
			const { result } = renderHook(() => useCopyToClipboard());

			await act(async () => {
				await result.current.copy(invalidAddress);
			});

			expect(result.current.error).toBe("Invalid address format");
			expect(result.current.copied).toBe(false);
		});

		it("should handle truncated address with full address", async () => {
			const { result } = renderHook(() => useCopyToClipboard());

			await act(async () => {
				await result.current.copy(truncatedAddress, validAddress);
			});

			expect(writeTextSpy).toHaveBeenCalledWith(validAddress);
			expect(result.current.error).toBeNull();
			expect(result.current.copied).toBe(true);
		});

		it("should reject truncated address without full address", async () => {
			const { result } = renderHook(() => useCopyToClipboard());

			await act(async () => {
				await result.current.copy(truncatedAddress);
			});

			expect(result.current.error).not.toBeNull();
			expect(result.current.copied).toBe(false);
		});
	});

	describe("error handling", () => {
		it("should handle clipboard API errors", async () => {
			writeTextSpy.mockRejectedValueOnce(new Error("Clipboard error"));

			const { result } = renderHook(() => useCopyToClipboard());

			await act(async () => {
				await result.current.copy(regularText);
			});

			expect(result.current.error).toBe("Clipboard error");
			expect(result.current.copied).toBe(false);
		});

		it("should clear previous error on successful copy", async () => {
			const { result } = renderHook(() => useCopyToClipboard());

			// First, trigger an error
			await act(async () => {
				await result.current.copy(invalidAddress);
			});

			expect(result.current.error).not.toBeNull();

			// Then, copy valid text
			await act(async () => {
				await result.current.copy(regularText);
			});

			expect(result.current.error).toBeNull();
			expect(result.current.copied).toBe(true);
		});

		it("should handle generic errors", async () => {
			writeTextSpy.mockRejectedValueOnce("Unknown error");

			const { result } = renderHook(() => useCopyToClipboard());

			await act(async () => {
				await result.current.copy(regularText);
			});

			expect(result.current.error).toBe("Failed to copy to clipboard");
		});

		it("should not leave copied=true when the clipboard write rejects mid-flight", async () => {
			// Regression guard for jsdom: a rejected microtask that resolves on
			// the next tick must not race the state update from a later render.
			writeTextSpy.mockImplementationOnce(
				() => new Promise((_, reject) => setTimeout(() => reject(new Error("denied")), 0)),
			);
			vi.useFakeTimers();

			const { result } = renderHook(() => useCopyToClipboard());

			const copyPromise = act(async () => {
				await result.current.copy(regularText);
			});

			await vi.advanceTimersByTimeAsync(0);
			await copyPromise;

			expect(result.current.copied).toBe(false);
			expect(result.current.error).toBe("denied");
		});
	});

	describe("state management", () => {
		it("should reset copied state after delay", async () => {
			vi.useFakeTimers();
			const { result } = renderHook(() => useCopyToClipboard(1000));

			await act(async () => {
				await result.current.copy(regularText);
			});

			expect(result.current.copied).toBe(true);

			await act(async () => {
				await vi.advanceTimersByTimeAsync(1000);
			});

			expect(result.current.copied).toBe(false);
		});

		it("should use custom reset delay", async () => {
			vi.useFakeTimers();
			const { result } = renderHook(() => useCopyToClipboard(500));

			await act(async () => {
				await result.current.copy(regularText);
			});

			expect(result.current.copied).toBe(true);

			await act(async () => {
				await vi.advanceTimersByTimeAsync(500);
			});

			expect(result.current.copied).toBe(false);
		});

		it("should not reset copied state before the delay elapses", async () => {
			vi.useFakeTimers();
			const { result } = renderHook(() => useCopyToClipboard(1000));

			await act(async () => {
				await result.current.copy(regularText);
			});

			await act(async () => {
				await vi.advanceTimersByTimeAsync(999);
			});

			expect(result.current.copied).toBe(true);
		});

		it("should maintain error state until next copy attempt", async () => {
			const { result } = renderHook(() => useCopyToClipboard());

			await act(async () => {
				await result.current.copy(invalidAddress);
			});

			expect(result.current.error).not.toBeNull();

			// Error should persist
			expect(result.current.error).not.toBeNull();
		});
	});

	describe("integration scenarios", () => {
		it("should handle copy workflow for valid address", async () => {
			const { result } = renderHook(() => useCopyToClipboard());

			// Initial state
			expect(result.current.copied).toBe(false);
			expect(result.current.error).toBeNull();

			// Copy address
			await act(async () => {
				await result.current.copy(validAddress, validAddress);
			});

			// Success state
			expect(result.current.copied).toBe(true);
			expect(result.current.error).toBeNull();
			expect(writeTextSpy).toHaveBeenCalledWith(validAddress);
		});

		it("should handle copy workflow for invalid address", async () => {
			const { result } = renderHook(() => useCopyToClipboard());

			// Initial state
			expect(result.current.copied).toBe(false);
			expect(result.current.error).toBeNull();

			// Try to copy invalid address
			await act(async () => {
				await result.current.copy(invalidAddress);
			});

			// Error state
			expect(result.current.copied).toBe(false);
			expect(result.current.error).not.toBeNull();
			expect(writeTextSpy).not.toHaveBeenCalled();
		});

		it("should handle multiple copy attempts", async () => {
			const { result } = renderHook(() => useCopyToClipboard());

			// First copy
			await act(async () => {
				await result.current.copy(regularText);
			});

			expect(result.current.copied).toBe(true);
			expect(writeTextSpy).toHaveBeenCalledTimes(1);

			// Second copy
			await act(async () => {
				await result.current.copy(validAddress, validAddress);
			});

			expect(result.current.copied).toBe(true);
			expect(writeTextSpy).toHaveBeenCalledTimes(2);
		});
	});

	describe("edge cases", () => {
		it("should handle empty string", async () => {
			const { result } = renderHook(() => useCopyToClipboard());

			await act(async () => {
				await result.current.copy("");
			});

			expect(writeTextSpy).toHaveBeenCalledWith("");
			expect(result.current.copied).toBe(true);
		});

		it("should handle very long text", async () => {
			const longText = "A".repeat(10000);
			const { result } = renderHook(() => useCopyToClipboard());

			await act(async () => {
				await result.current.copy(longText);
			});

			expect(writeTextSpy).toHaveBeenCalledWith(longText);
			expect(result.current.copied).toBe(true);
		});

		it("should handle special characters in non-address text", async () => {
			const specialText = "!@#$%^&*()_+-=[]{}|;:',.<>?/";
			const { result } = renderHook(() => useCopyToClipboard());

			await act(async () => {
				await result.current.copy(specialText);
			});

			expect(writeTextSpy).toHaveBeenCalledWith(specialText);
			expect(result.current.copied).toBe(true);
		});
	});
});
