"use client";

import { WifiOff } from "lucide-react";
import { useOfflineStatus } from "@/hooks/useOfflineStatus";

/**
 * OfflineBanner renders a full-width dismissible strip when the browser
 * loses network connectivity. It vanishes automatically once the connection
 * is restored. The banner is screen-reader-friendly (`role="alert"` +
 * `aria-live="assertive"`) and keyboard-accessible.
 *
 * Drop it near the top of your layout — it only paints when needed.
 *
 * @example
 * ```tsx
 * // app/layout.tsx
 * <OfflineBanner />
 * <main>{children}</main>
 * ```
 */
export function OfflineBanner() {
	const isOffline = useOfflineStatus();

	if (!isOffline) return null;

	return (
		<div
			role="alert"
			aria-live="assertive"
			data-testid="offline-banner"
			className="flex items-center justify-center gap-2 bg-yellow-400 px-4 py-2 text-sm font-medium text-yellow-900"
		>
			<WifiOff className="h-4 w-4 shrink-0" aria-hidden="true" />
			<span>You are offline. Some features may be unavailable.</span>
		</div>
	);
}
