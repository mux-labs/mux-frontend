/**
 * #702 – Copy-to-clipboard UX must not silently fail without a toast
 *
 * These tests confirm that:
 *  1. When the Clipboard API permission is denied (or the API is absent),
 *     `useCopyToClipboardUx` surfaces a non-null `error` string — the
 *     contract that callers (e.g. CopyButton) use to show a visible toast.
 *  2. A successful copy always sets `copied = true` and `error = null` so
 *     a success toast can be shown.
 *  3. The hook never silently swallows errors: `error` is always either null
 *     (no error) or a non-empty string (visible to callers).
 *  4. The `reset()` helper clears the error state for re-use.
 *  5. Wallet address copy with a security-sensitive payload behaves the same
 *     way: a failed clipboard write surfaces an error, not a silent no-op.
 *
 * These tests will FAIL if:
 *  - The catch block sets `error` to `null` or `""` on a Clipboard failure.
 *  - `copied` is set to `true` after a failed Clipboard write.
 *  - The error is swallowed and neither `error` nor a toast callback fires.
 */

import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useCopyToClipboardUx } from "../useCopyToClipboardUx";

// Address validation module – keep it simple so these tests focus on the UX
// contract, not the address logic.
vi.mock("@/utils/addressValidation", () => ({
	isSafeToCopy: vi.fn(() => true),
	getAddressToCopy: vi.fn((text: string, full?: string) => full ?? text),
}));

const VALID_ADDRESS =
	"GBZXN7PIRZGNMHGA7MUUUF4GWPY5AYPV6LY4UV2GL6VJGIQRXFDNMADI";

describe("#702 useCopyToClipboardUx – no silent clipboard failures", () => {
	let writeTextSpy: ReturnType<typeof vi.spyOn>;

	beforeEach(() => {
		vi.clearAllMocks();
		writeTextSpy = vi
			.spyOn(navigator.clipboard, "writeText")
			.mockResolvedValue(undefined);
	});

	afterEach(() => {
		vi.useRealTimers();
		vi.restoreAllMocks();
	});

	// -----------------------------------------------------------------------
	// 1. Success path – error must be null, copied must be true
	// -----------------------------------------------------------------------

	it("sets copied=true and error=null on a successful copy", async () => {
		const { result } = renderHook(() => useCopyToClipboardUx());

		await act(async () => {
			await result.current.copy("hello world");
		});

		expect(result.current.copied).toBe(true);
		expect(result.current.error).toBeNull();
	});

	it("sets copied=true and error=null after a successful Stellar address copy", async () => {
		const { result } = renderHook(() => useCopyToClipboardUx());

		await act(async () => {
			await result.current.copy(VALID_ADDRESS, VALID_ADDRESS);
		});

		expect(result.current.copied).toBe(true);
		expect(result.current.error).toBeNull();
		expect(writeTextSpy).toHaveBeenCalledWith(VALID_ADDRESS);
	});

	// -----------------------------------------------------------------------
	// 2. Clipboard permission denied → error must be non-null (toast-able)
	// -----------------------------------------------------------------------

	it("surfaces a non-null error when Clipboard API throws NotAllowedError", async () => {
		writeTextSpy.mockRejectedValueOnce(
			new DOMException("Permission denied", "NotAllowedError"),
		);

		const { result } = renderHook(() => useCopyToClipboardUx());

		await act(async () => {
			await result.current.copy("some text");
		});

		// The error MUST be non-null so the caller can show a toast.
		expect(result.current.error).not.toBeNull();
		expect(result.current.error).toMatch(/Permission denied/i);
		expect(result.current.copied).toBe(false);
	});

	it("surfaces a non-null error when Clipboard API is completely unavailable", async () => {
		// Simulate environments where navigator.clipboard is absent.
		writeTextSpy.mockRejectedValueOnce(
			new TypeError("Cannot read properties of undefined"),
		);

		const { result } = renderHook(() => useCopyToClipboardUx());

		await act(async () => {
			await result.current.copy("some text");
		});

		expect(result.current.error).not.toBeNull();
		expect(typeof result.current.error).toBe("string");
		expect((result.current.error as string).length).toBeGreaterThan(0);
		expect(result.current.copied).toBe(false);
	});

	it("returns false from copy() when the Clipboard API throws", async () => {
		writeTextSpy.mockRejectedValueOnce(
			new DOMException("NotAllowedError", "NotAllowedError"),
		);

		const { result } = renderHook(() => useCopyToClipboardUx());

		let returnValue = true;
		await act(async () => {
			returnValue = await result.current.copy("some text");
		});

		// The caller uses the return value to decide whether to show a success toast.
		expect(returnValue).toBe(false);
	});

	it("returns true from copy() on success", async () => {
		const { result } = renderHook(() => useCopyToClipboardUx());

		let returnValue = false;
		await act(async () => {
			returnValue = await result.current.copy("hello");
		});

		expect(returnValue).toBe(true);
	});

	// -----------------------------------------------------------------------
	// 3. Error is never an empty string (silent failure)
	// -----------------------------------------------------------------------

	it("error is either null (no error) or a non-empty string – never empty string", async () => {
		writeTextSpy.mockRejectedValueOnce(new Error("Clipboard write failed"));

		const { result } = renderHook(() => useCopyToClipboardUx());

		await act(async () => {
			await result.current.copy("text");
		});

		expect(result.current.error).not.toBe("");
		expect(result.current.error).not.toBeNull();
	});

	// -----------------------------------------------------------------------
	// 4. Address copy – clipboard failure with a wallet address surfaces error
	// -----------------------------------------------------------------------

	it("surfaces an error when address clipboard write is denied, not a silent no-op", async () => {
		writeTextSpy.mockRejectedValueOnce(
			new DOMException("Permission denied", "NotAllowedError"),
		);

		const { result } = renderHook(() => useCopyToClipboardUx());

		await act(async () => {
			await result.current.copy(VALID_ADDRESS, VALID_ADDRESS);
		});

		// Security-sensitive: must show an error, not silently succeed.
		expect(result.current.copied).toBe(false);
		expect(result.current.error).not.toBeNull();
	});

	// -----------------------------------------------------------------------
	// 5. reset() clears the error so the toast can be dismissed
	// -----------------------------------------------------------------------

	it("reset() clears error state", async () => {
		writeTextSpy.mockRejectedValueOnce(new Error("denied"));

		const { result } = renderHook(() => useCopyToClipboardUx());

		await act(async () => {
			await result.current.copy("text");
		});

		expect(result.current.error).not.toBeNull();

		act(() => {
			result.current.reset();
		});

		expect(result.current.error).toBeNull();
		expect(result.current.copied).toBe(false);
		expect(result.current.loading).toBe(false);
	});

	// -----------------------------------------------------------------------
	// 6. Consecutive copy attempts – error from attempt N clears on attempt N+1
	// -----------------------------------------------------------------------

	it("clears previous error before a new copy attempt", async () => {
		// First copy fails
		writeTextSpy.mockRejectedValueOnce(new Error("denied"));
		// Second copy succeeds
		writeTextSpy.mockResolvedValueOnce(undefined);

		const { result } = renderHook(() => useCopyToClipboardUx());

		await act(async () => {
			await result.current.copy("text");
		});
		expect(result.current.error).not.toBeNull();

		await act(async () => {
			await result.current.copy("text");
		});
		// Error from previous attempt must not linger.
		expect(result.current.error).toBeNull();
		expect(result.current.copied).toBe(true);
	});

	// -----------------------------------------------------------------------
	// 7. loading state is always cleared after the copy resolves or rejects
	// -----------------------------------------------------------------------

	it("loading is false after a successful copy", async () => {
		const { result } = renderHook(() => useCopyToClipboardUx());

		await act(async () => {
			await result.current.copy("text");
		});

		expect(result.current.loading).toBe(false);
	});

	it("loading is false after a failed copy", async () => {
		writeTextSpy.mockRejectedValueOnce(new Error("denied"));

		const { result } = renderHook(() => useCopyToClipboardUx());

		await act(async () => {
			await result.current.copy("text");
		});

		expect(result.current.loading).toBe(false);
	});

	// -----------------------------------------------------------------------
	// 8. copied auto-resets after the configured delay
	// -----------------------------------------------------------------------

	it("copied resets to false after the resetDelay", async () => {
		vi.useFakeTimers();

		const { result } = renderHook(() => useCopyToClipboardUx(500));

		await act(async () => {
			await result.current.copy("text");
		});

		expect(result.current.copied).toBe(true);

		await act(async () => {
			await vi.advanceTimersByTimeAsync(500);
		});

		expect(result.current.copied).toBe(false);
	});
});
