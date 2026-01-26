import Link from "next/link";
import { RecoveryExplanation } from "@/components/recovery/RecoveryExplanation";

export default function RecoveryPage() {
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
							Learn how invisible wallet recovery works to keep your funds secure
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

				{/* Recovery Explanation Component */}
				<RecoveryExplanation />
			</div>
		</main>
	);
}
