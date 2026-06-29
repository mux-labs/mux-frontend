import type { Meta, StoryObj } from "@storybook/react";
import { DateRangePicker } from "./DateRangePicker";
import { useState } from "react";
import type { DateRange } from "./DateRangePicker";

/**
 * DateRangePicker allows users to select a date range for analytics data.
 * 
 * Features:
 * - Quick presets (7, 14, 30, 90 days)
 * - Custom date range selection
 * - Real-time validation with visual feedback
 * - Prevents future dates (configurable)
 * - Enforces maximum date range (configurable)
 * - Historical limits (configurable)
 * - Accessibility compliant with ARIA labels
 * - Dark mode support
 * - Toast notification support for validation errors
 * 
 * Validation rules:
 * - Start date must be before end date
 * - No future dates (default)
 * - Maximum range (default: 365 days)
 * - Maximum years back (default: 5 years)
 */
const meta = {
	title: "Analytics/DateRangePicker",
	component: DateRangePicker,
	tags: ["autodocs"],
	parameters: {
		layout: "centered",
		docs: {
			description: {
				component:
					"A date range picker with presets, custom range selection, and comprehensive validation.",
			},
		},
	},
	argTypes: {
		value: {
			description: "Current date range value",
			control: "object",
		},
		onChange: {
			description: "Callback when date range changes",
		},
		maxDate: {
			description: "Maximum allowed date (defaults to today)",
			control: "text",
		},
		onValidationChange: {
			description: "Callback when validation state changes",
		},
		showValidation: {
			description: "Whether to show inline validation errors",
			control: "boolean",
		},
		validationOptions: {
			description: "Custom validation options",
			control: "object",
		},
		onValidationError: {
			description: "Callback for showing toast notifications on validation errors",
		},
	},
} satisfies Meta<typeof DateRangePicker>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Interactive wrapper component for stories */
function DateRangePickerWrapper(args: any) {
	const [range, setRange] = useState<DateRange>(args.value);
	return <DateRangePicker {...args} value={range} onChange={setRange} />;
}

/** Default state - last 7 days */
export const Default: Story = {
	render: (args) => <DateRangePickerWrapper {...args} />,
	args: {
		value: {
			from: "2024-06-22",
			to: "2024-06-29",
		},
		showValidation: true,
	},
};

/** Last 30 days - popular default */
export const Last30Days: Story = {
	render: (args) => <DateRangePickerWrapper {...args} />,
	args: {
		value: {
			from: "2024-05-30",
			to: "2024-06-29",
		},
		showValidation: true,
	},
};

/** Last 90 days - quarterly view */
export const Last90Days: Story = {
	render: (args) => <DateRangePickerWrapper {...args} />,
	args: {
		value: {
			from: "2024-03-31",
			to: "2024-06-29",
		},
		showValidation: true,
	},
};

/** Custom short range - weekend only */
export const WeekendOnly: Story = {
	render: (args) => <DateRangePickerWrapper {...args} />,
	args: {
		value: {
			from: "2024-06-28",
			to: "2024-06-29",
		},
		showValidation: true,
	},
};

/** Single day selection */
export const SingleDay: Story = {
	render: (args) => <DateRangePickerWrapper {...args} />,
	args: {
		value: {
			from: "2024-06-29",
			to: "2024-06-29",
		},
		showValidation: true,
	},
};

/** With custom max date - historical analysis */
export const HistoricalData: Story = {
	render: (args) => <DateRangePickerWrapper {...args} />,
	args: {
		value: {
			from: "2023-12-01",
			to: "2023-12-31",
		},
		maxDate: "2023-12-31",
		showValidation: true,
	},
};

/** Allow future dates - for projections */
export const WithFutureDates: Story = {
	render: (args) => <DateRangePickerWrapper {...args} />,
	args: {
		value: {
			from: "2024-06-29",
			to: "2024-07-15",
		},
		validationOptions: {
			allowFuture: true,
		},
		showValidation: true,
	},
};

/** Strict 30-day limit */
export const Strict30DayLimit: Story = {
	render: (args) => <DateRangePickerWrapper {...args} />,
	args: {
		value: {
			from: "2024-06-01",
			to: "2024-06-29",
		},
		validationOptions: {
			maxDays: 30,
		},
		showValidation: true,
	},
};

/** Limited historical access - 1 year */
export const OneYearHistory: Story = {
	render: (args) => <DateRangePickerWrapper {...args} />,
	args: {
		value: {
			from: "2023-12-01",
			to: "2024-06-29",
		},
		validationOptions: {
			maxYearsBack: 1,
		},
		showValidation: true,
	},
};

/** Validation disabled */
export const NoValidation: Story = {
	render: (args) => <DateRangePickerWrapper {...args} />,
	args: {
		value: {
			from: "2024-06-01",
			to: "2024-06-29",
		},
		showValidation: false,
	},
};

/** With validation callback */
export const WithValidationCallback: Story = {
	render: (args) => <DateRangePickerWrapper {...args} />,
	args: {
		value: {
			from: "2024-06-15",
			to: "2024-06-29",
		},
		showValidation: true,
		onValidationChange: (validation) => {
			console.log("Validation state:", validation);
		},
	},
};

/** With error toast callback */
export const WithErrorToast: Story = {
	render: (args) => <DateRangePickerWrapper {...args} />,
	args: {
		value: {
			from: "2024-06-15",
			to: "2024-06-29",
		},
		showValidation: true,
		onValidationError: (message) => {
			console.log("Validation error:", message);
			// In real usage, this would trigger a toast notification
		},
	},
};

/** Year-to-date view */
export const YearToDate: Story = {
	render: (args) => <DateRangePickerWrapper {...args} />,
	args: {
		value: {
			from: "2024-01-01",
			to: "2024-06-29",
		},
		showValidation: true,
	},
};

/** Quarter view - Q2 2024 */
export const QuarterView: Story = {
	render: (args) => <DateRangePickerWrapper {...args} />,
	args: {
		value: {
			from: "2024-04-01",
			to: "2024-06-30",
		},
		showValidation: true,
	},
};

/** Month view - June 2024 */
export const MonthView: Story = {
	render: (args) => <DateRangePickerWrapper {...args} />,
	args: {
		value: {
			from: "2024-06-01",
			to: "2024-06-29",
		},
		showValidation: true,
	},
};
