"use client";

import { useEffect, useState } from "react";
import { DARK_MODE_STORAGE_KEY } from "@/lib/theme";

function getInitialDark(): boolean {
	try {
		const stored = localStorage.getItem(DARK_MODE_STORAGE_KEY);
		if (stored !== null) return stored === "true";
		return window.matchMedia("(prefers-color-scheme: dark)").matches;
	} catch {
		return false;
	}
}

/**
 * Reads whatever the pre-hydration inline script (see `src/app/layout.tsx`)
 * already applied to `<html>`, so the hook's initial render matches the
 * already-painted page instead of assuming light mode.
 */
function getAppliedDark(): boolean {
	if (typeof document === "undefined") return false;
	return document.documentElement.classList.contains("dark");
}

/**
 * Manages dark mode by toggling the `dark` class on <html> and persisting
 * the preference to localStorage. A blocking inline script in the root
 * layout applies the class before first paint to avoid a flash of the wrong
 * theme; this hook only needs to stay in sync with (and update) that class.
 */
export function useDarkMode() {
	const [isDark, setIsDark] = useState(getAppliedDark);

	// Re-sync from localStorage/OS preference after mount. This is a no-op
	// whenever the pre-hydration script already applied the correct class
	// (the common case), and acts as a fallback when it couldn't run (e.g.
	// tests, or a CSP blocking inline scripts).
	useEffect(() => {
		const initial = getInitialDark();
		setIsDark(initial);
		document.documentElement.classList.toggle("dark", initial);
	}, []);

	function toggle() {
		setIsDark((prev) => {
			const next = !prev;
			document.documentElement.classList.toggle("dark", next);
			try {
				localStorage.setItem(DARK_MODE_STORAGE_KEY, String(next));
			} catch {}
			return next;
		});
	}

	return { isDark, toggle };
}
