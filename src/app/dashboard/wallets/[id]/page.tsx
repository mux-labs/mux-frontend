import Link from "next/link";
import { WalletDetail } from "@/components/wallet/WalletDetail";

export default async function WalletDetailPage({
	params,
}: {
	params: Promise<{ id: string }>;
}) {
	const { id } = await params;
	return (
		<div className="space-y-6">
			<div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
				<div>
					<h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
						Wallet Detail
					</h2>
					<p className="text-sm text-zinc-500 dark:text-zinc-400">
						Live balance, identity, and account activity
					</p>
				</div>
				<Link
					href="/dashboard/wallets"
					className="text-sm font-medium text-blue-700 hover:underline dark:text-blue-400"
				>
					← Back to wallets
				</Link>
			</div>
			<WalletDetail id={id} />
		</div>
	);
}
