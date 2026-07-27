"use client";

import { useState } from "react";
import type { AssetData } from "@/mock-data/analytics";
import { CopyButton } from "./CopyButton";
import { Toast } from "@/components/ui/toast";

interface TopAssetsTableProps {
	assets: AssetData[];
}

export function TopAssetsTable({ assets }: TopAssetsTableProps) {
	const [toastMessage, setToastMessage] = useState<string | null>(null);

	const handleCopySuccess = (text: string, type: string) => {
		setToastMessage(`Copied ${type}: ${text}`);
		setTimeout(() => setToastMessage(null), 3000);
	};

	return (
		<>
			<div className="rounded-xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
				<div className="border-b border-zinc-200 px-4 py-4 sm:px-6 dark:border-zinc-800">
					<h3
						id="top-assets-table-heading"
						className="text-base font-semibold text-zinc-900 sm:text-lg dark:text-zinc-50"
					>
						Top Assets by Volume
					</h3>
					<p className="mt-0.5 text-sm text-zinc-500 dark:text-zinc-400">
						Highest traded assets on the platform
					</p>
				</div>

				<div className="overflow-x-auto">
					<table
						aria-labelledby="top-assets-table-heading"
						className="w-full min-w-[480px] text-sm"
					>
						<thead>
							<tr className="border-b border-zinc-100 dark:border-zinc-800">
								<th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-500 sm:px-6 dark:text-zinc-400">
									#
								</th>
								<th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-500 sm:px-6 dark:text-zinc-400">
									Asset
								</th>
								<th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-zinc-500 sm:px-6 dark:text-zinc-400">
									Volume
								</th>
								<th className="hidden px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-zinc-500 sm:table-cell sm:px-6 dark:text-zinc-400">
									Change
								</th>
								<th className="hidden px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-zinc-500 md:table-cell md:px-6 dark:text-zinc-400">
									TVL
								</th>
								<th className="hidden px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-zinc-500 md:table-cell md:px-6 dark:text-zinc-400">
									Transactions
								</th>
							</tr>
						</thead>
						<tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
							{assets.map((asset) => (
								<tr
									key={asset.rank}
									className="group transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
								>
									<td className="px-4 py-4 text-zinc-500 sm:px-6 dark:text-zinc-400">
										{asset.rank}
									</td>
									<td className="px-4 py-4 sm:px-6">
										<div className="flex items-center gap-2 sm:gap-3">
											<div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-blue-700 sm:h-8 sm:w-8 dark:bg-blue-900/50 dark:text-blue-300">
												{asset.symbol.charAt(0)}
											</div>
											<div className="flex min-w-0 items-center gap-1">
												<div>
													<p className="truncate font-medium text-zinc-900 dark:text-zinc-50">
														{asset.name}
													</p>
													<p className="text-xs text-zinc-500 dark:text-zinc-400">
														{asset.symbol}
													</p>
												</div>
												<div className="opacity-0 transition-opacity group-hover:opacity-100">
													<CopyButton
														text={asset.symbol}
														label={`Copy ${asset.symbol} symbol`}
														onCopySuccess={(text) =>
															handleCopySuccess(text, "symbol")
														}
													/>
												</div>
											</div>
										</div>
									</td>
									<td className="px-4 py-4 text-right sm:px-6">
										<div className="flex items-center justify-end gap-1">
											<span className="font-medium text-zinc-900 dark:text-zinc-50">
												{asset.volume}
											</span>
											<div className="opacity-0 transition-opacity group-hover:opacity-100">
												<CopyButton
													text={asset.volume}
													label={`Copy ${asset.symbol} volume`}
													onCopySuccess={(text) =>
														handleCopySuccess(text, "volume")
													}
												/>
											</div>
										</div>
									</td>
									<td className="hidden px-4 py-4 text-right sm:table-cell sm:px-6">
										<span
											className={`inline-flex items-center gap-0.5 text-sm font-medium ${
												asset.volumeChange >= 0
													? "text-emerald-600 dark:text-emerald-400"
													: "text-red-600 dark:text-red-400"
											}`}
										>
											<svg
												className="h-3 w-3"
												fill="none"
												viewBox="0 0 24 24"
												stroke="currentColor"
												strokeWidth={2}
											>
												{asset.volumeChange >= 0 ? (
													<path
														strokeLinecap="round"
														strokeLinejoin="round"
														d="M5 15l7-7 7 7"
													/>
												) : (
													<path
														strokeLinecap="round"
														strokeLinejoin="round"
														d="M19 9l-7 7-7-7"
													/>
												)}
											</svg>
											{Math.abs(asset.volumeChange)}%
										</span>
									</td>
									<td className="hidden px-4 py-4 text-right md:table-cell md:px-6">
										<div className="flex items-center justify-end gap-1">
											<span className="text-zinc-900 dark:text-zinc-50">
												{asset.tvl}
											</span>
											<div className="opacity-0 transition-opacity group-hover:opacity-100">
												<CopyButton
													text={asset.tvl}
													label={`Copy ${asset.symbol} TVL`}
													onCopySuccess={(text) =>
														handleCopySuccess(text, "TVL")
													}
												/>
											</div>
										</div>
									</td>
									<td className="hidden px-4 py-4 text-right text-zinc-900 md:table-cell md:px-6 dark:text-zinc-50">
										{asset.txCount.toLocaleString()}
									</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>
			</div>
			{toastMessage && (
				<Toast
					open={!!toastMessage}
					message={toastMessage}
					variant="success"
					onClose={() => setToastMessage(null)}
				/>
			)}
		</>
	);
}
