"use client";

import { useEffect, useState } from "react";

const STORAGE_KEY = "mux_dark_mode";

function getInitialDark(): boolean {
	try {
		const stored = localStorage.getItem(STORAGE_KEY);
		if (stored !== null) return stored === "true";
		return window.matchMedia("(prefers-color-scheme: dark)").matches;
	} catch {
		return false;
	}
}

/**
 * Manages dark mode by toggling the `dark` class on <html> and persisting
 * the preference to localStorage.
 */
export function useDarkMode() {
	const [isDark, setIsDark] = useState(false);

	// Read stored/OS preference after mount (avoids SSR mismatch)
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
				localStorage.setItem(STORAGE_KEY, String(next));
			} catch {}
			return next;
		});
	}

	return { isDark, toggle };
}
