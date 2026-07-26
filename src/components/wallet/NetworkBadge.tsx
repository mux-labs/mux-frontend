import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { WalletNetwork } from "@/types/wallet";

interface NetworkBadgeProps {
	network: WalletNetwork;
	className?: string;
}

// Text colors darkened to -900/-300 to meet WCAG AA (4.5:1) contrast against their badge backgrounds.
const networkStyles: Record<WalletNetwork, string> = {
	testnet:
		"bg-amber-100 text-amber-900 border-amber-200 hover:bg-amber-100 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-800",
	mainnet:
		"bg-blue-100 text-blue-900 border-blue-200 hover:bg-blue-100 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800",
};

const networkLabels: Record<WalletNetwork, string> = {
	testnet: "Testnet",
	mainnet: "Mainnet",
};

/**
 * NetworkBadge component displays the network type (testnet/mainnet) with appropriate styling.
 * Handles invalid network values gracefully by defaulting to mainnet.
 *
 * @param network - The wallet network type (testnet or mainnet)
 * @param className - Optional additional CSS classes to merge with default styles
 * @returns A styled badge component displaying the network type
 */
export function NetworkBadge({ network, className }: NetworkBadgeProps) {
	// Validate network value and default to mainnet if invalid
	const validNetwork: WalletNetwork = (
		Object.keys(networkStyles) as WalletNetwork[]
	).includes(network)
		? network
		: "mainnet";

	const styles = networkStyles[validNetwork];
	const label = networkLabels[validNetwork];

	return (
		<Badge variant="outline" className={cn(styles, className)}>
			{label}
		</Badge>
	);
}
