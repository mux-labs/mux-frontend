import type { Meta, StoryObj } from "@storybook/react";
import { AnalyticsHeader } from "./AnalyticsHeader";
import type { DateRange } from "./DateRangePicker";
import { useState } from "react";

/**
 * AnalyticsHeader provides the page title, description, and controls for the analytics dashboard.
 * 
 * Features:
 * - Page title and description
 * - Date range picker for filtering data
 * - Optional refresh button to reload data
 * - Responsive layout (stacks on mobile, side-by-side on desktop)
 * - Dark mode support
 * 
 * Use cases:
 * - Primary header for analytics dashboard
 * - Date range filtering for all analytics data
 * - Manual data refresh trigger
 */
const meta = {
	title: "Analytics/AnalyticsHeader",
	component: AnalyticsHeader,
	tags: ["autodocs"],
	parameters: {
		layout: "padded",
		docs: {
			description: {
				component:
					"Header component for the analytics page with date range picker and optional refresh functionality.",
			},
		},
	},
	argTypes: {
		range: {
			description: "Currently selected date range",
			control: "object",
		},
		onRangeChange: {
			description: "Callback when user selects a new date range",
		},
		onRefresh: {
			description: "Optional callback to refresh analytics data",
		},
	},
} satisfies Meta<typeof AnalyticsHeader>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Interactive wrapper component */
function InteractiveHeader(args: any) {
	const [range, setRange] = useState<DateRange>(args.range);
	return <AnalyticsHeader {...args} range={range} onRangeChange={setRange} />;
}

/** Default with refresh button */
export const Default: Story = {
	render: (args) => <InteractiveHeader {...args} />,
	args: {
		range: {
			from: "2024-06-22",
			to: "2024-06-29",
		},
		onRefresh: () => console.log("Refreshing data..."),
	},
};

/** Without refresh button - static data */
export const WithoutRefresh: Story = {
	render: (args) => <InteractiveHeader {...args} />,
	args: {
		range: {
			from: "2024-06-22",
			to: "2024-06-29",
		},
		onRefresh: undefined,
	},
};

/** Last 30 days - common default */
export const Last30Days: Story = {
	render: (args) => <InteractiveHeader {...args} />,
	args: {
		range: {
			from: "2024-05-30",
			to: "2024-06-29",
		},
		onRefresh: () => console.log("Refreshing data..."),
	},
};

/** Quarterly view */
export const QuarterlyView: Story = {
	render: (args) => <InteractiveHeader {...args} />,
	args: {
		range: {
			from: "2024-04-01",
			to: "2024-06-29",
		},
		onRefresh: () => console.log("Refreshing data..."),
	},
};

/** Year-to-date */
export const YearToDate: Story = {
	render: (args) => <InteractiveHeader {...args} />,
	args: {
		range: {
			from: "2024-01-01",
			to: "2024-06-29",
		},
		onRefresh: () => console.log("Refreshing data..."),
	},
};

/** Historical analysis - past year */
export const HistoricalYear: Story = {
	render: (args) => <InteractiveHeader {...args} />,
	args: {
		range: {
			from: "2023-06-29",
			to: "2024-06-29",
		},
		onRefresh: () => console.log("Refreshing data..."),
	},
};

/** Single day - detailed view */
export const SingleDay: Story = {
	render: (args) => <InteractiveHeader {...args} />,
	args: {
		range: {
			from: "2024-06-29",
			to: "2024-06-29",
		},
		onRefresh: () => console.log("Refreshing data..."),
	},
};

/** Weekend only */
export const WeekendView: Story = {
	render: (args) => <InteractiveHeader {...args} />,
	args: {
		range: {
			from: "2024-06-28",
			to: "2024-06-29",
		},
		onRefresh: () => console.log("Refreshing data..."),
	},
};
