import type { Meta, StoryObj } from "@storybook/react";
import { AnalyticsChart } from "./AnalyticsChart";

/**
 * AnalyticsChart displays time-series data as an interactive bar chart.
 * 
 * Features:
 * - Responsive bar chart with hover effects
 * - Auto-scaling based on maximum value
 * - Custom value formatting (currency, numbers, etc.)
 * - Shows total and average in footer
 * - Empty state handling
 * - Dark mode support
 * 
 * Use cases:
 * - Volume over time
 * - Transaction counts
 * - User activity metrics
 * - Any time-series data
 */
const meta = {
	title: "Analytics/AnalyticsChart",
	component: AnalyticsChart,
	tags: ["autodocs"],
	parameters: {
		layout: "padded",
		docs: {
			description: {
				component:
					"Displays time-series data as a bar chart with configurable formatting and empty state handling.",
			},
		},
	},
	argTypes: {
		title: {
			description: "Chart title",
			control: "text",
		},
		description: {
			description: "Optional chart description",
			control: "text",
		},
		data: {
			description: "Array of data points with date and value",
			control: "object",
		},
		formatValue: {
			description: "Custom function to format values (e.g., currency, percentages)",
		},
		emptyMessage: {
			description: "Message shown when data array is empty",
			control: "text",
		},
	},
} satisfies Meta<typeof AnalyticsChart>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Volume over time - default currency formatting */
export const VolumeOverTime: Story = {
	args: {
		title: "Volume Over Time",
		description: "Trading volume for the last 7 days",
		data: [
			{ date: "Mon", value: 2400000 },
			{ date: "Tue", value: 3200000 },
			{ date: "Wed", value: 2800000 },
			{ date: "Thu", value: 4100000 },
			{ date: "Fri", value: 3800000 },
			{ date: "Sat", value: 2900000 },
			{ date: "Sun", value: 3600000 },
		],
		formatValue: (v) => `$${(v / 1000000).toFixed(1)}M`,
	},
};

/** Transaction counts - simple number formatting */
export const TransactionCounts: Story = {
	args: {
		title: "Transactions Over Time",
		description: "Daily transaction count for the past week",
		data: [
			{ date: "Mon", value: 12000 },
			{ date: "Tue", value: 15600 },
			{ date: "Wed", value: 13400 },
			{ date: "Thu", value: 18900 },
			{ date: "Fri", value: 17200 },
			{ date: "Sat", value: 14800 },
			{ date: "Sun", value: 16331 },
		],
		formatValue: (v) => v.toLocaleString(),
	},
};

/** Active users - gradual growth trend */
export const ActiveUsers: Story = {
	args: {
		title: "Active Users",
		description: "Daily active users over the past 7 days",
		data: [
			{ date: "Mon", value: 3200 },
			{ date: "Tue", value: 3450 },
			{ date: "Wed", value: 3780 },
			{ date: "Thu", value: 4120 },
			{ date: "Fri", value: 4580 },
			{ date: "Sat", value: 4890 },
			{ date: "Sun", value: 5234 },
		],
		formatValue: (v) => v.toLocaleString(),
	},
};

/** Revenue tracking - showing currency */
export const Revenue: Story = {
	args: {
		title: "Daily Revenue",
		description: "Revenue generated per day this week",
		data: [
			{ date: "Mon", value: 45000 },
			{ date: "Tue", value: 52000 },
			{ date: "Wed", value: 48000 },
			{ date: "Thu", value: 67000 },
			{ date: "Fri", value: 71000 },
			{ date: "Sat", value: 39000 },
			{ date: "Sun", value: 43000 },
		],
		formatValue: (v) => `$${(v / 1000).toFixed(0)}K`,
	},
};

/** Monthly data - showing longer time period */
export const MonthlyData: Story = {
	args: {
		title: "Monthly Volume",
		description: "Last 12 months of trading volume",
		data: [
			{ date: "Jan", value: 8400000 },
			{ date: "Feb", value: 9200000 },
			{ date: "Mar", value: 11800000 },
			{ date: "Apr", value: 13100000 },
			{ date: "May", value: 12800000 },
			{ date: "Jun", value: 14500000 },
			{ date: "Jul", value: 16200000 },
			{ date: "Aug", value: 15800000 },
			{ date: "Sep", value: 17900000 },
			{ date: "Oct", value: 19400000 },
			{ date: "Nov", value: 21200000 },
			{ date: "Dec", value: 23600000 },
		],
		formatValue: (v) => `$${(v / 1000000).toFixed(1)}M`,
	},
};

/** Declining trend - showing negative pattern */
export const DecliningTrend: Story = {
	args: {
		title: "User Churn",
		description: "Users leaving the platform daily",
		data: [
			{ date: "Mon", value: 1200 },
			{ date: "Tue", value: 1050 },
			{ date: "Wed", value: 890 },
			{ date: "Thu", value: 760 },
			{ date: "Fri", value: 620 },
			{ date: "Sat", value: 480 },
			{ date: "Sun", value: 340 },
		],
		formatValue: (v) => v.toLocaleString(),
	},
};

/** Volatile data - extreme variations */
export const VolatileData: Story = {
	args: {
		title: "Network Activity",
		description: "Highly variable daily activity",
		data: [
			{ date: "Mon", value: 2000 },
			{ date: "Tue", value: 8500 },
			{ date: "Wed", value: 1200 },
			{ date: "Thu", value: 9800 },
			{ date: "Fri", value: 3400 },
			{ date: "Sat", value: 7600 },
			{ date: "Sun", value: 4200 },
		],
		formatValue: (v) => v.toLocaleString(),
	},
};

/** Single data point */
export const SingleDay: Story = {
	args: {
		title: "Today's Volume",
		description: "Single day snapshot",
		data: [{ date: "Today", value: 4234567 }],
		formatValue: (v) => `$${(v / 1000000).toFixed(2)}M`,
	},
};

/** Large numbers - billions */
export const LargeNumbers: Story = {
	args: {
		title: "Total Value Locked",
		description: "TVL across all protocols",
		data: [
			{ date: "Q1", value: 1200000000 },
			{ date: "Q2", value: 1450000000 },
			{ date: "Q3", value: 1780000000 },
			{ date: "Q4", value: 2100000000 },
		],
		formatValue: (v) => `$${(v / 1000000000).toFixed(2)}B`,
	},
};

/** Small numbers - testing precision */
export const SmallNumbers: Story = {
	args: {
		title: "Average Gas Cost",
		description: "Daily average in ETH",
		data: [
			{ date: "Mon", value: 0.00032 },
			{ date: "Tue", value: 0.00028 },
			{ date: "Wed", value: 0.00035 },
			{ date: "Thu", value: 0.00041 },
			{ date: "Fri", value: 0.00038 },
			{ date: "Sat", value: 0.00029 },
			{ date: "Sun", value: 0.00033 },
		],
		formatValue: (v) => `${v.toFixed(5)} ETH`,
	},
};

/** Percentage data */
export const PercentageData: Story = {
	args: {
		title: "Success Rate",
		description: "Transaction success rate per day",
		data: [
			{ date: "Mon", value: 98.5 },
			{ date: "Tue", value: 99.1 },
			{ date: "Wed", value: 98.9 },
			{ date: "Thu", value: 99.4 },
			{ date: "Fri", value: 99.2 },
			{ date: "Sat", value: 98.7 },
			{ date: "Sun", value: 99.3 },
		],
		formatValue: (v) => `${v.toFixed(1)}%`,
	},
};

/** Empty state - no data */
export const Empty: Story = {
	args: {
		title: "Volume Over Time",
		description: "No data available for this period",
		data: [],
		emptyMessage: "No data for this period",
	},
};

/** Custom empty message */
export const CustomEmptyMessage: Story = {
	args: {
		title: "Future Projections",
		description: "Projected data not yet available",
		data: [],
		emptyMessage: "Projections will appear here once calculated",
	},
};
