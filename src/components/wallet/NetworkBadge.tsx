import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { WalletNetwork } from "@/types/wallet";

interface NetworkBadgeProps {
	network: WalletNetwork;
	className?: string;
}

const networkStyles: Record<WalletNetwork, string> = {
	testnet:
		"bg-amber-100 text-amber-800 border-amber-200 hover:bg-amber-100 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800",
	mainnet:
		"bg-blue-100 text-blue-800 border-blue-200 hover:bg-blue-100 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800",
};

const networkLabels: Record<WalletNetwork, string> = {
	testnet: "Testnet",
	mainnet: "Mainnet",
};

export function NetworkBadge({ network, className }: NetworkBadgeProps) {
	return (
		<Badge variant="outline" className={cn(networkStyles[network], className)}>
			{networkLabels[network]}
		</Badge>
	);
}
