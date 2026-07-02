import type { Meta, StoryObj } from "@storybook/react";
import { StatusIndicator } from "./StatusIndicator";

const meta: Meta<typeof StatusIndicator> = {
	title: "Wallet/StatusIndicator",
	component: StatusIndicator,
	tags: ["autodocs"],
	parameters: {
		layout: "centered",
	},
	argTypes: {
		status: {
			control: "select",
			options: ["active", "pending", "inactive"],
			description: "The wallet status to display",
		},
		className: { control: "text" },
	},
};

export default meta;
type Story = StoryObj<typeof StatusIndicator>;

export const Active: Story = {
	args: { status: "active" },
};

export const Pending: Story = {
	args: { status: "pending" },
};

export const Inactive: Story = {
	args: { status: "inactive" },
};

export const AllVariants: Story = {
	render: () => (
		<div className="flex gap-2">
			<StatusIndicator status="active" />
			<StatusIndicator status="pending" />
			<StatusIndicator status="inactive" />
		</div>
	),
};
