"use client";

import { CheckCircle, Download, Loader2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ExportFormat, ExportStatus } from "@/types/analytics";

interface AnalyticsExportButtonProps {
	/** Current export status from `useAnalyticsExport`. */
	status: ExportStatus;
	/** Human-readable error message (shown when status is "error"). */
	errorMessage: string | null;
	/** Called when the user selects a format to export. */
	onExport: (format: ExportFormat) => void;
	/** Called when the user dismisses an error. */
	onReset: () => void;
	/** Number of rows that will be exported — shown in the button label. */
	rowCount: number;
}

/**
 * Export control for the analytics dashboard.
 *
 * Renders a split-button group (CSV / JSON) that reflects the current export
 * state: idle, exporting (spinner), success (checkmark), or error (inline
 * message with a dismiss action).
 */
export function AnalyticsExportButton({
	status,
	errorMessage,
	onExport,
	onReset,
	rowCount,
}: AnalyticsExportButtonProps) {
	const isExporting = status === "exporting";
	const isSuccess = status === "success";
	const isError = status === "error";
	const isDisabled = isExporting || rowCount === 0;

	return (
		<div className="flex flex-col items-end gap-2">
			<div
				className="flex items-center gap-2"
				role="group"
				aria-label="Export analytics data"
			>
				{/* Status icon */}
				{isExporting && (
					<Loader2
						className="h-4 w-4 animate-spin text-slate-400 motion-reduce:animate-none"
						aria-hidden="true"
					/>
				)}
				{isSuccess && (
					<CheckCircle
						className="h-4 w-4 text-emerald-500"
						aria-label="Export successful"
					/>
				)}
				{isError && (
					<XCircle
						className="h-4 w-4 text-rose-500"
						aria-label="Export failed"
					/>
				)}

				{/* CSV button */}
				<Button
					variant="outline"
					size="sm"
					disabled={isDisabled}
					onClick={() => onExport("csv")}
					aria-label={`Export ${rowCount} transaction${rowCount !== 1 ? "s" : ""} as CSV`}
				>
					<Download className="h-3.5 w-3.5" aria-hidden="true" />
					CSV
				</Button>

				{/* JSON button */}
				<Button
					variant="outline"
					size="sm"
					disabled={isDisabled}
					onClick={() => onExport("json")}
					aria-label={`Export ${rowCount} transaction${rowCount !== 1 ? "s" : ""} as JSON`}
				>
					<Download className="h-3.5 w-3.5" aria-hidden="true" />
					JSON
				</Button>
			</div>

			{/* Inline error feedback */}
			{isError && errorMessage && (
				<div
					role="alert"
					className="flex items-center gap-2 text-xs text-rose-600"
				>
					<span>{errorMessage}</span>
					<button
						type="button"
						onClick={onReset}
						className="underline hover:no-underline focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-400 rounded"
						aria-label="Dismiss export error"
					>
						Dismiss
					</button>
				</div>
			)}

			{/* Row count hint */}
			{!isError && rowCount > 0 && (
				<p className="text-xs text-slate-400" aria-live="polite">
					{rowCount} row{rowCount !== 1 ? "s" : ""} will be exported
				</p>
			)}

			{/* Empty-state hint */}
			{!isError && rowCount === 0 && (
				<p className="text-xs text-slate-400" aria-live="polite">
					No data to export
				</p>
			)}
		</div>
	);
}
