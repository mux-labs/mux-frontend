"use client";

import { Check, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { NetworkBadge } from "@/components/wallet/NetworkBadge";
import { StatusIndicator } from "@/components/wallet/StatusIndicator";
import { useCopyToClipboard } from "@/hooks/useCopyToClipboard";
import type { WalletTableProps } from "@/types/wallet";
import { truncateAddress } from "@/utils/addressFormatting";
import { formatDate } from "@/utils/dateFormatting";

function WalletAddressCell({ address }: { address: string }) {
	const { copy, copied } = useCopyToClipboard();

	return (
		<div className="flex items-center gap-2">
			<code className="rounded bg-zinc-100 px-2 py-1 font-mono text-sm text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
				{truncateAddress(address)}
			</code>
			<Button
				variant="ghost"
				size="icon-sm"
				onClick={() => copy(address)}
				title={copied ? "Copied!" : "Copy address"}
			>
				{copied ? (
					<Check className="h-4 w-4 text-green-500" />
				) : (
					<Copy className="h-4 w-4" />
				)}
			</Button>
		</div>
	);
}

export function WalletTable({ wallets }: WalletTableProps) {
	return (
		<div className="rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
			<Table>
				<TableHeader>
					<TableRow className="hover:bg-transparent dark:hover:bg-transparent">
						<TableHead>Address</TableHead>
						<TableHead>Network</TableHead>
						<TableHead>Status</TableHead>
						<TableHead className="hidden sm:table-cell">Balance</TableHead>
						<TableHead className="hidden md:table-cell">Created</TableHead>
						<TableHead className="hidden lg:table-cell">
							Last Activity
						</TableHead>
					</TableRow>
				</TableHeader>
				<TableBody>
					{wallets.map((wallet) => (
						<TableRow key={wallet.id}>
							<TableCell>
								<WalletAddressCell address={wallet.address} />
							</TableCell>
							<TableCell>
								<NetworkBadge network={wallet.network} />
							</TableCell>
							<TableCell>
								<StatusIndicator status={wallet.status} />
							</TableCell>
							<TableCell className="hidden sm:table-cell">
								<span className="text-zinc-700 dark:text-zinc-300">
									{wallet.balance ?? "—"}
								</span>
							</TableCell>
							<TableCell className="hidden text-zinc-500 md:table-cell dark:text-zinc-400">
								{formatDate(wallet.createdAt)}
							</TableCell>
							<TableCell className="hidden text-zinc-500 lg:table-cell dark:text-zinc-400">
								{formatDate(wallet.lastActivity)}
							</TableCell>
						</TableRow>
					))}
				</TableBody>
			</Table>
		</div>
	);
}
