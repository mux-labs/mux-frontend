import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { useDarkMode } from "./useDarkMode";

describe("useDarkMode", () => {
	beforeEach(() => {
		document.documentElement.classList.remove("dark");
		localStorage.removeItem("mux_dark_mode");
	});

	afterEach(() => {
		document.documentElement.classList.remove("dark");
		localStorage.removeItem("mux_dark_mode");
	});

	it("starts in light mode when no preference is stored", () => {
		const { result } = renderHook(() => useDarkMode());
		expect(result.current.isDark).toBe(false);
	});

	it("starts in dark mode when localStorage has 'true'", () => {
		localStorage.setItem("mux_dark_mode", "true");
		const { result } = renderHook(() => useDarkMode());
		expect(result.current.isDark).toBe(true);
		expect(document.documentElement.classList.contains("dark")).toBe(true);
	});

	it("toggle() switches from light to dark", () => {
		const { result } = renderHook(() => useDarkMode());
		act(() => result.current.toggle());
		expect(result.current.isDark).toBe(true);
		expect(document.documentElement.classList.contains("dark")).toBe(true);
	});

	it("toggle() switches from dark to light", () => {
		localStorage.setItem("mux_dark_mode", "true");
		const { result } = renderHook(() => useDarkMode());
		act(() => result.current.toggle());
		expect(result.current.isDark).toBe(false);
		expect(document.documentElement.classList.contains("dark")).toBe(false);
	});

	it("toggle() persists dark preference to localStorage", () => {
		const { result } = renderHook(() => useDarkMode());
		act(() => result.current.toggle());
		expect(localStorage.getItem("mux_dark_mode")).toBe("true");
	});

	it("toggle() persists light preference to localStorage", () => {
		localStorage.setItem("mux_dark_mode", "true");
		const { result } = renderHook(() => useDarkMode());
		act(() => result.current.toggle());
		expect(localStorage.getItem("mux_dark_mode")).toBe("false");
	});
});
