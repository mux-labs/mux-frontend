"use client";

import { AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

export interface NetworkMismatchBannerProps {
	/** Network the UI is currently configured for */
	uiNetwork: "testnet" | "mainnet";
	/** Network the backend/API is actually responding on */
	backendNetwork: "testnet" | "mainnet";
	className?: string;
}

/**
 * Warns the user when the UI's selected network and the backend's active
 * network disagree, so they don't act on data from the wrong network.
 */
export function NetworkMismatchBanner({
	uiNetwork,
	backendNetwork,
	className,
}: NetworkMismatchBannerProps) {
	if (uiNetwork === backendNetwork) return null;

	return (
		<div
			role="alert"
			data-testid="network-mismatch-banner"
			className={cn(
				"flex items-center gap-2 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive",
				className,
			)}
		>
			<AlertTriangle className="size-4 shrink-0" aria-hidden="true" />
			<span>
				Network mismatch: the console is set to{" "}
				<strong>{uiNetwork}</strong> but the backend is responding on{" "}
				<strong>{backendNetwork}</strong>. Data shown may be inaccurate.
			</span>
		</div>
	);
}
