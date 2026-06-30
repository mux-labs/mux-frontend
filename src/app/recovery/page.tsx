"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { InitiateRecoveryCTA } from "@/components/recovery/InitiateRecoveryCTA";
import { RecoveryExplanation } from "@/components/recovery/RecoveryExplanation";
import { RecoveryFAQ } from "@/components/recovery/RecoveryFAQ";
import { RecoveryLoadingState } from "@/components/recovery/RecoveryLoadingState";
import { Toast } from "@/components/ui/toast";
import { useRecovery } from "@/hooks/useRecovery";

export default function RecoveryPage() {
	const recovery = useRecovery();
	const [toast, setToast] = useState<{
		open: boolean;
		message: string;
		variant: "success" | "error";
	}>({ open: false, message: "", variant: "success" });

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

	return (
		<main className="min-h-screen bg-zinc-50 dark:bg-black p-6 md:p-12">
			<div className="max-w-5xl mx-auto space-y-8">
				{/* Header */}
				<header className="flex items-center justify-between">
					<div>
						<h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
							Wallet Recovery
						</h1>
						<p className="text-zinc-500 dark:text-zinc-400 mt-1">
							Learn how invisible wallet recovery works to keep your funds
							secure
						</p>
					</div>
					<div className="flex gap-3">
						<Link
							href="/"
							className="px-4 py-2 text-sm font-medium text-zinc-600 bg-white border border-zinc-200 rounded-lg shadow-xs hover:bg-zinc-50 transition-colors dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
						>
							Back to Dashboard
						</Link>
					</div>
				</header>

				{/* Loading skeleton while initial status is fetched */}
				{recovery.state === "loading" ? (
					<RecoveryLoadingState />
				) : (
					<>
						{/* Initiate Recovery CTA (handles idle, confirming, pending, success, and error states) */}
						<InitiateRecoveryCTA recovery={recovery} />

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
