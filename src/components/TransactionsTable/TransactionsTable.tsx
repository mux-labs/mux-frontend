"use client";

import {
	ArrowDownLeft,
	ArrowUpDown,
	ArrowUpRight,
	ChevronLeft,
	ChevronRight,
	Filter,
	MoreHorizontal,
	Search,
	X,
} from "lucide-react";
import React, { useMemo, useState } from "react";

type TransactionStatus = "completed" | "pending" | "failed";
type TransactionType = "incoming" | "outgoing";

interface Transaction {
	id: string;
	description: string;
	date: string;
	humanDate: string;
	category: string;
	status: TransactionStatus;
	amount: number;
	currency: string;
	type: TransactionType;
}

// --- Dummy Data ---
const INITIAL_DATA: Transaction[] = [
	{
		id: "1",
		description: "Spotify Premium",
		date: "2023-10-24",
		humanDate: "Oct 24, 2023",
		category: "Subscription",
		status: "completed",
		amount: 15.99,
		currency: "USD",
		type: "outgoing",
	},
	{
		id: "2",
		description: "Design Project #4",
		date: "2023-10-23",
		humanDate: "Oct 23, 2023",
		category: "Income",
		status: "completed",
		amount: 1250.0,
		currency: "USD",
		type: "incoming",
	},
	{
		id: "3",
		description: "Uber Ride",
		date: "2023-10-22",
		humanDate: "Oct 22, 2023",
		category: "Transport",
		status: "pending",
		amount: 24.5,
		currency: "USD",
		type: "outgoing",
	},
	{
		id: "4",
		description: "Whole Foods Market",
		date: "2023-10-21",
		humanDate: "Oct 21, 2023",
		category: "Groceries",
		status: "completed",
		amount: 142.8,
		currency: "USD",
		type: "outgoing",
	},
	{
		id: "5",
		description: "ATM Withdrawal",
		date: "2023-10-20",
		humanDate: "Oct 20, 2023",
		category: "Cash",
		status: "failed",
		amount: 200.0,
		currency: "USD",
		type: "outgoing",
	},
	{
		id: "6",
		description: "Refund: Amazon",
		date: "2023-10-19",
		humanDate: "Oct 19, 2023",
		category: "Shopping",
		status: "completed",
		amount: 45.0,
		currency: "USD",
		type: "incoming",
	},
	{
		id: "7",
		description: "Electric Bill",
		date: "2023-10-18",
		humanDate: "Oct 18, 2023",
		category: "Utilities",
		status: "completed",
		amount: 95.2,
		currency: "USD",
		type: "outgoing",
	},
	{
		id: "8",
		description: "Netflix",
		date: "2023-10-17",
		humanDate: "Oct 17, 2023",
		category: "Subscription",
		status: "completed",
		amount: 12.99,
		currency: "USD",
		type: "outgoing",
	},
	{
		id: "9",
		description: "Upwork Payout",
		date: "2023-10-16",
		humanDate: "Oct 16, 2023",
		category: "Income",
		status: "completed",
		amount: 850.0,
		currency: "USD",
		type: "incoming",
	},
	{
		id: "10",
		description: "Coffee Shop",
		date: "2023-10-15",
		humanDate: "Oct 15, 2023",
		category: "Food",
		status: "pending",
		amount: 6.5,
		currency: "USD",
		type: "outgoing",
	},
	{
		id: "11",
		description: "Gym Membership",
		date: "2023-10-14",
		humanDate: "Oct 14, 2023",
		category: "Health",
		status: "completed",
		amount: 45.0,
		currency: "USD",
		type: "outgoing",
	},
	{
		id: "12",
		description: "Apple Store",
		date: "2023-10-13",
		humanDate: "Oct 13, 2023",
		category: "Tech",
		status: "failed",
		amount: 1299.0,
		currency: "USD",
		type: "outgoing",
	},
];

const StatusPill = ({ status }: { status: TransactionStatus }) => {
	const styles = {
		completed: "bg-emerald-50 text-emerald-700 border-emerald-100",
		pending: "bg-amber-50 text-amber-700 border-amber-100",
		failed: "bg-rose-50 text-rose-700 border-rose-100",
	};

	const dots = {
		completed: "bg-emerald-500",
		pending: "bg-amber-500",
		failed: "bg-rose-500",
	};

	return (
		<span
			className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${styles[status]}`}
		>
			<span
				className={`w-1.5 h-1.5 rounded-full mr-1.5 ${dots[status]}`}
			></span>
			{status.charAt(0).toUpperCase() + status.slice(1)}
		</span>
	);
};

const AmountDisplay = ({
	amount,
	type,
	currency,
}: {
	amount: number;
	type: TransactionType;
	currency: string;
}) => {
	const isIncoming = type === "incoming";
	return (
		<div
			className={`font-semibold tabular-nums ${isIncoming ? "text-emerald-600" : "text-slate-900"}`}
		>
			{isIncoming ? "+" : "-"}
			{currency}{" "}
			{amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
		</div>
	);
};

export default function TransactionsTable() {
	// State
	const [search, setSearch] = useState("");
	const [statusFilter, setStatusFilter] = useState<"all" | TransactionStatus>(
		"all",
	);
	const [sortConfig, setSortConfig] = useState<{
		key: keyof Transaction;
		direction: "asc" | "desc";
	} | null>(null);
	const [currentPage, setCurrentPage] = useState(1);

	const itemsPerPage = 5;

	const filteredData = useMemo(() => {
		return INITIAL_DATA.filter((item) => {
			const matchesSearch =
				item.description.toLowerCase().includes(search.toLowerCase()) ||
				item.category.toLowerCase().includes(search.toLowerCase());
			const matchesStatus =
				statusFilter === "all" ? true : item.status === statusFilter;
			return matchesSearch && matchesStatus;
		});
	}, [search, statusFilter]);

	const sortedData = useMemo(() => {
		if (!sortConfig) return filteredData;

		return [...filteredData].sort((a, b) => {
			const aValue = a[sortConfig.key];
			const bValue = b[sortConfig.key];

			if (aValue < bValue) return sortConfig.direction === "asc" ? -1 : 1;
			if (aValue > bValue) return sortConfig.direction === "asc" ? 1 : -1;
			return 0;
		});
	}, [filteredData, sortConfig]);

	const totalPages = Math.ceil(sortedData.length / itemsPerPage);
	const currentData = sortedData.slice(
		(currentPage - 1) * itemsPerPage,
		currentPage * itemsPerPage,
	);

	const handleSort = (key: keyof Transaction) => {
		let direction: "asc" | "desc" = "asc";
		if (
			sortConfig &&
			sortConfig.key === key &&
			sortConfig.direction === "asc"
		) {
			direction = "desc";
		}
		setSortConfig({ key, direction });
	};

	const handlePageChange = (newPage: number) => {
		if (newPage > 0 && newPage <= totalPages) {
			setCurrentPage(newPage);
		}
	};

	const clearFilters = () => {
		setSearch("");
		setStatusFilter("all");
		setSortConfig(null);
		setCurrentPage(1);
	};

	const hasActiveFilters = search.length > 0 || statusFilter !== "all";

	return (
		<div className="w-full max-w-5xl mx-auto p-4 md:p-8 space-y-6 font-sans">
			{/* Header & Actions */}
			<div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
				<div>
					<h2 className="text-2xl font-bold text-slate-900 tracking-tight">
						Transactions
					</h2>
					<p className="text-slate-500 text-sm mt-1">
						Real-time financial activity.
					</p>
				</div>

				<div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
					{/* Search Bar */}
					<div className="relative flex-grow sm:flex-grow-0 sm:w-64">
						<Search
							className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
							size={16}
						/>
						<input
							type="text"
							placeholder="Search..."
							className="w-full pl-9 pr-8 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all placeholder:text-slate-400"
							value={search}
							onChange={(e) => {
								setSearch(e.target.value);
								setCurrentPage(1);
							}}
						/>
						{search && (
							<button
								onClick={() => setSearch("")}
								className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
							>
								<X size={14} />
							</button>
						)}
					</div>

					<div className="relative">
						<Filter
							className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
							size={16}
						/>
						<select
							className="w-full sm:w-40 pl-9 pr-4 py-2 bg-white border border-slate-200 text-slate-700 text-sm rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 appearance-none cursor-pointer transition-colors hover:bg-slate-50"
							value={statusFilter}
							onChange={(e) => {
								// FIXED: Cast to the actual union type to satisfy ESLint/Husky
								setStatusFilter(e.target.value as "all" | TransactionStatus);
								setCurrentPage(1);
							}}
						>
							<option value="all">All Status</option>
							<option value="completed">Completed</option>
							<option value="pending">Pending</option>
							<option value="failed">Failed</option>
						</select>
					</div>

					{hasActiveFilters && (
						<button
							onClick={clearFilters}
							className="hidden sm:flex items-center justify-center px-3 text-xs font-medium text-rose-600 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors"
						>
							Reset
						</button>
					)}
				</div>
			</div>

			<div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
				<div className="hidden md:grid grid-cols-12 gap-4 p-4 border-b border-slate-100 bg-slate-50/50 text-xs font-semibold text-slate-500 uppercase tracking-wider select-none">
					<div
						className="col-span-5 pl-2 flex items-center gap-1 cursor-pointer hover:text-indigo-600"
						onClick={() => handleSort("description")}
					>
						Description
						{sortConfig?.key === "description" && <ArrowUpDown size={12} />}
					</div>
					<div className="col-span-2">Category</div>
					<div className="col-span-2">Status</div>
					<div
						className="col-span-2 text-right flex items-center justify-end gap-1 cursor-pointer hover:text-indigo-600"
						onClick={() => handleSort("amount")}
					>
						Amount
						{sortConfig?.key === "amount" && <ArrowUpDown size={12} />}
					</div>
					<div className="col-span-1"></div>
				</div>

				<div className="divide-y divide-slate-100">
					{currentData.length > 0 ? (
						currentData.map((tx) => (
							<div
								key={tx.id}
								className="group md:grid md:grid-cols-12 md:gap-4 p-4 items-center hover:bg-slate-50 transition-colors"
							>
								<div className="col-span-12 md:col-span-5 flex items-center gap-4">
									<div
										className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center border ${tx.type === "incoming" ? "bg-emerald-50 border-emerald-100 text-emerald-600" : "bg-slate-50 border-slate-200 text-slate-600"}`}
									>
										{tx.type === "incoming" ? (
											<ArrowDownLeft size={18} />
										) : (
											<ArrowUpRight size={18} />
										)}
									</div>
									<div className="min-w-0">
										<p className="font-medium text-slate-900 truncate">
											{tx.description}
										</p>
										<p className="text-xs text-slate-500 md:hidden">
											{tx.humanDate} • {tx.category}
										</p>
										<p className="hidden md:block text-xs text-slate-500">
											{tx.humanDate}
										</p>
									</div>
								</div>

								<div className="hidden md:block col-span-2 text-sm text-slate-600">
									{tx.category}
								</div>

								<div className="col-span-12 md:col-span-2 mt-3 md:mt-0 flex items-center justify-between md:block">
									<StatusPill status={tx.status} />
									<div className="md:hidden">
										<AmountDisplay
											amount={tx.amount}
											type={tx.type}
											currency={tx.currency}
										/>
									</div>
								</div>

								<div className="hidden md:block col-span-2 text-right">
									<AmountDisplay
										amount={tx.amount}
										type={tx.type}
										currency={tx.currency}
									/>
								</div>

								<div className="hidden md:flex col-span-1 justify-end opacity-0 group-hover:opacity-100 transition-opacity">
									<button className="p-2 hover:bg-slate-200 rounded-full text-slate-400 hover:text-slate-600">
										<MoreHorizontal size={18} />
									</button>
								</div>
							</div>
						))
					) : (
						// Empty State
						<div className="p-12 text-center">
							<div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-slate-100 mb-3">
								<Search size={20} className="text-slate-400" />
							</div>
							<h3 className="text-sm font-medium text-slate-900">
								No transactions found
							</h3>
							<p className="text-sm text-slate-500 mt-1">
								No results for current filters.
							</p>
							<button
								onClick={clearFilters}
								className="mt-4 text-sm text-indigo-600 font-medium hover:text-indigo-700"
							>
								Clear all filters
							</button>
						</div>
					)}
				</div>

				{/* Pagination Footer */}
				{sortedData.length > 0 && (
					<div className="border-t border-slate-100 p-4 flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-50/50">
						<span className="text-xs text-slate-500">
							Showing{" "}
							<span className="font-medium text-slate-700">
								{(currentPage - 1) * itemsPerPage + 1}
							</span>{" "}
							to{" "}
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
								onClick={() => handlePageChange(currentPage - 1)}
								disabled={currentPage === 1}
								className="p-1.5 rounded-md hover:bg-white hover:shadow-sm border border-transparent hover:border-slate-200 text-slate-400 hover:text-slate-600 disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:shadow-none transition-all"
							>
								<ChevronLeft size={16} />
							</button>

							{Array.from({ length: totalPages }, (_, i) => i + 1).map(
								(page) => (
									<button
										key={page}
										onClick={() => handlePageChange(page)}
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
								onClick={() => handlePageChange(currentPage + 1)}
								disabled={currentPage === totalPages}
								className="p-1.5 rounded-md hover:bg-white hover:shadow-sm border border-transparent hover:border-slate-200 text-slate-400 hover:text-slate-600 disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:shadow-none transition-all"
							>
								<ChevronRight size={16} />
							</button>
						</div>
					</div>
				)}
			</div>
		</div>
	);
}
