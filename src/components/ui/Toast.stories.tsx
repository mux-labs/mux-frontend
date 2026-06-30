import type { Meta, StoryObj } from "@storybook/react";
import { ToastContainer, ToastItem } from "./Toast";

/**
 * Toast notification components for displaying feedback messages.
 *
 * ## ToastItem
 * A single toast notification with auto-dismiss functionality.
 * Supports four types: success, error, info, and warning.
 *
 * ## ToastContainer
 * Container that renders a stack of toast notifications with configurable positioning.
 *
 * ## useToast Hook
 * React hook for managing toast state (add/dismiss).
 */
const meta = {
	title: "UI/Toast",
	component: ToastContainer,
	parameters: {
		layout: "fullscreen",
	},
	tags: ["autodocs"],
} satisfies Meta<typeof ToastContainer>;

export default meta;
type Story = StoryObj<typeof ToastContainer>;

/** Default toast container with multiple notification types */
export const Default: Story = {
	args: {
		position: "top-right",
		toasts: [
			{
				id: "1",
				type: "info",
				message: "This is an info message",
				description: "Additional details about the info.",
			},
			{
				id: "2",
				type: "success",
				message: "Transaction completed successfully!",
			},
			{
				id: "3",
				type: "warning",
				message: "Warning: Low balance",
				description: "Your balance is below 10 MUX.",
			},
			{
				id: "4",
				type: "error",
				message: "Transaction failed",
				description: "Insufficient funds for gas.",
			},
		],
		onDismiss: (id: string) => console.log("Dismissed:", id),
	},
};

/** Shows only a success toast */
export const Success: Story = {
	args: {
		position: "top-right",
		toasts: [
			{
				id: "1",
				type: "success",
				message: "Transaction sent successfully!",
				description: "Your transaction has been broadcast to the network.",
			},
		],
		onDismiss: (id: string) => console.log("Dismissed:", id),
	},
};

/** Shows only an error toast */
export const Error: Story = {
	args: {
		position: "top-right",
		toasts: [
			{
				id: "1",
				type: "error",
				message: "Transaction failed",
				description: "An unexpected error occurred. Please try again.",
			},
		],
		onDismiss: (id: string) => console.log("Dismissed:", id),
	},
};

/** Empty state - no toasts to display */
export const Empty: Story = {
	args: {
		position: "top-right",
		toasts: [],
		onDismiss: (id: string) => console.log("Dismissed:", id),
	},
};

/** Bottom-left positioning */
export const BottomLeft: Story = {
	args: {
		position: "bottom-left",
		toasts: [
			{ id: "1", type: "info", message: "Positioned at bottom-left" },
			{ id: "2", type: "success", message: "Operation completed!" },
		],
		onDismiss: (id: string) => console.log("Dismissed:", id),
	},
};

/** ToastItem standalone stories */

export const SingleInfo: StoryObj<typeof ToastItem> = {
	render: () => (
		<ToastItem
			toast={{
				id: "1",
				type: "info",
				message: "Info notification",
				description: "This is an informational message.",
			}}
			onDismiss={(id) => console.log("Dismissed:", id)}
		/>
	),
};

export const SingleSuccess: StoryObj<typeof ToastItem> = {
	render: () => (
		<ToastItem
			toast={{
				id: "1",
				type: "success",
				message: "Success notification",
				description: "Operation completed successfully.",
			}}
			onDismiss={(id) => console.log("Dismissed:", id)}
		/>
	),
};

export const SingleWarning: StoryObj<typeof ToastItem> = {
	render: () => (
		<ToastItem
			toast={{
				id: "1",
				type: "warning",
				message: "Warning notification",
				description: "Please be aware of this warning.",
			}}
			onDismiss={(id) => console.log("Dismissed:", id)}
		/>
	),
};

export const SingleError: StoryObj<typeof ToastItem> = {
	render: () => (
		<ToastItem
			toast={{
				id: "1",
				type: "error",
				message: "Error notification",
				description: "Something went wrong.",
			}}
			onDismiss={(id) => console.log("Dismissed:", id)}
		/>
	),
};
