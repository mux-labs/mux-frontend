"use client";

import { SearchX } from "lucide-react";
import Link from "next/link";
import { ErrorState } from "@/components/ui/ErrorState";

interface WalletNotFoundProps {
	/** The wallet id that could not be resolved, shown for debugging/support. */
	walletId?: string;
	/** Where the "back" link should point. Defaults to the wallets dashboard. */
	backHref?: string;
	/** Label for the back link. */
	backLabel?: string;
}

/**
 * Dedicated "not found" state for a wallet lookup by id.
 *
 * Reuses `ErrorState` for consistent visual language across the app while
 * adding wallet-specific context (the id that failed to resolve) and a
 * clear path back into the dashboard, since a bare error message leaves
 * the user stuck on a dead-end page.
 */
export function WalletNotFound({
	walletId,
	backHref = "/dashboard/wallets",
	backLabel = "Back to wallets",
}: WalletNotFoundProps) {
	return (
		<div role="status" aria-live="polite">
			<ErrorState
				icon={<SearchX className="h-10 w-10 text-red-600 dark:text-red-500" aria-hidden="true" />}
				title="Wallet not found"
				description={
					walletId
						? `No wallet exists for id "${walletId}". It may have been removed, or the link you followed is invalid.`
						: "No wallet exists for this ID. It may have been removed or the link is invalid."
				}
			/>
			<div className="mt-4 flex justify-center">
				<Link
					href={backHref}
					className="text-sm font-medium text-blue-700 hover:underline dark:text-blue-400"
				>
					← {backLabel}
				</Link>
			</div>
		</div>
	);
}
