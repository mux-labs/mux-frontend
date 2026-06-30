import React from "react";
import { Eye, EyeOff, AlertCircle } from "lucide-react";
import { useBalanceVisibility } from "@/hooks/useBalanceVisibility";
import { cn } from "@/lib/utils";

export interface WalletBalanceProps {
	balance: number | string | null | undefined;
	currency?: string;
	isAllowed?: boolean;
	isLoading?: boolean;
	isError?: boolean;
	className?: string;
}

export function WalletBalance({
	balance,
	currency = "USD",
	isAllowed = true,
	isLoading = false,
	isError = false,
	className,
}: WalletBalanceProps) {
	const { isVisible, toggleVisibility, isInitialized } = useBalanceVisibility();

	if (isLoading || !isInitialized) {
		return (
			<div
				className={cn("flex items-center gap-2", className)}
				aria-busy="true"
			>
				<div className="h-7 w-24 bg-zinc-200 dark:bg-zinc-800 animate-pulse rounded" />
			</div>
		);
	}

	if (isError) {
		return (
			<div
				className={cn("flex items-center gap-2 text-red-500", className)}
				role="alert"
			>
				<AlertCircle size={16} />
				<span className="text-sm font-medium">Failed to load balance</span>
			</div>
		);
	}

	const isInvalid =
		balance === null ||
		balance === undefined ||
		balance === "" ||
		Number.isNaN(Number(balance));

	let formattedBalance = "N/A";
	if (!isInvalid) {
		const numBalance = Number(balance);
		formattedBalance = new Intl.NumberFormat("en-US", {
			style: "currency",
			currency,
			minimumFractionDigits: 2,
			maximumFractionDigits: 6,
		}).format(numBalance);
	}

	const maskedBalance = "••••••";

	return (
		<div className={cn("flex items-center gap-2", className)}>
			<span
				className="font-medium text-lg tracking-tight"
				data-testid="balance-display"
			>
				{isInvalid
					? "N/A"
					: isVisible && isAllowed
						? formattedBalance
						: maskedBalance}
			</span>
			{isAllowed && !isInvalid && (
				<button
					type="button"
					onClick={toggleVisibility}
					className="p-1.5 rounded-md text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:text-zinc-100 dark:hover:bg-zinc-800 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
					aria-label={isVisible ? "Hide balance" : "Show balance"}
					aria-pressed={isVisible}
				>
					{isVisible ? (
						<EyeOff size={16} aria-hidden="true" />
					) : (
						<Eye size={16} aria-hidden="true" />
					)}
				</button>
			)}
		</div>
	);
}
