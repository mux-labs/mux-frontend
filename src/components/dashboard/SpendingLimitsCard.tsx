"use client";

import {
	AlertCircle,
	Check,
	Clipboard,
	DollarSign,
	RefreshCw,
	TrendingUp,
	Wallet,
} from "lucide-react";
import type { KeyboardEvent } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { SpendingLimitsResponse } from "@/app/api/spending-limits/route";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/Skeleton";
import { Toast } from "@/components/ui/toast";
import { useCopyToClipboard } from "@/hooks/useCopyToClipboard";

const DEFAULT_DAILY_LIMIT = 5000;
const DEFAULT_TRANSACTION_LIMIT = 1000;
const MIN_LIMIT = 1;
const MAX_LIMIT = 1000000;
const TOAST_RESET_MS = 3000;

type LoadSource = "api" | "default";

interface SpendingLimitsShape {
	dailyLimit: number;
	transactionLimit: number;
}

interface SpendingLimitsCardProps {
	loading?: boolean;
	apiPath?: string;
}

function useInputKeyNav(onSave: () => void) {
	return useCallback(
		(event: KeyboardEvent<HTMLInputElement>) => {
			if (event.key === "Enter") {
				event.preventDefault();
				onSave();
			} else if (event.key === "Escape") {
				event.currentTarget.blur();
			}
		},
		[onSave],
	);
}

function isSpendingLimitsShape(value: unknown): value is SpendingLimitsShape {
	return (
		typeof value === "object" &&
		value !== null &&
		typeof (value as Record<string, unknown>).dailyLimit === "number" &&
		Number.isFinite((value as Record<string, unknown>).dailyLimit) &&
		typeof (value as Record<string, unknown>).transactionLimit === "number" &&
		Number.isFinite((value as Record<string, unknown>).transactionLimit)
	);
}

function isSpendingLimitsResponse(
	value: unknown,
): value is SpendingLimitsResponse {
	return (
		typeof value === "object" &&
		value !== null &&
		typeof (value as Record<string, unknown>).limits === "object" &&
		(value as Record<string, unknown>).limits !== null &&
		typeof (value as Record<string, unknown>).todayUsage === "number" &&
		Number.isFinite((value as Record<string, unknown>).todayUsage) &&
		isSpendingLimitsShape((value as Record<string, unknown>).limits)
	);
}

function validateLimit(value: string): string | null {
	if (value.trim() === "") return "This field is required.";
	const parsed = Number(value);
	if (!Number.isFinite(parsed)) return "Please enter a valid number.";
	if (parsed < MIN_LIMIT) return `Minimum is $${MIN_LIMIT}.`;
	if (parsed > MAX_LIMIT) return `Maximum is $${MAX_LIMIT.toLocaleString()}.`;
	return null;
}

function resolveLoadMessage(source: LoadSource, message: string): string {
	if (source === "default") {
		return `${message} Using default limits.`;
	}
	return message;
}

function CopyLimitButton({ value, label }: { value: string; label: string }) {
	const { copy, copied, error } = useCopyToClipboard(1500);

	const handleCopy = useCallback(() => {
		void copy(value);
	}, [copy, value]);

	const title = error ? error : copied ? "Copied!" : `Copy ${label}`;

	return (
		<Button
			type="button"
			variant="ghost"
			size="icon-sm"
			onClick={handleCopy}
			title={title}
			aria-label={title}
			className="shrink-0 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-50"
		>
			{error ? (
				<AlertCircle className="size-4 text-red-500" aria-hidden="true" />
			) : copied ? (
				<Check className="size-4 text-emerald-500" aria-hidden="true" />
			) : (
				<Clipboard className="size-4" aria-hidden="true" />
			)}
		</Button>
	);
}

export function SpendingLimitsCard({
	loading = false,
	apiPath = "/api/spending-limits",
}: SpendingLimitsCardProps) {
	const [dailyLimit, setDailyLimit] = useState(String(DEFAULT_DAILY_LIMIT));
	const [transactionLimit, setTransactionLimit] = useState(
		String(DEFAULT_TRANSACTION_LIMIT),
	);
	const [todayUsage, setTodayUsage] = useState(0);
	const [dailyError, setDailyError] = useState<string | null>(null);
	const [txError, setTxError] = useState<string | null>(null);
	const [loadError, setLoadError] = useState<string | null>(null);
	const [saveError, setSaveError] = useState<string | null>(null);
	const [isRefreshing, setIsRefreshing] = useState(false);
	const [isSaving, setIsSaving] = useState(false);
	const [toastOpen, setToastOpen] = useState(false);
	const [toastVariant, setToastVariant] = useState<"success" | "error">(
		"success",
	);
	const [toastMessage, setToastMessage] = useState("Spending limits saved.");

	const toastTimeoutRef = useRef<number | null>(null);

	const usageLimit = useMemo(() => {
		const parsed = Number(dailyLimit);
		return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
	}, [dailyLimit]);

	const usagePercentage = Math.min((todayUsage / usageLimit) * 100, 100);
	const canSave = !isSaving && !loading;
	const hasInlineError = loadError || saveError;

	const showToast = useCallback(
		(variant: "success" | "error", message: string) => {
			setToastVariant(variant);
			setToastMessage(message);
			setToastOpen(true);

			if (toastTimeoutRef.current) {
				window.clearTimeout(toastTimeoutRef.current);
			}

			toastTimeoutRef.current = window.setTimeout(() => {
				setToastOpen(false);
			}, TOAST_RESET_MS);
		},
		[],
	);

	const applyResponse = useCallback((response: SpendingLimitsResponse) => {
		setDailyLimit(String(response.limits.dailyLimit));
		setTransactionLimit(String(response.limits.transactionLimit));
		setTodayUsage(response.todayUsage);
	}, []);

	const loadLimits = useCallback(async () => {
		setIsRefreshing(true);
		setLoadError(null);

		try {
			const response = await fetch(apiPath, {
				cache: "no-store",
			});

			if (!response.ok) {
				throw new Error(`Failed to load spending limits (${response.status}).`);
			}

			const data = (await response.json()) as unknown;
			if (!isSpendingLimitsResponse(data)) {
				throw new Error("Received an invalid spending limits payload.");
			}

			applyResponse(data);
		} catch (err) {
			// Spending limits are account state owned by the backend — there is
			// no per-browser cache to fall back to (see #649). Show the error
			// and a clearly-labelled default so the UI still renders.
			const message =
				err instanceof Error ? err.message : "Failed to load spending limits.";
			setLoadError(resolveLoadMessage("default", message));
			setDailyLimit(String(DEFAULT_DAILY_LIMIT));
			setTransactionLimit(String(DEFAULT_TRANSACTION_LIMIT));
			setTodayUsage(0);
		} finally {
			setIsRefreshing(false);
		}
	}, [apiPath, applyResponse]);

	useEffect(() => {
		if (loading) return;
		const timer = window.setTimeout(() => {
			void loadLimits();
		}, 0);

		return () => {
			window.clearTimeout(timer);
			if (toastTimeoutRef.current) {
				window.clearTimeout(toastTimeoutRef.current);
			}
		};
	}, [loading, loadLimits]);

	const handleSave = useCallback(async () => {
		const nextDailyError = validateLimit(dailyLimit);
		const nextTxError = validateLimit(transactionLimit);

		setDailyError(nextDailyError);
		setTxError(nextTxError);
		setLoadError(null);
		setSaveError(null);

		if (nextDailyError || nextTxError) {
			showToast("error", "Fix the highlighted fields before saving.");
			return;
		}

		const payload = {
			dailyLimit: Number(dailyLimit),
			transactionLimit: Number(transactionLimit),
		};

		setIsSaving(true);

		try {
			const response = await fetch(apiPath, {
				method: "PUT",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(payload),
			});

			if (!response.ok) {
				let message = `Failed to save spending limits (${response.status}).`;
				try {
					const body = (await response.json()) as unknown;
					if (
						typeof body === "object" &&
						body !== null &&
						typeof (body as Record<string, unknown>).error === "string"
					) {
						message = (body as Record<string, unknown>).error as string;
					}
				} catch {
					// Ignore JSON parsing issues and use the HTTP error message.
				}

				throw new Error(message);
			}

			const data = (await response.json()) as unknown;
			if (!isSpendingLimitsResponse(data)) {
				throw new Error("Received an invalid spending limits response.");
			}

			applyResponse(data);
			setSaveError(null);
			showToast("success", "Spending limits saved.");
		} catch (err) {
			const message =
				err instanceof Error
					? err.message
					: "Failed to save. Please try again.";
			setSaveError(message);
			showToast("error", message);
		} finally {
			setIsSaving(false);
		}
	}, [apiPath, applyResponse, dailyLimit, showToast, transactionLimit]);

	const handleInputKeyDown = useInputKeyNav(handleSave);

	if (loading) {
		return <SpendingLimitsCardSkeleton />;
	}

	return (
		<>
			<div className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
				<div className="flex flex-col gap-4 border-b border-zinc-200 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-6 dark:border-zinc-800">
					<div className="flex min-w-0 items-start gap-3">
						<div className="rounded-lg bg-zinc-100 p-2 dark:bg-zinc-900">
							<TrendingUp className="size-5 text-zinc-600 dark:text-zinc-400" />
						</div>
						<div className="min-w-0">
							<h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
								Spending Limits
							</h2>
							<p className="text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">
								Control your API expenditure and transaction caps.
							</p>
						</div>
					</div>
					<div className="flex items-center justify-between gap-3 sm:justify-end">
						{isRefreshing ? (
							<span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
								Refreshing...
							</span>
						) : null}
						<Badge
							variant="outline"
							className="border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-400"
						>
							Active
						</Badge>
					</div>
				</div>

				<div className="space-y-6 p-4 sm:space-y-8 sm:p-6">
					<div className="space-y-3">
						<div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
							<div>
								<p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
									Daily Usage
								</p>
								<div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
									<span className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
										${todayUsage}
									</span>
									<span className="text-sm text-zinc-500 dark:text-zinc-400">
										/ ${dailyLimit}
									</span>
								</div>
							</div>
							<span className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
								{usagePercentage.toFixed(1)}%
							</span>
						</div>
						<div className="h-2 w-full overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-900">
							<div
								className="h-full rounded-full bg-blue-600 transition-all duration-500 ease-out motion-reduce:transition-none dark:bg-blue-500"
								style={{ width: `${usagePercentage}%` }}
							/>
						</div>
					</div>

					<div className="grid grid-cols-1 gap-4 md:grid-cols-2 sm:gap-6">
						<div className="space-y-2">
							<div className="flex items-center justify-between gap-3">
								<label
									htmlFor="daily-limit"
									className="flex min-w-0 items-center gap-2 text-sm font-medium text-zinc-700 dark:text-zinc-300"
								>
									<DollarSign className="size-4 shrink-0" />
									<span className="truncate">Daily Spending Limit</span>
								</label>
								<CopyLimitButton value={dailyLimit} label="daily limit" />
							</div>
							<div className="relative">
								<span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400">
									$
								</span>
								<input
									id="daily-limit"
									type="number"
									inputMode="numeric"
									min={MIN_LIMIT}
									max={MAX_LIMIT}
									step={1}
									value={dailyLimit}
									onChange={(event) => {
										setDailyLimit(event.target.value);
										setDailyError(null);
									}}
									onKeyDown={handleInputKeyDown}
									aria-invalid={Boolean(dailyError)}
									aria-describedby={
										dailyError ? "daily-limit-error" : undefined
									}
									className={`w-full rounded-lg border bg-zinc-50 py-2 pl-7 pr-3 text-sm transition-all focus:outline-none focus:ring-2 dark:bg-zinc-900 ${
										dailyError
											? "border-red-400 focus:ring-red-500/20 dark:border-red-500"
											: "border-zinc-200 focus:ring-blue-500/20 dark:border-zinc-800"
									}`}
									placeholder="0"
								/>
							</div>
							{dailyError ? (
								<p
									id="daily-limit-error"
									role="alert"
									className="text-xs text-red-600 dark:text-red-400"
								>
									{dailyError}
								</p>
							) : (
								<p className="text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">
									Maximum amount you can spend per day.
								</p>
							)}
						</div>

						<div className="space-y-2">
							<div className="flex items-center justify-between gap-3">
								<label
									htmlFor="tx-limit"
									className="flex min-w-0 items-center gap-2 text-sm font-medium text-zinc-700 dark:text-zinc-300"
								>
									<Wallet className="size-4 shrink-0" />
									<span className="truncate">Per-Transaction Limit</span>
								</label>
								<CopyLimitButton
									value={transactionLimit}
									label="transaction limit"
								/>
							</div>
							<div className="relative">
								<span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400">
									$
								</span>
								<input
									id="tx-limit"
									type="number"
									inputMode="numeric"
									min={MIN_LIMIT}
									max={MAX_LIMIT}
									step={1}
									value={transactionLimit}
									onChange={(event) => {
										setTransactionLimit(event.target.value);
										setTxError(null);
									}}
									onKeyDown={handleInputKeyDown}
									aria-invalid={Boolean(txError)}
									aria-describedby={txError ? "tx-limit-error" : undefined}
									className={`w-full rounded-lg border bg-zinc-50 py-2 pl-7 pr-3 text-sm transition-all focus:outline-none focus:ring-2 dark:bg-zinc-900 ${
										txError
											? "border-red-400 focus:ring-red-500/20 dark:border-red-500"
											: "border-zinc-200 focus:ring-blue-500/20 dark:border-zinc-800"
									}`}
									placeholder="0"
								/>
							</div>
							{txError ? (
								<p
									id="tx-limit-error"
									role="alert"
									className="text-xs text-red-600 dark:text-red-400"
								>
									{txError}
								</p>
							) : (
								<p className="text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">
									Maximum cap for a single transaction.
								</p>
							)}
						</div>
					</div>

					<div className="flex items-start gap-3 rounded-lg border border-blue-100 bg-blue-50/70 p-4 dark:border-blue-500/10 dark:bg-blue-500/5">
						<AlertCircle className="mt-0.5 size-5 shrink-0 text-blue-600 dark:text-blue-400" />
						<p className="text-xs leading-relaxed text-blue-800 dark:text-blue-300">
							Spending limits are enforced in real time. When a transaction
							exceeds your per-transaction limit, or your daily limit is
							reached, subsequent API calls are blocked until the period resets
							or you raise the limits.
						</p>
					</div>
				</div>

				<div className="flex flex-col gap-3 border-t border-zinc-200 bg-zinc-50 px-4 py-4 sm:flex-row sm:items-end sm:justify-between sm:px-6 dark:border-zinc-800 dark:bg-zinc-900/50">
					<div className="space-y-1">
						{hasInlineError ? (
							<p
								role="alert"
								className="text-xs leading-relaxed text-red-600 dark:text-red-400"
							>
								{saveError ?? loadError}
							</p>
						) : (
							<p className="text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">
								Changes are saved to your Mux account through the
								spending-limits API.
							</p>
						)}
						{loadError ? (
							<Button
								type="button"
								variant="ghost"
								size="sm"
								onClick={() => void loadLimits()}
								disabled={isRefreshing}
								className="px-0 text-xs font-medium text-zinc-700 hover:bg-transparent hover:text-zinc-900 dark:text-zinc-300 dark:hover:text-zinc-50"
							>
								<RefreshCw
									className={`size-4 ${isRefreshing ? "animate-spin motion-reduce:animate-none" : ""}`}
									aria-hidden="true"
								/>
								{isRefreshing ? "Retrying..." : "Retry"}
							</Button>
						) : null}
					</div>
					<Button
						type="button"
						className="w-full rounded-full px-6 sm:w-auto"
						onClick={() => void handleSave()}
						disabled={!canSave}
					>
						{isSaving ? "Saving…" : "Save Settings"}
					</Button>
				</div>
			</div>
			<Toast open={toastOpen} message={toastMessage} variant={toastVariant} />
		</>
	);
}

function SpendingLimitsCardSkeleton() {
	return (
		<div className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
			<div className="flex items-center justify-between border-b border-zinc-200 p-4 sm:p-6 dark:border-zinc-800">
				<div className="flex items-center gap-3">
					<Skeleton className="h-9 w-9 rounded-lg" />
					<div className="space-y-1.5">
						<Skeleton className="h-5 w-36" />
						<Skeleton className="h-4 w-56" />
					</div>
				</div>
				<Skeleton className="h-5 w-14 rounded-full" />
			</div>
			<div className="space-y-6 p-4 sm:space-y-8 sm:p-6">
				<div className="space-y-3">
					<div className="flex items-end justify-between gap-4">
						<div className="space-y-1">
							<Skeleton className="h-4 w-20" />
							<Skeleton className="h-7 w-28" />
						</div>
						<Skeleton className="h-4 w-10" />
					</div>
					<Skeleton className="h-2 w-full rounded-full" />
				</div>
				<div className="grid grid-cols-1 gap-4 md:grid-cols-2 sm:gap-6">
					<div className="space-y-2">
						<Skeleton className="h-4 w-36" />
						<Skeleton className="h-9 w-full rounded-lg" />
						<Skeleton className="h-3 w-48" />
					</div>
					<div className="space-y-2">
						<Skeleton className="h-4 w-36" />
						<Skeleton className="h-9 w-full rounded-lg" />
						<Skeleton className="h-3 w-44" />
					</div>
				</div>
				<Skeleton className="h-16 w-full rounded-lg" />
			</div>
			<div className="flex justify-end border-t border-zinc-200 bg-zinc-50 px-4 py-4 dark:border-zinc-800 dark:bg-zinc-900/50 sm:px-6">
				<Skeleton className="h-9 w-32 rounded-full" />
			</div>
		</div>
	);
}
