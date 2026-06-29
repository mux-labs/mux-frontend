import type { Meta, StoryObj } from "@storybook/react";
import {
	AnalyticsLoadingSkeleton,
	MetricsCardsSkeleton,
	AnalyticsChartSkeleton,
	TopAssetsTableSkeleton,
} from "./AnalyticsLoadingSkeleton";

/**
 * AnalyticsLoadingSkeleton provides loading states for the analytics dashboard.
 * 
 * Includes separate skeletons for:
 * - Full page skeleton (header + metrics + charts + table)
 * - Metrics cards grid (4 cards)
 * - Chart card (bar chart with footer)
 * - Top assets table (configurable row count)
 * 
 * Features:
 * - Matches actual component layout
 * - Responsive design (mobile, tablet, desktop)
 * - Accessibility with aria-label and aria-busy
 * - Smooth skeleton animations
 * - Dark mode support
 * 
 * Use cases:
 * - Initial page load
 * - Data refresh
 * - Network delays
 * - API fetching states
 */
const meta = {
	title: "Analytics/AnalyticsLoadingSkeleton",
	component: AnalyticsLoadingSkeleton,
	tags: ["autodocs"],
	parameters: {
		layout: "padded",
		docs: {
			description: {
				component:
					"Loading skeleton components that mirror the analytics dashboard layout during data fetching.",
			},
		},
	},
} satisfies Meta<typeof AnalyticsLoadingSkeleton>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Full page loading skeleton - initial load */
export const FullPage: Story = {
	render: () => <AnalyticsLoadingSkeleton />,
};

/** Metrics cards skeleton only */
export const MetricsCardsOnly: Story = {
	render: () => <MetricsCardsSkeleton />,
};

/** Single chart skeleton */
export const SingleChart: Story = {
	render: () => <AnalyticsChartSkeleton />,
};

/** Two charts side-by-side - desktop layout */
export const TwoCharts: Story = {
	render: () => (
		<div className="grid gap-6 lg:grid-cols-2">
			<AnalyticsChartSkeleton />
			<AnalyticsChartSkeleton />
		</div>
	),
};

/** Top assets table - default 5 rows */
export const AssetsTableDefault: Story = {
	render: () => <TopAssetsTableSkeleton />,
};

/** Top assets table - 3 rows */
export const AssetsTable3Rows: Story = {
	render: () => <TopAssetsTableSkeleton rows={3} />,
};

/** Top assets table - 10 rows */
export const AssetsTable10Rows: Story = {
	render: () => <TopAssetsTableSkeleton rows={10} />,
};

/** Top assets table - single row */
export const AssetsTableSingleRow: Story = {
	render: () => <TopAssetsTableSkeleton rows={1} />,
};

/** Metrics + single chart - partial loading */
export const MetricsAndChart: Story = {
	render: () => (
		<div className="space-y-6">
			<MetricsCardsSkeleton />
			<AnalyticsChartSkeleton />
		</div>
	),
};

/** Chart + table - combined loading */
export const ChartAndTable: Story = {
	render: () => (
		<div className="space-y-6">
			<AnalyticsChartSkeleton />
			<TopAssetsTableSkeleton />
		</div>
	),
};

/** Complete data section - metrics, charts, table */
export const CompleteDataSection: Story = {
	render: () => (
		<div className="space-y-6">
			<MetricsCardsSkeleton />
			<div className="grid gap-6 lg:grid-cols-2">
				<AnalyticsChartSkeleton />
				<AnalyticsChartSkeleton />
			</div>
			<TopAssetsTableSkeleton />
		</div>
	),
};

/** Multiple charts grid - 4 charts */
export const MultipleChartsGrid: Story = {
	render: () => (
		<div className="grid gap-6 md:grid-cols-2">
			<AnalyticsChartSkeleton />
			<AnalyticsChartSkeleton />
			<AnalyticsChartSkeleton />
			<AnalyticsChartSkeleton />
		</div>
	),
};

/** Stacked layout - mobile view */
export const StackedLayout: Story = {
	render: () => (
		<div className="space-y-6">
			<MetricsCardsSkeleton />
			<AnalyticsChartSkeleton />
			<AnalyticsChartSkeleton />
			<TopAssetsTableSkeleton rows={3} />
		</div>
	),
};

/** Minimal loading - metrics only */
export const MinimalLoading: Story = {
	render: () => <MetricsCardsSkeleton />,
};

/** Large table loading - 20 rows */
export const LargeTableLoading: Story = {
	render: () => <TopAssetsTableSkeleton rows={20} />,
};
