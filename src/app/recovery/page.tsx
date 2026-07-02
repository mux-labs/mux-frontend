"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { InitiateRecoveryCTA } from "@/components/recovery/InitiateRecoveryCTA";
import { RecoveryEmptyState } from "@/components/recovery/RecoveryEmptyState";
import { RecoveryErrorState } from "@/components/recovery/RecoveryErrorState";
import { RecoveryExplanation } from "@/components/recovery/RecoveryExplanation";
import { RecoveryFAQ } from "@/components/recovery/RecoveryFAQ";
import { RecoveryLoadingState } from "@/components/recovery/RecoveryLoadingState";
import { Toast } from "@/components/ui/toast";
import { useRecovery } from "@/hooks/useRecovery";
import { trackRecoveryEvent } from "@/services/recoveryAnalyticsTracking";

export default function RecoveryPage() {
	const recovery = useRecovery();

	// Track whether recovery has ever successfully exited the loading phase so
	// we can distinguish a bootstrap error (loading → error) from an action
	// error (idle → … → error).
	const [hasReachedIdle, setHasReachedIdle] = useState(false);

	useEffect(() => {
		if (recovery.state === "idle") setHasReachedIdle(true);
	}, [recovery.state]);

	const [toast, setToast] = useState<{
		open: boolean;
		message: string;
		variant: "success" | "error";
	}>({ open: false, message: "", variant: "success" });

	// Track page view on mount (#323)
	useEffect(() => {
		trackRecoveryEvent("recovery_view");
	}, []);

	useEffect(() => {
		if (recovery.state === "success") {
			setToast({
				open: true,
				message: "Recovery request submitted successfully.",
				variant: "success",
			});
		} else if (recovery.state === "error" && recovery.errorMessage) {
			setToast({
				open: true,
				message: recovery.errorMessage,
				variant: "error",
			});
		}
	}, [recovery.state, recovery.errorMessage]);

	// Auto-dismiss toast after 4 seconds
	useEffect(() => {
		if (!toast.open) return;
		const timer = setTimeout(
			() => setToast((t) => ({ ...t, open: false })),
			4000,
		);
		return () => clearTimeout(timer);
	}, [toast.open]);

	// A bootstrap error happens when the page never successfully loaded — i.e.
	// the initial fetch failed before we ever reached "idle".
	const isBootstrapError = recovery.state === "error" && !hasReachedIdle;

	return (
		<main className="min-h-screen bg-zinc-50 dark:bg-black p-4 sm:p-6 md:p-12">
			<div className="max-w-5xl mx-auto space-y-6 sm:space-y-8">
				{/* Header */}
				<header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
					<div>
						<h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
							Wallet Recovery
						</h1>
						<p className="text-sm sm:text-base text-zinc-500 dark:text-zinc-400 mt-1">
							Learn how invisible wallet recovery works to keep your funds
							secure
						</p>
					</div>
					<div className="flex shrink-0 gap-3">
						<Link
							href="/"
							className="w-full sm:w-auto text-center px-4 py-2 text-sm font-medium text-zinc-600 bg-white border border-zinc-200 rounded-lg shadow-xs hover:bg-zinc-50 transition-colors dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
						>
							Back to Dashboard
						</Link>
					</div>
				</header>

				{/* Loading skeleton while initial status is fetched */}
				{recovery.state === "loading" ? (
					<RecoveryLoadingState />
				) : isBootstrapError ? (
					/* Full-page error state when the initial load failed */
					<RecoveryErrorState
						description={recovery.errorMessage ?? undefined}
						onRetry={recovery.resetRecovery}
					/>
				) : (
					<>
						{/* Initiate Recovery CTA (handles idle, confirming, pending, success, and action errors) */}
						<InitiateRecoveryCTA recovery={recovery} />

						{/* Empty state shown while no recovery has been initiated */}
						{recovery.state === "idle" && (
							<RecoveryEmptyState onInitiate={recovery.initiateRecovery} />
						)}

						{/* Recovery Explanation Component */}
						<RecoveryExplanation />

						{/* FAQ Section */}
						<RecoveryFAQ />
					</>
				)}
			</div>

			<Toast
				open={toast.open}
				message={toast.message}
				variant={toast.variant}
			/>
		</main>
	);
}
