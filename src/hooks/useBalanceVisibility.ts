import { useState, useEffect, useCallback } from "react";

const STORAGE_KEY = "mux_balance_visibility";

export function useBalanceVisibility(defaultVisibility = false) {
	const [isVisible, setIsVisible] = useState(defaultVisibility);
	const [isInitialized, setIsInitialized] = useState(false);

	useEffect(() => {
		try {
			const stored = window.localStorage.getItem(STORAGE_KEY);
			if (stored !== null) {
				setIsVisible(stored === "true");
			}
		} catch (error) {
			console.warn(
				"Failed to read balance visibility from localStorage:",
				error,
			);
		}
		setIsInitialized(true);
	}, []);

	const toggleVisibility = useCallback(() => {
		setIsVisible((prev) => {
			const newValue = !prev;
			try {
				window.localStorage.setItem(STORAGE_KEY, String(newValue));
			} catch (error) {
				console.warn(
					"Failed to save balance visibility to localStorage:",
					error,
				);
			}
			return newValue;
		});
	}, []);

	return { isVisible, toggleVisibility, isInitialized };
}
