"use client";

import {
	ArrowUpDown,
	Check,
	ChevronLeft,
	ChevronRight,
	Copy,
	Download,
	Filter,
	Search,
	X,
} from "lucide-react";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { trackTransactionEvent } from "@/services/analyticsTracking";
import type {
	Transaction,
	TransactionNetwork,
	TransactionStatus,
} from "@/types/transaction";
import { downloadTransactionsCsv } from "@/utils/exportTransactionsTable";

// --- Helpers ---

/** Truncate a Stellar address or hash for display */
function truncate(value: string, start = 6, end = 4): string {
	if (value.length <= start + end + 3) return value;
	return `${value.slice(0, start)}…${value.slice(-end)}`;
}

function formatDate(iso: string): string {
	return new Date(iso).toLocaleString(undefined, {
		month: "short",
		day: "numeric",
		year: "numeric",
		hour: "2-digit",
		minute: "2-digit",
	});
}

// --- Sub-components ---

type SortConfig = {
	key: keyof Transaction;
	direction: "asc" | "desc";
};

const DEFAULT_SORT: SortConfig = { key: "createdAt", direction: "desc" };

const StatusPill = ({ status }: { status: TransactionStatus }) => {
	const styles: Record<TransactionStatus, string> = {
		completed: "bg-emerald-50 text-emerald-700 border-emerald-100",
		pending: "bg-amber-50 text-amber-700 border-amber-100",
		failed: "bg-rose-50 text-rose-700 border-rose-100",
	};
	const dots: Record<TransactionStatus, string> = {
		completed: "bg-emerald-500",
		pending: "bg-amber-500",
		failed: "bg-rose-500",
	};
	return (
		<span
			className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${styles[status]}`}
		>
			<span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${dots[status]}`} />
			{status.charAt(0).toUpperCase() + status.slice(1)}
		</span>
	);
};

const NetworkBadge = ({ network }: { network: TransactionNetwork }) => {
	const styles: Record<TransactionNetwork, string> = {
		mainnet: "bg-indigo-50 text-indigo-700 border-indigo-100",
		testnet: "bg-zinc-100 text-zinc-600 border-zinc-200",
	};
	return (
		<span
			className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${styles[network]}`}
		>
			{network}
		</span>
	);
};

/** Minimal, self-contained copy-to-clipboard icon button used inside table rows. */
const RowCopyButton = ({ text, label }: { text: string; label: string }) => {
	const [copied, setCopied] = useState(false);

	const handleClick = async () => {
		try {
			await navigator.clipboard.writeText(text);
			setCopied(true);
			setTimeout(() => setCopied(false), 2000);
		} catch {
			// Clipboard write failures are non-critical; UI simply won't confirm.
		}
	};

	return (
		<button
			type="button"
			onClick={handleClick}
			aria-label={copied ? "Copied!" : label}
			className="inline-flex items-center justify-center p-0.5 text-slate-400 hover:text-indigo-600 transition-colors"
		>
			{copied ? <Check size={12} aria-hidden /> : <Copy size={12} aria-hidden />}
		</button>
	);
};

// --- Props ---

export interface TransactionsTableProps {
	/** Optional wallet address to scope transactions */
	address?: string;
	/**
	 * Pre-fetched transactions to render. Required — callers must pass real
	 * data (or an empty array) explicitly; this component no longer falls
	 * back to mock data when omitted.
	 */
	transactions?: Transaction[];
	/** Loading state */
	loading?: boolean;
	/** Alias for `loading` */
	isLoading?: boolean;
	/** Error message */
	error?: string | null;
	/** Retry callback for error state */
	onRetry?: () => void;
}

// --- Main Component ---

export default function TransactionsTable({
	address,
	transactions: transactionsProp,
	loading: loadingProp,
	isLoading: isLoadingProp,
	error: errorProp,
	onRetry,
}: TransactionsTableProps = {}) {
	// No implicit mock fallback: an omitted `transactions` prop renders the
	// empty state rather than silently showing mock data. Callers that need
	// real data must fetch it (e.g. via `useTransactions`) and pass it in.
	const transactions = transactionsProp ?? [];
	const loading = loadingProp ?? isLoadingProp ?? false;
	const error = errorProp ?? null;
	const handleRetry = onRetry ?? (() => {});

	const [search, setSearch] = useState("");
	const [statusFilter, setStatusFilter] = useState<"all" | TransactionStatus>(
		"all",
	);
	const [networkFilter, setNetworkFilter] = useState<
		"all" | TransactionNetwork
	>("all");
	const [sortConfig, setSortConfig] = useState<SortConfig>(DEFAULT_SORT);
	const [currentPage, setCurrentPage] = useState(1);
	const itemsPerPage = 5;
	const initialTracked = useRef(false);

	// Track page view on mount
	useEffect(() => {
		if (!initialTracked.current) {
			initialTracked.current = true;
			trackTransactionEvent("transactions_view", {
				address: address ?? "all",
			});
		}
	}, [address]);

	const filteredData = useMemo(() => {
		return transactions.filter((tx) => {
			if (address && tx.from !== address && tx.to !== address) {
				return false;
			}
			const q = search.toLowerCase();
			const matchesSearch =
				tx.hash.toLowerCase().includes(q) ||
				tx.from.toLowerCase().includes(q) ||
				tx.to.toLowerCase().includes(q) ||
				(tx.memo?.toLowerCase().includes(q) ?? false);
			const matchesStatus =
				statusFilter === "all" || tx.status === statusFilter;
			const matchesNetwork =
				networkFilter === "all" || tx.network === networkFilter;
			return matchesSearch && matchesStatus && matchesNetwork;
		});
	}, [transactions, search, statusFilter, networkFilter, address]);

	const sortedData = useMemo(() => {
		return [...filteredData].sort((a, b) => {
			const aVal = a[sortConfig.key] ?? "";
			const bVal = b[sortConfig.key] ?? "";
			if (aVal < bVal) return sortConfig.direction === "asc" ? -1 : 1;
			if (aVal > bVal) return sortConfig.direction === "asc" ? 1 : -1;
			return 0;
		});
	}, [filteredData, sortConfig]);

	const totalPages = Math.max(1, Math.ceil(sortedData.length / itemsPerPage));
	const currentData = sortedData.slice(
		(currentPage - 1) * itemsPerPage,
		currentPage * itemsPerPage,
	);

	const handleSort = (key: keyof Transaction) => {
		setSortConfig((prev) => {
			const newConfig =
				prev?.key === key && prev.direction === "asc"
					? { key, direction: "desc" as const }
					: { key, direction: "asc" as const };
			trackTransactionEvent("transactions_sort", {
				key,
				direction: newConfig.direction,
			});
			return newConfig;
		});
	};

	const handleSortKeyDown = (
		e: React.KeyboardEvent,
		key: keyof Transaction,
	) => {
		if (e.key === "Enter" || e.key === " ") {
			e.preventDefault();
			handleSort(key);
		}
	};

	const handlePageChange = (page: number) => {
		if (page >= 1 && page <= totalPages) {
			setCurrentPage(page);
			trackTransactionEvent("transactions_page_change", { page });
		}
	};

	const clearFilters = () => {
		setSearch("");
		setStatusFilter("all");
		setNetworkFilter("all");
		setSortConfig(DEFAULT_SORT);
		setCurrentPage(1);
		trackTransactionEvent("transactions_filters_cleared", {});
	};

	const handleFilterChange = (type: "status" | "network", value: string) => {
		trackTransactionEvent("transactions_filter_changed", { type, value });
	};

	const handleExportCsv = () => {
		if (sortedData.length === 0) return;
		downloadTransactionsCsv(sortedData);
		trackTransactionEvent("transactions_export_csv", {
			count: sortedData.length,
		});
	};

	const hasActiveFilters =
		search.length > 0 || statusFilter !== "all" || networkFilter !== "all";

	// --- Loading skeleton ---
	if (loading) {
		return (
			<div
				role="status"
				className="w-full max-w-6xl mx-auto p-4 md:p-8 space-y-6 font-sans"
				aria-busy="true"
				aria-label="Loading transactions"
				data-testid="transactions-loading"
			>
				<div className="h-8 w-48 rounded bg-slate-200 animate-pulse" />
				<div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden divide-y divide-slate-100">
					{Array.from({ length: 5 }).map((_, i) => (
						<div key={i} className="p-4 flex gap-4">
							<div className="h-4 flex-1 rounded bg-slate-100 animate-pulse" />
							<div className="h-4 w-24 rounded bg-slate-100 animate-pulse" />
						</div>
					))}
				</div>
			</div>
		);
	}

	// --- Error state ---
	if (error) {
		return (
			<div className="w-full max-w-6xl mx-auto p-4 md:p-8">
				<ErrorState description={error} retry={{ onRetry: handleRetry }} />
			</div>
		);
	}

	// --- Empty state (no data at all) ---
	if (transactions.length === 0) {
		return (
			<div className="w-full max-w-6xl mx-auto p-4 md:p-8">
				<EmptyState
					title="No transactions yet"
					description="Transactions will appear here once your Mux wallets start sending or receiving XLM."
				/>
			</div>
		);
	}

	return (
		<div className="w-full max-w-6xl mx-auto p-4 sm:p-6 md:p-8 space-y-6 font-sans">
			{/* Header */}
			<div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
				<div>
					<h2 className="text-2xl font-bold text-slate-900 tracking-tight">
						Transactions
					</h2>
					<p className="text-slate-500 text-sm mt-1">
						Stellar on-chain activity for Mux wallets.
					</p>
				</div>

				<div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
					{/* Search */}
					<div className="relative flex-grow sm:flex-grow-0 sm:w-64">
						<Search
							className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
							size={16}
							aria-hidden
						/>
						<input
							type="text"
							placeholder="Hash, address, memo…"
							aria-label="Search transactions"
							className="w-full pl-9 pr-8 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all placeholder:text-slate-400"
							value={search}
							onChange={(e) => {
								setSearch(e.target.value);
								setCurrentPage(1);
							}}
						/>
						{search && (
							<button
								type="button"
								onClick={() => setSearch("")}
								className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
								aria-label="Clear search"
							>
								<X size={14} aria-hidden />
							</button>
						)}
					</div>

					{/* Status filter */}
					<div className="relative">
						<Filter
							className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
							size={16}
							aria-hidden
						/>
						<select
							className="w-full sm:w-36 pl-9 pr-4 py-2 bg-white border border-slate-200 text-slate-700 text-sm rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 appearance-none cursor-pointer"
							value={statusFilter}
							onChange={(e) => {
								const val = e.target.value as "all" | TransactionStatus;
								setStatusFilter(val);
								setCurrentPage(1);
								handleFilterChange("status", val);
							}}
							aria-label="Filter by status"
						>
							<option value="all">All Status</option>
							<option value="completed">Completed</option>
							<option value="pending">Pending</option>
							<option value="failed">Failed</option>
						</select>
					</div>

					{/* Network filter */}
					<div className="relative">
						<select
							className="w-full sm:w-32 px-3 py-2 bg-white border border-slate-200 text-slate-700 text-sm rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 appearance-none cursor-pointer"
							value={networkFilter}
							onChange={(e) => {
								const val = e.target.value as "all" | TransactionNetwork;
								setNetworkFilter(val);
								setCurrentPage(1);
								handleFilterChange("network", val);
							}}
							aria-label="Filter by network"
						>
							<option value="all">All Networks</option>
							<option value="mainnet">Mainnet</option>
							<option value="testnet">Testnet</option>
						</select>
					</div>

					{hasActiveFilters && (
						<button
							type="button"
							onClick={clearFilters}
							className="flex items-center justify-center px-3 text-xs font-medium text-rose-600 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors"
						>
							Reset
						</button>
					)}

					<button
						type="button"
						onClick={handleExportCsv}
						disabled={sortedData.length === 0}
						aria-label={`Export ${sortedData.length} transaction${sortedData.length !== 1 ? "s" : ""} as CSV`}
						className="flex items-center justify-center gap-1.5 px-3 py-2 bg-white border border-slate-200 text-slate-700 text-sm font-medium rounded-lg hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
					>
						<Download size={14} aria-hidden />
						Export CSV
					</button>
				</div>
			</div>

			<div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
				{/* Desktop header */}
				<div
					className="hidden lg:grid grid-cols-12 gap-2 p-4 border-b border-slate-100 bg-slate-50/50 text-xs font-semibold text-slate-500 uppercase tracking-wider select-none"
					role="row"
				>
					{(
						[
							{ key: "hash", label: "Tx Hash", span: 3, sortable: true },
							{ key: "from", label: "From", span: 2, sortable: false },
							{ key: "to", label: "To", span: 2, sortable: false },
							{
								key: "amountXlm",
								label: "Amount (XLM)",
								span: 2,
								sortable: true,
							},
							{ key: "status", label: "Status", span: 1, sortable: false },
							{ key: "network", label: "Network", span: 1, sortable: false },
							{
								key: "createdAt",
								label: "Date",
								span: 1,
								sortable: true,
							},
						] as const
					).map(({ key, label, span, sortable }) =>
						sortable ? (
							<div
								key={key}
								role="columnheader"
								aria-sort={
									sortConfig.key === key
										? sortConfig.direction === "asc"
											? "ascending"
											: "descending"
										: "none"
								}
								tabIndex={0}
								className={`col-span-${span} flex items-center gap-1 cursor-pointer hover:text-indigo-600 focus:outline-none focus:text-indigo-600 focus:underline`}
								onClick={() => handleSort(key as keyof Transaction)}
								onKeyDown={(e) =>
									handleSortKeyDown(e, key as keyof Transaction)
								}
							>
								{label}
								{sortConfig.key === key && (
									<ArrowUpDown size={12} aria-hidden />
								)}
							</div>
						) : (
							<div
								key={key}
								role="columnheader"
								className={`col-span-${span}`}
							>
								{label}
							</div>
						),
					)}
				</div>

				<div className="divide-y divide-slate-100">
					{currentData.length > 0 ? (
						currentData.map((tx) => (
							<div
								key={tx.hash}
								data-testid="tx-row"
								className="group p-4 hover:bg-slate-50 transition-colors"
							>
								{/* Desktop row */}
								<div className="hidden lg:grid grid-cols-12 gap-2 items-center">
									<div className="col-span-3">
										<span
											className="font-mono text-xs text-indigo-600 truncate block"
											title={tx.hash}
										>
											{truncate(tx.hash, 8, 6)}
										</span>
										{tx.memo && (
											<span className="text-xs text-slate-400 truncate block">
												{tx.memo}
											</span>
										)}
									</div>
									<div
										className="col-span-2 font-mono text-xs text-slate-600 truncate"
										title={tx.from}
									>
										{truncate(tx.from)}
									</div>
									<div
										className="col-span-2 font-mono text-xs text-slate-600 truncate"
										title={tx.to}
									>
										{truncate(tx.to)}
									</div>
									<div className="col-span-2 font-semibold text-sm tabular-nums text-slate-900">
										{Number(tx.amountXlm).toLocaleString(undefined, {
											minimumFractionDigits: 2,
											maximumFractionDigits: 7,
										})}{" "}
										<span className="text-xs font-medium text-slate-400">
											XLM
										</span>
									</div>
									<div className="col-span-1">
										<StatusPill status={tx.status} />
									</div>
									<div className="col-span-1">
										<NetworkBadge network={tx.network} />
									</div>
									<div className="col-span-1 text-xs text-slate-500">
										{formatDate(tx.createdAt)}
									</div>
								</div>

								{/* Mobile card */}
								<div className="lg:hidden space-y-2">
									<div className="flex items-center justify-between">
										<div className="flex items-center">
											<span
												className="font-mono text-xs text-indigo-600"
												title={tx.hash}
											>
												{truncate(tx.hash, 8, 6)}
											</span>
											<RowCopyButton
												text={tx.hash}
												label={`Copy transaction hash ${tx.hash}`}
											/>
										</div>
										<div className="flex items-center gap-2">
											<NetworkBadge network={tx.network} />
											<StatusPill status={tx.status} />
										</div>
									</div>
									<div className="flex justify-between text-xs text-slate-500">
										<span className="flex items-center gap-0.5">
											<span className="font-medium text-slate-700">
												From:{" "}
											</span>
											<span className="font-mono" title={tx.from}>
												{truncate(tx.from)}
											</span>
											<RowCopyButton
												text={tx.from}
												label={`Copy from address ${tx.from}`}
											/>
										</span>
										<span className="flex items-center gap-0.5">
											<span className="font-medium text-slate-700">
												To:{" "}
											</span>
											<span className="font-mono" title={tx.to}>
												{truncate(tx.to)}
											</span>
											<RowCopyButton
												text={tx.to}
												label={`Copy to address ${tx.to}`}
											/>
										</span>
									</div>
									<div className="flex justify-between items-center">
										<span className="font-semibold text-sm tabular-nums text-slate-900">
											{Number(tx.amountXlm).toLocaleString(undefined, {
												minimumFractionDigits: 2,
												maximumFractionDigits: 7,
											})}{" "}
											XLM
										</span>
										<span className="text-xs text-slate-400">
											{formatDate(tx.createdAt)}
										</span>
									</div>
									{tx.memo && (
										<p className="text-xs text-slate-400">Memo: {tx.memo}</p>
									)}
								</div>
							</div>
						))
					) : (
						<div className="p-12 text-center" data-testid="no-results">
							<div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-slate-100 mb-3">
								<Search size={20} className="text-slate-400" aria-hidden />
							</div>
							<h3 className="text-sm font-medium text-slate-900">
								No transactions found
							</h3>
							<p className="text-sm text-slate-500 mt-1">
								No results for current filters.
							</p>
							<button
								type="button"
								onClick={clearFilters}
								className="mt-4 text-sm text-indigo-600 font-medium hover:text-indigo-700"
							>
								Clear all filters
							</button>
						</div>
					)}
				</div>

				{/* Pagination */}
				{sortedData.length > 0 && (
					<div className="border-t border-slate-100 p-4 flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-50/50">
						<span className="text-xs text-slate-500">
							Showing{" "}
							<span className="font-medium text-slate-700">
								{(currentPage - 1) * itemsPerPage + 1}
							</span>{" "}
							–{" "}
							<span className="font-medium text-slate-700">
								{Math.min(currentPage * itemsPerPage, sortedData.length)}
							</span>{" "}
							of{" "}
							<span className="font-medium text-slate-700">
								{sortedData.length}
							</span>{" "}
							results
						</span>

						<div className="flex items-center gap-1 select-none">
							<button
								type="button"
								onClick={() => handlePageChange(currentPage - 1)}
								disabled={currentPage === 1}
								className="p-1.5 rounded-md hover:bg-white hover:shadow-sm border border-transparent hover:border-slate-200 text-slate-400 hover:text-slate-600 disabled:opacity-30 transition-all"
								aria-label="Previous page"
							>
								<ChevronLeft size={16} aria-hidden />
							</button>

							{Array.from({ length: totalPages }, (_, i) => i + 1).map(
								(page) => (
									<button
										key={page}
										type="button"
										onClick={() => handlePageChange(page)}
										aria-current={currentPage === page ? "page" : undefined}
										className={`w-7 h-7 rounded text-xs font-medium transition-all ${
											currentPage === page
												? "bg-white border border-slate-200 shadow-sm text-indigo-600"
												: "text-slate-600 hover:bg-white hover:shadow-sm"
										}`}
									>
										{page}
									</button>
								),
							)}

							<button
								type="button"
								onClick={() => handlePageChange(currentPage + 1)}
								disabled={currentPage === totalPages}
								className="p-1.5 rounded-md hover:bg-white hover:shadow-sm border border-transparent hover:border-slate-200 text-slate-400 hover:text-slate-600 disabled:opacity-30 transition-all"
								aria-label="Next page"
							>
								<ChevronRight size={16} aria-hidden />
							</button>
						</div>
					</div>
				)}
			</div>
		</div>
	);
}
