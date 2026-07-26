import type { Meta, StoryObj } from "@storybook/react";
import { AnalyticsExportButton } from "./AnalyticsExportButton";
import type { ExportFormat, ExportStatus } from "@/types/analytics";
import { useState } from "react";

/**
 * AnalyticsExportButton provides data export functionality for the analytics dashboard.
 * 
 * Features:
 * - Split-button design (CSV / JSON formats)
 * - Visual status feedback (idle, exporting, success, error)
 * - Loading spinner during export
 * - Success checkmark on completion
 * - Error message with dismiss action
 * - Row count display
 * - Empty state handling (disabled when no data)
 * - Accessibility compliant with ARIA labels
 * 
 * States:
 * - idle: Ready to export
 * - exporting: Loading spinner shown
 * - success: Checkmark icon shown briefly
 * - error: Error message with dismiss button
 */
const meta = {
	title: "Analytics/AnalyticsExportButton",
	component: AnalyticsExportButton,
	tags: ["autodocs"],
	parameters: {
		layout: "centered",
		docs: {
			description: {
				component:
					"Export control for analytics data with CSV/JSON format options and comprehensive state management.",
			},
		},
	},
	argTypes: {
		status: {
			description: "Current export status",
			control: "select",
			options: ["idle", "exporting", "success", "error"],
		},
		errorMessage: {
			description: "Error message shown when status is 'error'",
			control: "text",
		},
		onExport: {
			description: "Callback when user selects an export format",
		},
		onReset: {
			description: "Callback when user dismisses an error",
		},
		rowCount: {
			description: "Number of rows that will be exported",
			control: "number",
		},
	},
} satisfies Meta<typeof AnalyticsExportButton>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Interactive wrapper for stateful stories */
function InteractiveExportButton(args: any) {
	const [status, setStatus] = useState<ExportStatus>(args.status || "idle");
	const [errorMessage, setErrorMessage] = useState<string | null>(
		args.errorMessage || null,
	);

	const handleExport = (format: ExportFormat) => {
		setStatus("exporting");
		// Simulate export process
		setTimeout(() => {
			setStatus("success");
			setTimeout(() => setStatus("idle"), 2000);
		}, 1500);
	};

	const handleReset = () => {
		setStatus("idle");
		setErrorMessage(null);
	};

	return (
		<AnalyticsExportButton
			{...args}
			status={status}
			errorMessage={errorMessage}
			onExport={handleExport}
			onReset={handleReset}
		/>
	);
}

/** Default idle state - ready to export */
export const Default: Story = {
	args: {
		status: "idle",
		errorMessage: null,
		onExport: (format) => console.log(`Exporting as ${format}`),
		onReset: () => console.log("Reset"),
		rowCount: 150,
	},
};

/** Interactive version - full export flow */
export const Interactive: Story = {
	render: (args) => <InteractiveExportButton {...args} />,
	args: {
		rowCount: 150,
	},
};

/** Exporting state - loading spinner visible */
export const Exporting: Story = {
	args: {
		status: "exporting",
		errorMessage: null,
		onExport: (format) => console.log(`Exporting as ${format}`),
		onReset: () => console.log("Reset"),
		rowCount: 150,
	},
};

/** Success state - checkmark visible */
export const Success: Story = {
	args: {
		status: "success",
		errorMessage: null,
		onExport: (format) => console.log(`Exporting as ${format}`),
		onReset: () => console.log("Reset"),
		rowCount: 150,
	},
};

/** Error state - with error message and dismiss */
export const Error: Story = {
	args: {
		status: "error",
		errorMessage: "Failed to export data. Please try again.",
		onExport: (format) => console.log(`Exporting as ${format}`),
		onReset: () => console.log("Reset"),
		rowCount: 150,
	},
};

/** Network error - specific error message */
export const NetworkError: Story = {
	args: {
		status: "error",
		errorMessage: "Network connection failed. Check your internet connection.",
		onExport: (format) => console.log(`Exporting as ${format}`),
		onReset: () => console.log("Reset"),
		rowCount: 150,
	},
};

/** Permission error - authorization issue */
export const PermissionError: Story = {
	args: {
		status: "error",
		errorMessage:
			"You don't have permission to export this data. Contact your administrator.",
		onExport: (format) => console.log(`Exporting as ${format}`),
		onReset: () => console.log("Reset"),
		rowCount: 150,
	},
};

/** Empty state - no data to export */
export const NoData: Story = {
	args: {
		status: "idle",
		errorMessage: null,
		onExport: (format) => console.log(`Exporting as ${format}`),
		onReset: () => console.log("Reset"),
		rowCount: 0,
	},
};

/** Single row */
export const SingleRow: Story = {
	args: {
		status: "idle",
		errorMessage: null,
		onExport: (format) => console.log(`Exporting as ${format}`),
		onReset: () => console.log("Reset"),
		rowCount: 1,
	},
};

/** Small dataset */
export const SmallDataset: Story = {
	args: {
		status: "idle",
		errorMessage: null,
		onExport: (format) => console.log(`Exporting as ${format}`),
		onReset: () => console.log("Reset"),
		rowCount: 15,
	},
};

/** Large dataset */
export const LargeDataset: Story = {
	args: {
		status: "idle",
		errorMessage: null,
		onExport: (format) => console.log(`Exporting as ${format}`),
		onReset: () => console.log("Reset"),
		rowCount: 10000,
	},
};

/** Very large dataset - millions of rows */
export const VeryLargeDataset: Story = {
	args: {
		status: "idle",
		errorMessage: null,
		onExport: (format) => console.log(`Exporting as ${format}`),
		onReset: () => console.log("Reset"),
		rowCount: 2458392,
	},
};
