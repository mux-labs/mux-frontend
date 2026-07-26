"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { WalletNetwork } from "@/types/wallet";

interface NetworkFilterProps {
	selectedNetwork: WalletNetwork | "all";
	onNetworkChange: (network: WalletNetwork | "all") => void;
	disabled?: boolean;
	className?: string;
}

const networkOptions: Array<{
	value: WalletNetwork | "all";
	label: string;
	description: string;
}> = [
	{
		value: "all",
		label: "All Networks",
		description: "Show wallets from all networks",
	},
	{
		value: "testnet",
		label: "Testnet",
		description: "Show testnet wallets only",
	},
	{
		value: "mainnet",
		label: "Mainnet",
		description: "Show mainnet wallets only",
	},
];

/**
 * NetworkFilter component for switching between network views
 *
 * Features:
 * - Displays network filter buttons (All, Testnet, Mainnet)
 * - Highlights currently selected network
 * - Handles network switching with validation
 * - Gracefully handles invalid network values
 * - Supports disabled state
 * - Accessible with proper ARIA attributes
 *
 * @param selectedNetwork - Currently selected network ("all", "testnet", or "mainnet")
 * @param onNetworkChange - Callback when network selection changes
 * @param disabled - Optional flag to disable all buttons
 * @param className - Optional additional CSS classes
 *
 * @example
 * <NetworkFilter
 *   selectedNetwork="mainnet"
 *   onNetworkChange={(network) => setNetwork(network)}
 * />
 */
export function NetworkFilter({
	selectedNetwork,
	onNetworkChange,
	disabled = false,
	className,
}: NetworkFilterProps) {
	const handleNetworkChange = (network: WalletNetwork | "all") => {
		if (!disabled) {
			onNetworkChange(network);
		}
	};

	return (
		<div
			className={cn("flex flex-wrap gap-2", className)}
			role="group"
			aria-label="Network filter"
		>
			{networkOptions.map((option) => (
				<Button
					key={option.value}
					variant={selectedNetwork === option.value ? "default" : "outline"}
					onClick={() => handleNetworkChange(option.value)}
					disabled={disabled}
					title={option.description}
					aria-pressed={selectedNetwork === option.value}
					aria-label={`Filter by ${option.label}`}
					className={cn(
						"flex-1 sm:flex-none transition-all",
						selectedNetwork === option.value &&
							"ring-2 ring-offset-2 dark:ring-offset-background",
					)}
				>
					{option.label}
				</Button>
			))}
		</div>
	);
}
