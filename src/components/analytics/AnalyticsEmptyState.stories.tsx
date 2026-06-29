import type { Meta, StoryObj } from "@storybook/react";
import { AnalyticsEmptyState } from "./AnalyticsEmptyState";

/**
 * AnalyticsEmptyState displays when there is no analytics data to show.
 * 
 * Features:
 * - Icon display (default chart icon or custom)
 * - Customizable title and description
 * - Optional call-to-action button
 * - Centered layout with dashed border
 * - Responsive design
 * - Dark mode support
 * - Accessibility compliant with role="status"
 * 
 * Use cases:
 * - No activity yet (new accounts)
 * - Empty date range (no transactions)
 * - Filtered view with no results
 * - Disconnected wallet state
 * - Initial onboarding state
 */
const meta = {
	title: "Analytics/AnalyticsEmptyState",
	component: AnalyticsEmptyState,
	tags: ["autodocs"],
	parameters: {
		layout: "padded",
		docs: {
			description: {
				component:
					"Empty state component shown when the analytics dashboard has no data to display.",
			},
		},
	},
	argTypes: {
		icon: {
			description: "Optional custom icon to display",
		},
		title: {
			description: "Title text for the empty state",
			control: "text",
		},
		description: {
			description: "Description explaining why there's no data",
			control: "text",
		},
		action: {
			description: "Optional action button configuration",
			control: "object",
		},
	},
} satisfies Meta<typeof AnalyticsEmptyState>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Default empty state - no analytics data */
export const Default: Story = {
	args: {},
};

/** No activity yet - new account */
export const NewAccount: Story = {
	args: {
		title: "Welcome to Analytics",
		description:
			"Start using Mux Protocol to see your analytics data here. Volume, transactions, and asset performance will appear once you begin trading.",
		action: {
			label: "Start Trading",
			onClick: () => console.log("Navigate to trading"),
		},
	},
};

/** Empty date range - no transactions in period */
export const EmptyDateRange: Story = {
	args: {
		title: "No data for this period",
		description:
			"There were no transactions during the selected date range. Try selecting a different period or check back later.",
		action: {
			label: "Change Date Range",
			onClick: () => console.log("Open date picker"),
		},
	},
};

/** Filtered results empty */
export const NoFilteredResults: Story = {
	args: {
		title: "No matching results",
		description:
			"No assets or transactions match your current filters. Try adjusting your search criteria or clearing filters.",
		action: {
			label: "Clear Filters",
			onClick: () => console.log("Clear filters"),
		},
	},
};

/** Wallet not connected */
export const WalletDisconnected: Story = {
	args: {
		title: "Wallet not connected",
		description:
			"Connect your wallet to view analytics data for your account. Your trading volume, assets, and performance metrics will appear here.",
		action: {
			label: "Connect Wallet",
			onClick: () => console.log("Open wallet connection"),
		},
	},
};

/** Coming soon - feature not available */
export const ComingSoon: Story = {
	args: {
		title: "Advanced Analytics Coming Soon",
		description:
			"We're working on bringing you detailed analytics and insights. This feature will be available in an upcoming release.",
	},
};

/** Maintenance mode */
export const Maintenance: Story = {
	args: {
		title: "Analytics temporarily unavailable",
		description:
			"We're performing scheduled maintenance on our analytics service. Please check back in a few minutes.",
		action: {
			label: "Refresh",
			onClick: () => console.log("Refresh page"),
		},
	},
};

/** Permission denied */
export const PermissionDenied: Story = {
	args: {
		title: "Access restricted",
		description:
			"You don't have permission to view analytics data. Contact your administrator to request access.",
		action: {
			label: "Contact Support",
			onClick: () => console.log("Open support"),
		},
	},
};

/** No assets configured */
export const NoAssetsConfigured: Story = {
	args: {
		title: "No assets configured",
		description:
			"Configure your portfolio assets to start tracking their performance and analytics.",
		action: {
			label: "Add Assets",
			onClick: () => console.log("Open asset configuration"),
		},
	},
};

/** Data sync in progress */
export const SyncInProgress: Story = {
	args: {
		title: "Syncing your data",
		description:
			"We're synchronizing your transaction history. Analytics data will appear here once the sync is complete. This may take a few minutes.",
		action: {
			label: "View Status",
			onClick: () => console.log("Open sync status"),
		},
	},
};

/** Custom icon - using a different SVG */
export const CustomIcon: Story = {
	args: {
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
					d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z"
				/>
			</svg>
		),
		title: "Processing your request",
		description: "Please wait while we prepare your analytics data.",
	},
};

/** Without action button */
export const NoAction: Story = {
	args: {
		title: "No historical data",
		description:
			"Analytics data is only available for the last 90 days. Historical data beyond that period is not stored.",
	},
};

/** Short description */
export const ShortDescription: Story = {
	args: {
		title: "No data",
		description: "No analytics data is available.",
		action: {
			label: "Refresh",
			onClick: () => console.log("Refresh"),
		},
	},
};

/** Long description - detailed explanation */
export const LongDescription: Story = {
	args: {
		title: "Data migration in progress",
		description:
			"We're migrating your analytics data to a new system. During this process, some data may be temporarily unavailable. We expect to complete the migration within the next 24-48 hours. Your data is safe and will be fully accessible once the migration is complete. Thank you for your patience.",
		action: {
			label: "Learn More",
			onClick: () => console.log("Open migration info"),
		},
	},
};
