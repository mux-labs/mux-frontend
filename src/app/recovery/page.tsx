"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { InitiateRecoveryCTA } from "@/components/recovery/InitiateRecoveryCTA";
import { RecoveryDocsLink } from "@/components/recovery/RecoveryDocsLink";
import { RecoveryEmptyState } from "@/components/recovery/RecoveryEmptyState";
import { RecoveryErrorState } from "@/components/recovery/RecoveryErrorState";
import { RecoveryExplanation } from "@/components/recovery/RecoveryExplanation";
import { RecoveryFAQ } from "@/components/recovery/RecoveryFAQ";
import { RecoveryLoadingState } from "@/components/recovery/RecoveryLoadingState";
import { RecoveryTimelineList } from "@/components/recovery/RecoveryTimelineList";
import { Toast } from "@/components/ui/toast";
import { useRecovery } from "@/hooks/useRecovery";
import { useRecoveryTimeline } from "@/hooks/useRecoveryTimeline";
import { useWallets } from "@/hooks/useWallets";
import { mockRecoveryTimelineCompleted } from "@/mock-data/recovery";
import { trackRecoveryEvent } from "@/services/recoveryAnalyticsTracking";

export default function RecoveryPage() {
	// Drive recovery status/timeline off the first available real wallet. When
	// no wallet is available (e.g. no auth session yet) we fall back to demo
	// mode inside useRecovery(null), which is explicitly a stub bootstrap.
	const { wallets } = useWallets();
	const walletId = wallets[0]?.id ?? null;
	const recovery = useRecovery(walletId);

	// #456/#601 – recovery timeline list: sourced from the real
	// fetchRecoveryStatus endpoint (via useRecovery -> useRecoveryStatus) when
	// a wallet is available. mockRecoveryTimelineCompleted is only used as an
	// explicit demo-mode placeholder before the real timeline has loaded or
	// when there is no wallet to fetch a timeline for.
	const { timeline, updateTimeline } = useRecoveryTimeline(
		recovery.timeline ?? mockRecoveryTimelineCompleted,
	);

	useEffect(() => {
		if (recovery.timeline) {
			updateTimeline(recovery.timeline);
		}
	}, [recovery.timeline, updateTimeline]);

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
						{/* #460 – standalone docs link in the page header so developers can
						    jump straight to external recovery documentation without having
						    to scroll down to the FAQ section */}
						<RecoveryDocsLink />
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

						{/* #456 – recovery timeline list: shows the sequence of events for
						    the most recent (or active) recovery operation so developers can
						    track progress without leaving the dashboard */}
						{timeline.events.length > 0 && (
							<section
								aria-labelledby="recovery-timeline-heading"
								className="rounded-xl border border-zinc-200 bg-white p-4 sm:p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950"
							>
								<h2
									id="recovery-timeline-heading"
									className="text-lg font-semibold text-zinc-900 dark:text-zinc-50 mb-4"
								>
									Recovery Timeline
								</h2>
								<RecoveryTimelineList events={timeline.events} />
							</section>
						)}

						{/* Recovery Explanation Component */}
						<RecoveryExplanation />

						{/* #458 – FAQ section: answers common developer questions about the
						    invisible wallet recovery mechanism. Includes a RecoveryDocsLink
						    at the bottom for further reading */}
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
