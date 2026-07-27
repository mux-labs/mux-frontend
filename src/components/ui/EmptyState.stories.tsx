import type { Meta, StoryObj } from "@storybook/react";
import { EmptyState } from "./EmptyState";

/**
 * EmptyState is the generic "nothing to show yet" placeholder reused across
 * dashboard pages (wallets, transactions, etc.) whenever a data-fetching
 * view has no items to render but no error either.
 */
const meta = {
	title: "UI/EmptyState",
	component: EmptyState,
	tags: ["autodocs"],
	parameters: {
		layout: "padded",
		docs: {
			description: {
				component:
					"Empty state shown when a list or detail view has successfully loaded but has no data to display.",
			},
		},
	},
	argTypes: {
		icon: { description: "Optional custom icon; defaults to a generic outline icon" },
		title: { control: "text", description: "Short heading for the empty state" },
		description: {
			control: "text",
			description: "Explains why there's nothing here / what to do next",
		},
		action: { control: "object", description: "Optional call-to-action button" },
	},
} satisfies Meta<typeof EmptyState>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Default empty state with the built-in icon and no action. */
export const Default: Story = {
	args: {
		title: "No data yet",
		description: "There's nothing to show here right now.",
	},
};

/** No wallets added — the state used on the wallets dashboard. */
export const NoWallets: Story = {
	args: {
		title: "No wallets found",
		description:
			"You haven't added any wallets to monitor yet. Add your first wallet to start tracking.",
		action: {
			label: "Add Wallet",
			onClick: () => console.log("Add wallet clicked"),
		},
	},
};

/** No wallet data available for a single wallet detail view. */
export const NoWalletData: Story = {
	args: {
		title: "No wallet data",
		description: "This wallet has no data to display yet.",
	},
};

/** Filtered list with zero matches. */
export const NoFilteredResults: Story = {
	args: {
		title: "No matching wallets",
		description:
			"No wallets match the selected network filter. Try switching between testnet and mainnet.",
		action: {
			label: "Clear Filter",
			onClick: () => console.log("Clear filter clicked"),
		},
	},
};

/** Custom icon overriding the default outline icon. */
export const CustomIcon: Story = {
	args: {
		title: "No transactions",
		description: "Transactions will appear here once this wallet is active.",
		icon: (
			<svg
				className="h-10 w-10 text-blue-400"
				fill="none"
				viewBox="0 0 24 24"
				stroke="currentColor"
				strokeWidth={1.5}
			>
				<path
					strokeLinecap="round"
					strokeLinejoin="round"
					d="M3 7.5L7.5 3m0 0L12 7.5M7.5 3v13.5m13.5 0L16.5 21m0 0L12 16.5m4.5 4.5V7.5"
				/>
			</svg>
		),
	},
};

/** No action button — purely informational. */
export const NoAction: Story = {
	args: {
		title: "Nothing to see here",
		description: "This section is intentionally empty for now.",
	},
};

/** Long title/description to check wrapping and max-width behavior. */
export const LongContent: Story = {
	args: {
		title: "No wallets match your current search and filter combination",
		description:
			"Try broadening your search terms, clearing the network filter, or removing the status filter to see more results. If you believe this is an error, contact support.",
		action: {
			label: "Reset all filters",
			onClick: () => console.log("Reset filters clicked"),
		},
	},
};

/** Rendered inside a dark-mode wrapper to verify contrast. */
export const DarkMode: Story = {
	args: {
		title: "No wallets found",
		description: "Add your first wallet to start tracking.",
		action: { label: "Add Wallet", onClick: () => console.log("Add wallet") },
	},
	parameters: { backgrounds: { default: "dark" } },
	decorators: [
		(Story) => (
			<div className="dark bg-zinc-950 p-6">
				<Story />
			</div>
		),
	],
};
