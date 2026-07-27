import type { ChartDataPoint } from "@/mock-data/analytics";

interface AnalyticsChartProps {
	title: string;
	description?: string;
	data: ChartDataPoint[];
	formatValue?: (value: number) => string;
	/** Shown when data is an empty array. */
	emptyMessage?: string;
}

function SparkBar({
	height,
	label,
	value,
}: {
	height: number;
	label: string;
	value: string;
}) {
	return (
		<div className="flex flex-1 flex-col items-center gap-1.5">
			<div
				className="flex w-full items-end justify-center rounded-t-md bg-gradient-to-t from-zinc-100 to-transparent dark:from-zinc-800/80 dark:to-transparent"
				style={{ height: 120 }}
			>
				<div
					role="img"
					aria-label={`${label}: ${value}`}
					className="w-full max-w-[32px] rounded-t-md bg-blue-500 transition-all duration-500 hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-500"
					style={{ height: `${height}%` }}
				/>
			</div>
			<span className="text-xs text-zinc-500 dark:text-zinc-400">{label}</span>
		</div>
	);
}

export function AnalyticsChart({
	title,
	description,
	data,
	formatValue = (v) => v.toLocaleString(),
	emptyMessage = "No data for this period",
}: AnalyticsChartProps) {
	const max = data.length > 0 ? Math.max(...data.map((d) => d.value)) : 0;

	return (
		<div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-700 dark:bg-zinc-900 dark:shadow-zinc-950/20">
			<div className="mb-6">
				<h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
					{title}
				</h3>
				{description && (
					<p className="mt-0.5 text-sm text-zinc-500 dark:text-zinc-400">
						{description}
					</p>
				)}
			</div>

			{data.length === 0 ? (
				<div
					className="flex items-center justify-center"
					style={{ height: 120 }}
				>
					<p className="text-sm text-zinc-400 dark:text-zinc-500">
						{emptyMessage}
					</p>
				</div>
			) : (
				<>
					<div className="flex items-end gap-1 rounded-lg border border-zinc-100 bg-zinc-50/60 p-3 sm:gap-2 dark:border-zinc-800 dark:bg-zinc-950/30">
						{data.map((point) => (
							<SparkBar
								key={point.date}
								label={point.date}
								value={formatValue(point.value)}
								height={max > 0 ? (point.value / max) * 100 : 0}
							/>
						))}
					</div>

					<div className="mt-4 flex items-center justify-between border-t border-zinc-100 pt-3 text-sm text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
						<span>
							Total: {formatValue(data.reduce((a, b) => a + b.value, 0))}
						</span>
						<span>
							Avg:{" "}
							{formatValue(
								Math.round(data.reduce((a, b) => a + b.value, 0) / data.length),
							)}
						</span>
					</div>
				</>
			)}
		</div>
	);
}
