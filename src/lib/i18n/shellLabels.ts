/**
 * Centralized, i18n-ready strings for the dashboard shell (nav, header, footer).
 * Extracting these here lets a future translation layer swap this object
 * without hunting through components for hardcoded copy.
 *
 * Consumed by `src/components/layouts/Sidebar.tsx` and
 * `src/components/layouts/TopNav.tsx` — add a key here rather than inlining
 * new shell copy in those components.
 */
export const shellLabels = {
	nav: {
		dashboard: "Dashboard",
		wallets: "Wallets",
		analytics: "Analytics",
		users: "Users",
		apiKeys: "API Keys",
		spendingLimits: "Spending Limits",
		settings: "Settings",
	},
	header: {
		testnet: "Testnet",
		mainnet: "Mainnet",
		breadcrumbHome: "Home",
		logout: "Sign out",
	},
	footer: {
		docs: "Documentation",
		support: "Support",
	},
} as const;

export type ShellLabelKey = keyof typeof shellLabels;
