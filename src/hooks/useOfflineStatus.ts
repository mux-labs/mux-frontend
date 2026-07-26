/**
 * Hook to detect whether the browser is currently offline.
 * Subscribes to the native `online` / `offline` window events
 * so any component that consumes it re-renders automatically on
 * connectivity changes.
 */
import { useEffect, useState } from "react";

/**
 * Returns `true` when the browser reports no network connectivity.
 *
 * @example
 * ```tsx
 * const isOffline = useOfflineStatus();
 * if (isOffline) return <OfflineBanner />;
 * ```
 */
export function useOfflineStatus(): boolean {
	const [isOffline, setIsOffline] = useState<boolean>(
		typeof navigator !== "undefined" ? !navigator.onLine : false,
	);

	useEffect(() => {
		const handleOffline = () => setIsOffline(true);
		const handleOnline = () => setIsOffline(false);

		window.addEventListener("offline", handleOffline);
		window.addEventListener("online", handleOnline);

		return () => {
			window.removeEventListener("offline", handleOffline);
			window.removeEventListener("online", handleOnline);
		};
	}, []);

	return isOffline;
}
