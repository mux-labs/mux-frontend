import Link from "next/link";
import { PageHeader } from "@/components/ui/PageHeader";
import { WalletDetail } from "@/components/wallet/WalletDetail";

export default async function WalletDetailPage({
	params,
}: {
	params: Promise<{ id: string }>;
}) {
	const { id } = await params;
	return (
		<div className="space-y-6">
			<PageHeader
				title="Wallet Detail"
				description="Live balance, identity, and account activity"
				actions={
					<Link
						href="/dashboard/wallets"
						className="text-sm font-medium text-blue-700 hover:underline dark:text-blue-400"
					>
						← Back to wallets
					</Link>
				}
			/>
			<WalletDetail id={id} />
		</div>
	);
}
