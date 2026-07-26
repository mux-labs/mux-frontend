"use client";

import TransactionsTable from "@/components/TransactionsTable/TransactionsTable";
import { useTransactions } from "@/hooks/useTransactions";

export default function Page() {
	const { transactions, loading, error, refetch } = useTransactions();

	return (
		<TransactionsTable
			transactions={transactions}
			loading={loading}
			error={error}
			onRetry={refetch}
		/>
	);
}
