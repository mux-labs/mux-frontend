/**
 * Centralized, i18n-ready strings for the dashboard shell (nav, header, footer).
 * Extracting these here lets a future translation layer swap this object
 * without hunting through components for hardcoded copy.
 */
export const shellLabels = {
	nav: {
		dashboard: "Dashboard",
		wallets: "Wallets",
		analytics: "Analytics",
		apiKeys: "API Keys",
		spendingLimits: "Spending Limits",
		settings: "Settings",
	},
	header: {
		testnet: "Testnet",
		mainnet: "Mainnet",
		logout: "Log out",
	},
	footer: {
		docs: "Documentation",
		support: "Support",
	},
} as const;

export type ShellLabelKey = keyof typeof shellLabels;
