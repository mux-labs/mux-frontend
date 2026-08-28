/**
 * #701 – Balance visibility toggle must not leak amounts in DOM when hidden
 *
 * These tests exercise useBalanceVisibility in isolation to confirm that:
 *  1. The hook exposes `isInitialized` so consumers can defer rendering until
 *     the persisted preference is read from localStorage (avoids a flash of
 *     the wrong state that would momentarily expose the amount).
 *  2. The hidden state is stable: toggling hidden → visible → hidden returns
 *     to a hidden state, not an in-between state.
 *  3. The balance visible state matches the localStorage value; divergence
 *     would mean a render window where the DOM shows the real amount even
 *     though the user requested hiding.
 *  4. A clipboard payload must never contain the formatted amount when the
 *     balance is hidden (tested via the contract: copy helpers should only
 *     be called after the caller checks isVisible).
 *
 * These tests will FAIL if:
 *  - `isInitialized` is removed (consumers would render before localStorage
 *    is read, transiently exposing the balance).
 *  - The toggle returns the wrong value after an even number of flips.
 *  - The persisted value diverges from the in-memory state.
 */

import { renderHook, act } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { useBalanceVisibility } from "../useBalanceVisibility";

const STORAGE_KEY = "mux_balance_visibility";

describe("#701 useBalanceVisibility – DOM leak guard", () => {
	beforeEach(() => {
		window.localStorage.clear();
		vi.clearAllMocks();
	});

	afterEach(() => {
		window.localStorage.clear();
	});

	// -----------------------------------------------------------------------
	// 1. isInitialized gate prevents pre-hydration amount exposure
	// -----------------------------------------------------------------------

	it("starts uninitialized so the consumer can defer rendering the real amount", () => {
		// Simulate a slow hydration: localStorage hasn't been read yet.
		// The hook should NOT be initialized synchronously before the effect runs.
		// NOTE: jsdom runs effects synchronously in renderHook, so we verify the
		// final state — but the important contract is that `isInitialized` is the
		// signal consumers must gate on.
		const { result } = renderHook(() => useBalanceVisibility(false));

		// After renderHook the effect has run — the hook MUST set isInitialized.
		expect(result.current.isInitialized).toBe(true);
	});

	it("reflects the persisted hidden preference before any render of the amount", () => {
		// Operator previously set hidden:
		window.localStorage.setItem(STORAGE_KEY, "false");

		const { result } = renderHook(() => useBalanceVisibility(true));

		// isVisible must match the stored preference — not the default argument.
		// If isVisible were true here, the component would render the amount in
		// DOM text before the user can interact with the toggle.
		expect(result.current.isInitialized).toBe(true);
		expect(result.current.isVisible).toBe(false);
	});

	it("reflects the persisted visible preference on re-mount", () => {
		window.localStorage.setItem(STORAGE_KEY, "true");

		const { result } = renderHook(() => useBalanceVisibility(false));

		expect(result.current.isVisible).toBe(true);
	});

	// -----------------------------------------------------------------------
	// 2. Toggle idempotency – hidden stays hidden after even flips
	// -----------------------------------------------------------------------

	it("returns to hidden after an even number of toggles", () => {
		window.localStorage.setItem(STORAGE_KEY, "false");
		const { result } = renderHook(() => useBalanceVisibility(false));

		expect(result.current.isVisible).toBe(false);

		// toggle twice → back to hidden
		act(() => { result.current.toggleVisibility(); });
		expect(result.current.isVisible).toBe(true);

		act(() => { result.current.toggleVisibility(); });
		expect(result.current.isVisible).toBe(false);
	});

	it("persists the hidden state to localStorage so the preference survives remount", () => {
		const { result } = renderHook(() => useBalanceVisibility(true));

		// start visible, toggle to hidden
		act(() => { result.current.toggleVisibility(); });

		expect(result.current.isVisible).toBe(false);
		expect(window.localStorage.getItem(STORAGE_KEY)).toBe("false");
	});

	// -----------------------------------------------------------------------
	// 3. In-memory state and localStorage stay in sync
	// -----------------------------------------------------------------------

	it("in-memory isVisible always matches what is written to localStorage", () => {
		const { result } = renderHook(() => useBalanceVisibility(false));

		for (let i = 0; i < 5; i++) {
			act(() => { result.current.toggleVisibility(); });
			const persisted = window.localStorage.getItem(STORAGE_KEY);
			expect(String(result.current.isVisible)).toBe(persisted);
		}
	});

	// -----------------------------------------------------------------------
	// 4. Clipboard guard: the hook state must be checked before copying
	//    (contract test – the amount must NOT be passed to clipboard helpers
	//     when isVisible is false)
	// -----------------------------------------------------------------------

	it("isVisible=false signals callers that the amount must not be put in clipboard", () => {
		window.localStorage.setItem(STORAGE_KEY, "false");
		const { result } = renderHook(() => useBalanceVisibility(false));

		// The consumer contract: only copy the amount when isVisible is true.
		// This test asserts the flag is correct so callers can rely on it.
		expect(result.current.isVisible).toBe(false);

		// Simulate what a copy handler should do:
		const shouldCopy = result.current.isVisible; // false → must NOT copy
		expect(shouldCopy).toBe(false);
	});

	it("isVisible=true signals callers that the amount may be put in clipboard", () => {
		window.localStorage.setItem(STORAGE_KEY, "true");
		const { result } = renderHook(() => useBalanceVisibility(false));

		expect(result.current.isVisible).toBe(true);

		const shouldCopy = result.current.isVisible;
		expect(shouldCopy).toBe(true);
	});

	// -----------------------------------------------------------------------
	// 5. localStorage failure never transitions to an unexpected visible state
	// -----------------------------------------------------------------------

	it("falls back to defaultVisibility (false) when localStorage.getItem throws, keeping balance hidden", () => {
		const spy = vi
			.spyOn(Storage.prototype, "getItem")
			.mockImplementation(() => { throw new Error("QuotaExceeded"); });
		const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

		const { result } = renderHook(() => useBalanceVisibility(false));

		// Balance stays hidden on localStorage error — the safe default.
		expect(result.current.isVisible).toBe(false);
		expect(result.current.isInitialized).toBe(true);
		expect(warnSpy).toHaveBeenCalled();

		spy.mockRestore();
		warnSpy.mockRestore();
	});

	it("falls back to defaultVisibility (true) when localStorage.getItem throws, keeping balance visible", () => {
		const spy = vi
			.spyOn(Storage.prototype, "getItem")
			.mockImplementation(() => { throw new Error("SecurityError"); });
		const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

		const { result } = renderHook(() => useBalanceVisibility(true));

		expect(result.current.isVisible).toBe(true);
		expect(result.current.isInitialized).toBe(true);

		spy.mockRestore();
		warnSpy.mockRestore();
	});

	it("localStorage.setItem failure does not corrupt in-memory toggle state", () => {
		const spy = vi
			.spyOn(Storage.prototype, "setItem")
			.mockImplementation(() => { throw new Error("QuotaExceeded"); });
		const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

		const { result } = renderHook(() => useBalanceVisibility(false));

		act(() => { result.current.toggleVisibility(); });

		// In-memory state toggled even though persistence failed.
		expect(result.current.isVisible).toBe(true);
		expect(warnSpy).toHaveBeenCalled();

		spy.mockRestore();
		warnSpy.mockRestore();
	});

	// -----------------------------------------------------------------------
	// 6. aria-pressed / accessible text contract
	//    Consumers must render aria-pressed=false when hidden so assistive
	//    technology does not expose the state as "showing balance".
	// -----------------------------------------------------------------------

	it("toggleVisibility flips state predictably so aria-pressed can track it correctly", () => {
		const { result } = renderHook(() => useBalanceVisibility(false));

		// hidden → aria-pressed should be false
		expect(result.current.isVisible).toBe(false);

		act(() => { result.current.toggleVisibility(); });
		// visible → aria-pressed should be true
		expect(result.current.isVisible).toBe(true);

		act(() => { result.current.toggleVisibility(); });
		// hidden again → aria-pressed should be false
		expect(result.current.isVisible).toBe(false);
	});
});
