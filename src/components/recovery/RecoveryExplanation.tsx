import { RecoveryStatus } from "./RecoveryStatus";

export function RecoveryExplanation() {
	return (
		<div className="space-y-8">
			{/* Status Placeholder Section */}
			<section className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
				<div className="flex items-center justify-between">
					<div className="flex items-center gap-3">
						<div className="p-2 bg-zinc-100 dark:bg-zinc-800 rounded-full">
							<svg
								xmlns="http://www.w3.org/2000/svg"
								fill="none"
								viewBox="0 0 24 24"
								strokeWidth={2}
								stroke="currentColor"
								className="w-5 h-5 text-zinc-600 dark:text-zinc-400"
							>
								<path
									strokeLinecap="round"
									strokeLinejoin="round"
									d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z"
								/>
							</svg>
						</div>
						<div>
							<h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
								Recovery System Status
							</h3>
							<p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
								Current status of the invisible wallet recovery system
							</p>
						</div>
					</div>
					<RecoveryStatus status="active" />
				</div>
			</section>

			{/* Recovery Explanation Section */}
			<section className="rounded-xl border border-zinc-200 bg-white p-8 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
				<div className="space-y-6">
					<div>
						<h2 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50 mb-2">
							What is Invisible Wallet Recovery?
						</h2>
						<p className="text-base text-zinc-600 dark:text-zinc-400 leading-relaxed">
							Invisible Wallet Recovery is an automatic system that ensures your
							wallet remains accessible even if you lose access to your device or
							account. Unlike traditional wallets that require seed phrases or
							private keys, Mux&apos;s invisible recovery system works seamlessly in the
							background without requiring any action from you.
						</p>
					</div>

					<div className="border-t border-zinc-200 dark:border-zinc-800 pt-6">
						<h3 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50 mb-4">
							How It Works
						</h3>
						<div className="space-y-4">
							<div className="flex gap-4">
								<div className="flex-shrink-0">
									<div className="flex h-8 w-8 items-center justify-center rounded-full bg-zinc-100 dark:bg-zinc-800 text-sm font-semibold text-zinc-700 dark:text-zinc-300">
										1
									</div>
								</div>
								<div>
									<h4 className="font-medium text-zinc-900 dark:text-zinc-50 mb-1">
										Automatic Detection
									</h4>
									<p className="text-sm text-zinc-600 dark:text-zinc-400">
										The system continuously monitors your wallet&apos;s health and
										automatically detects when recovery is needed.
									</p>
								</div>
							</div>

							<div className="flex gap-4">
								<div className="flex-shrink-0">
									<div className="flex h-8 w-8 items-center justify-center rounded-full bg-zinc-100 dark:bg-zinc-800 text-sm font-semibold text-zinc-700 dark:text-zinc-300">
										2
									</div>
								</div>
								<div>
									<h4 className="font-medium text-zinc-900 dark:text-zinc-50 mb-1">
										Secure Recovery Process
									</h4>
									<p className="text-sm text-zinc-600 dark:text-zinc-400">
										When recovery is triggered, the system uses secure,
										encrypted methods to restore wallet access without exposing
										your private keys or sensitive information.
									</p>
								</div>
							</div>

							<div className="flex gap-4">
								<div className="flex-shrink-0">
									<div className="flex h-8 w-8 items-center justify-center rounded-full bg-zinc-100 dark:bg-zinc-800 text-sm font-semibold text-zinc-700 dark:text-zinc-300">
										3
									</div>
								</div>
								<div>
									<h4 className="font-medium text-zinc-900 dark:text-zinc-50 mb-1">
										Seamless Restoration
									</h4>
									<p className="text-sm text-zinc-600 dark:text-zinc-400">
										Your wallet is automatically restored and ready to use. You
										can continue using your wallet normally without any
										interruption to your workflow.
									</p>
								</div>
							</div>
						</div>
					</div>

					<div className="border-t border-zinc-200 dark:border-zinc-800 pt-6">
						<h3 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50 mb-4">
							When Recovery Occurs
						</h3>
						<ul className="space-y-2 text-sm text-zinc-600 dark:text-zinc-400">
							<li className="flex items-start gap-2">
								<span className="text-zinc-400 dark:text-zinc-500 mt-1">•</span>
								<span>
									<strong className="text-zinc-900 dark:text-zinc-50">
										Device loss or damage:
									</strong>{" "}
									If you lose access to your device, recovery automatically
									restores your wallet on a new device.
								</span>
							</li>
							<li className="flex items-start gap-2">
								<span className="text-zinc-400 dark:text-zinc-500 mt-1">•</span>
								<span>
									<strong className="text-zinc-900 dark:text-zinc-50">
										Account access issues:
									</strong>{" "}
									When authentication problems are detected, the system initiates
									recovery to maintain wallet accessibility.
								</span>
							</li>
							<li className="flex items-start gap-2">
								<span className="text-zinc-400 dark:text-zinc-500 mt-1">•</span>
								<span>
									<strong className="text-zinc-900 dark:text-zinc-50">
										Network connectivity problems:
									</strong>{" "}
									The system ensures wallet availability even during network
									interruptions.
								</span>
							</li>
							<li className="flex items-start gap-2">
								<span className="text-zinc-400 dark:text-zinc-500 mt-1">•</span>
								<span>
									<strong className="text-zinc-900 dark:text-zinc-50">
										Proactive maintenance:
									</strong>{" "}
									The system performs periodic checks and recovery operations to
									prevent potential issues before they occur.
								</span>
							</li>
						</ul>
					</div>
				</div>
			</section>

			{/* Warning Messaging Section */}
			<section className="bg-amber-50 border border-amber-200 rounded-xl p-6 flex items-start gap-4 shadow-sm dark:bg-amber-900/10 dark:border-amber-800">
				<div className="p-2 bg-amber-100 dark:bg-amber-900/20 rounded-full text-amber-600 dark:text-amber-400 shrink-0">
					<svg
						xmlns="http://www.w3.org/2000/svg"
						fill="none"
						viewBox="0 0 24 24"
						strokeWidth={2}
						stroke="currentColor"
						className="w-5 h-5"
					>
						<path
							strokeLinecap="round"
							strokeLinejoin="round"
							d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z"
						/>
					</svg>
				</div>
				<div className="flex-1 space-y-3">
					<h3 className="font-semibold text-amber-900 dark:text-amber-200">
						Important Information
					</h3>
					<div className="space-y-2 text-sm text-amber-800 dark:text-amber-300">
						<p>
							<strong>Recovery is automatic:</strong> You don&apos;t need to take any
							action. The recovery system works in the background and handles
							everything for you.
						</p>
						<p>
							<strong>Recovery timeframes:</strong> Most recovery operations
							complete within minutes, but complex scenarios may take up to 24
							hours. Your funds remain secure throughout the process.
						</p>
						<p>
							<strong>What recovery does NOT cover:</strong> Recovery cannot
							restore funds that were sent to incorrect addresses or lost due to
							user error. Always verify transaction details before confirming.
						</p>
						<p>
							<strong>Contact support:</strong> If you experience issues accessing
							your wallet after 24 hours, or if you notice any suspicious activity,
							please contact our support team immediately.
						</p>
					</div>
				</div>
			</section>

			{/* Trust-Building Section */}
			<section className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
				<div className="space-y-4">
					<h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
						Security & Transparency
					</h3>
					<div className="grid gap-4 md:grid-cols-2">
						<div className="flex gap-3 items-start">
							<div className="p-2 bg-zinc-100 dark:bg-zinc-800 rounded-lg shrink-0">
								<svg
									xmlns="http://www.w3.org/2000/svg"
									fill="none"
									viewBox="0 0 24 24"
									strokeWidth={2}
									stroke="currentColor"
									className="w-5 h-5 text-zinc-600 dark:text-zinc-400"
								>
									<path
										strokeLinecap="round"
										strokeLinejoin="round"
										d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z"
									/>
								</svg>
							</div>
							<div>
								<h4 className="font-medium text-zinc-900 dark:text-zinc-50 mb-1">
									Encrypted Storage
								</h4>
								<p className="text-sm text-zinc-600 dark:text-zinc-400">
									All recovery data is encrypted and stored securely. Your
									private keys are never exposed or transmitted.
								</p>
							</div>
						</div>

						<div className="flex gap-3 items-start">
							<div className="p-2 bg-zinc-100 dark:bg-zinc-800 rounded-lg shrink-0">
								<svg
									xmlns="http://www.w3.org/2000/svg"
									fill="none"
									viewBox="0 0 24 24"
									strokeWidth={2}
									stroke="currentColor"
									className="w-5 h-5 text-zinc-600 dark:text-zinc-400"
								>
									<path
										strokeLinecap="round"
										strokeLinejoin="round"
										d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z"
									/>
								</svg>
							</div>
							<div>
								<h4 className="font-medium text-zinc-900 dark:text-zinc-50 mb-1">
									Backend Security
								</h4>
								<p className="text-sm text-zinc-600 dark:text-zinc-400">
									Recovery operations are handled by secure backend systems with
									multiple layers of protection and monitoring.
								</p>
							</div>
						</div>

						<div className="flex gap-3 items-start">
							<div className="p-2 bg-zinc-100 dark:bg-zinc-800 rounded-lg shrink-0">
								<svg
									xmlns="http://www.w3.org/2000/svg"
									fill="none"
									viewBox="0 0 24 24"
									strokeWidth={2}
									stroke="currentColor"
									className="w-5 h-5 text-zinc-600 dark:text-zinc-400"
								>
									<path
										strokeLinecap="round"
										strokeLinejoin="round"
										d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z"
									/>
								</svg>
							</div>
							<div>
								<h4 className="font-medium text-zinc-900 dark:text-zinc-50 mb-1">
									Continuous Monitoring
								</h4>
								<p className="text-sm text-zinc-600 dark:text-zinc-400">
									The system continuously monitors wallet health and proactively
									addresses potential issues before they impact you.
								</p>
							</div>
						</div>

						<div className="flex gap-3 items-start">
							<div className="p-2 bg-zinc-100 dark:bg-zinc-800 rounded-lg shrink-0">
								<svg
									xmlns="http://www.w3.org/2000/svg"
									fill="none"
									viewBox="0 0 24 24"
									strokeWidth={2}
									stroke="currentColor"
									className="w-5 h-5 text-zinc-600 dark:text-zinc-400"
								>
									<path
										strokeLinecap="round"
										strokeLinejoin="round"
										d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z"
									/>
								</svg>
							</div>
							<div>
								<h4 className="font-medium text-zinc-900 dark:text-zinc-50 mb-1">
									No Key Exposure
								</h4>
								<p className="text-sm text-zinc-600 dark:text-zinc-400">
									Your private keys never leave secure storage. Recovery uses
									encrypted methods that don&apos;t require key exposure.
								</p>
							</div>
						</div>
					</div>
				</div>
			</section>
		</div>
	);
}
