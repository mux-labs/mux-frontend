import type { Meta, StoryObj } from "@storybook/react";
import { MetricsCards } from "./MetricsCards";

/**
 * MetricsCards displays key performance indicators in a responsive grid layout.
 * 
 * Each card shows:
 * - A descriptive label
 * - The current value (formatted)
 * - A percentage change with directional arrow (up/down)
 * - A change label (e.g., "vs last week")
 * - A copy button that appears on hover
 * 
 * Features:
 * - Responsive grid (1 column on mobile, 2 on tablet, 4 on desktop)
 * - Copy-to-clipboard functionality with toast feedback
 * - Green/red color coding for positive/negative changes
 * - Dark mode support
 */
const meta = {
	title: "Analytics/MetricsCards",
	component: MetricsCards,
	tags: ["autodocs"],
	parameters: {
		layout: "padded",
		docs: {
			description: {
				component:
					"Displays a grid of metric cards showing key performance indicators with trend indicators and copy functionality.",
			},
		},
	},
	argTypes: {
		metrics: {
			description: "Array of metric objects to display",
			control: "object",
		},
	},
} satisfies Meta<typeof MetricsCards>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Default metrics showing typical analytics KPIs */
export const Default: Story = {
	args: {
		metrics: [
			{
				label: "Total Volume",
				value: "$12.4M",
				change: 12.5,
				changeLabel: "vs last week",
			},
			{
				label: "Total Transactions",
				value: "84,231",
				change: 8.2,
				changeLabel: "vs last week",
			},
			{
				label: "Active Users",
				value: "12,489",
				change: -3.1,
				changeLabel: "vs last week",
			},
			{
				label: "Avg. Transaction Size",
				value: "$147.23",
				change: 5.8,
				changeLabel: "vs last week",
			},
		],
	},
};

/** All positive changes - bullish metrics */
export const AllPositive: Story = {
	args: {
		metrics: [
			{
				label: "Total Volume",
				value: "$18.7M",
				change: 25.3,
				changeLabel: "vs last month",
			},
			{
				label: "New Users",
				value: "5,432",
				change: 42.1,
				changeLabel: "vs last month",
			},
			{
				label: "Revenue",
				value: "$234K",
				change: 15.7,
				changeLabel: "vs last month",
			},
			{
				label: "Retention Rate",
				value: "87.3%",
				change: 3.2,
				changeLabel: "vs last month",
			},
		],
	},
};

/** All negative changes - bearish metrics */
export const AllNegative: Story = {
	args: {
		metrics: [
			{
				label: "Total Volume",
				value: "$8.2M",
				change: -18.4,
				changeLabel: "vs last week",
			},
			{
				label: "Active Users",
				value: "6,234",
				change: -12.7,
				changeLabel: "vs last week",
			},
			{
				label: "Transaction Count",
				value: "42,189",
				change: -8.9,
				changeLabel: "vs last week",
			},
			{
				label: "Avg. Session",
				value: "3.2min",
				change: -5.1,
				changeLabel: "vs last week",
			},
		],
	},
};

/** Single metric card */
export const SingleMetric: Story = {
	args: {
		metrics: [
			{
				label: "Total Volume",
				value: "$12.4M",
				change: 12.5,
				changeLabel: "vs last week",
			},
		],
	},
};

/** Two metrics - useful for side-by-side comparison */
export const TwoMetrics: Story = {
	args: {
		metrics: [
			{
				label: "Revenue",
				value: "$456K",
				change: 18.3,
				changeLabel: "vs last quarter",
			},
			{
				label: "Expenses",
				value: "$234K",
				change: -7.2,
				changeLabel: "vs last quarter",
			},
		],
	},
};

/** Large numbers - testing number formatting */
export const LargeNumbers: Story = {
	args: {
		metrics: [
			{
				label: "Total Market Cap",
				value: "$1.2B",
				change: 234.5,
				changeLabel: "vs last year",
			},
			{
				label: "Total Wallets",
				value: "2,458,392",
				change: 89.3,
				changeLabel: "vs last year",
			},
			{
				label: "Daily Volume",
				value: "$456.8M",
				change: 45.2,
				changeLabel: "vs yesterday",
			},
			{
				label: "Gas Fees Saved",
				value: "$12.8M",
				change: 156.7,
				changeLabel: "vs last month",
			},
		],
	},
};

/** Small/precise values - testing decimal formatting */
export const SmallValues: Story = {
	args: {
		metrics: [
			{
				label: "Avg. Gas Price",
				value: "0.00032 ETH",
				change: -12.5,
				changeLabel: "vs last hour",
			},
			{
				label: "Slippage",
				value: "0.03%",
				change: 0.1,
				changeLabel: "vs yesterday",
			},
			{
				label: "Success Rate",
				value: "99.97%",
				change: 0.02,
				changeLabel: "vs last week",
			},
			{
				label: "Latency",
				value: "0.8ms",
				change: -5.3,
				changeLabel: "vs last week",
			},
		],
	},
};

/** Zero change - flat metrics */
export const NoChange: Story = {
	args: {
		metrics: [
			{
				label: "Stable Metric",
				value: "$100K",
				change: 0,
				changeLabel: "vs last week",
			},
			{
				label: "Fixed Rate",
				value: "5.00%",
				change: 0,
				changeLabel: "vs last month",
			},
		],
	},
};

/** Mixed time periods */
export const MixedTimePeriods: Story = {
	args: {
		metrics: [
			{
				label: "Hourly Volume",
				value: "$524K",
				change: 8.3,
				changeLabel: "vs last hour",
			},
			{
				label: "Daily Volume",
				value: "$12.4M",
				change: 12.5,
				changeLabel: "vs yesterday",
			},
			{
				label: "Weekly Volume",
				value: "$84.2M",
				change: -3.2,
				changeLabel: "vs last week",
			},
			{
				label: "Monthly Volume",
				value: "$345M",
				change: 15.7,
				changeLabel: "vs last month",
			},
		],
	},
};
