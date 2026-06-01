import { Skeleton } from "@/components/ui/Skeleton";

export function WalletTableSkeleton({ rows = 5 }: { rows?: number }) {
	return (
		<div className="rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
			<div className="overflow-x-auto">
				<table className="w-full">
					<thead>
						<tr className="border-b border-zinc-200 dark:border-zinc-800">
							{[
								"Address",
								"Network",
								"Status",
								"Balance",
								"Created",
								"Last Activity",
							].map((col) => (
								<th
									key={col}
									className="px-4 py-3 text-left text-sm font-medium text-zinc-500"
								>
									{col}
								</th>
							))}
						</tr>
					</thead>
					<tbody>
						{Array.from({ length: rows }).map((_, i) => (
							<tr
								key={i}
								className="border-b border-zinc-100 dark:border-zinc-800/50"
							>
								<td className="px-4 py-3">
									<Skeleton className="h-6 w-36" />
								</td>
								<td className="px-4 py-3">
									<Skeleton className="h-5 w-16 rounded-full" />
								</td>
								<td className="px-4 py-3">
									<Skeleton className="h-5 w-16 rounded-full" />
								</td>
								<td className="px-4 py-3">
									<Skeleton className="h-5 w-24" />
								</td>
								<td className="px-4 py-3">
									<Skeleton className="h-5 w-24" />
								</td>
								<td className="px-4 py-3">
									<Skeleton className="h-5 w-24" />
								</td>
							</tr>
						))}
					</tbody>
				</table>
			</div>
		</div>
	);
}
