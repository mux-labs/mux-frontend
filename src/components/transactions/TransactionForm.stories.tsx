import type { Meta, StoryObj } from "@storybook/react";
import { TransactionForm } from "./TransactionForm";

/**
 * TransactionForm provides a controlled form for sending transactions
 * with built-in client-side validation, loading states, and accessibility support.
 *
 * ## Features
 * - Amount field with decimal validation (max 6 decimal places)
 * - Recipient address field with blockchain address format validation
 * - Optional memo/note field (max 500 characters)
 * - Real-time validation on blur
 * - Full validation on submit
 * - Loading/spinner state during submission
 * - Accessible with aria attributes
 *
 * ## Usage
 * ```tsx
 * <TransactionForm
 *   onSubmit={(data) => console.log("Submit:", data)}
 *   isSubmitting={false}
 * />
 * ```
 */
const meta = {
	title: "Transactions/TransactionForm",
	component: TransactionForm,
	parameters: {
		layout: "centered",
	},
	tags: ["autodocs"],
	argTypes: {
		onSubmit: { action: "submitted" },
		isSubmitting: {
			control: "boolean",
			description: "Whether the form is in submitting state",
		},
		className: {
			control: "text",
			description: "Additional CSS class names",
		},
	},
} satisfies Meta<typeof TransactionForm>;

export default meta;
type Story = StoryObj<typeof TransactionForm>;

/** Default form in its initial state */
export const Default: Story = {
	args: {
		onSubmit: (data) => console.log("Submitted:", data),
		isSubmitting: false,
	},
};

/** Form in a submitting/loading state with all fields disabled */
export const Submitting: Story = {
	args: {
		onSubmit: (data) => console.log("Submitted:", data),
		isSubmitting: true,
	},
};

/** Form with pre-filled data for editing/review */
export const WithPrefilledData: Story = {
	args: {
		onSubmit: (data) => console.log("Submitted:", data),
		isSubmitting: false,
	},
	/**
	 * Note: In a real scenario, TransactionForm would need controlled
	 * initial values. For now, users can type into the fields in the
	 * Storybook canvas to test validation interactively.
	 */
};

/**
 * Custom styled form wrapped in a narrow container.
 * Demonstrates how the form adapts to different widths.
 */
export const NarrowContainer: Story = {
	args: {
		onSubmit: (data) => console.log("Submitted:", data),
		isSubmitting: false,
		className: "max-w-xs",
	},
	parameters: {
		layout: "centered",
	},
};
