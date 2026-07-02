import type { Meta, StoryObj } from "@storybook/react";
import { NetworkBadge } from "./NetworkBadge";

const meta: Meta<typeof NetworkBadge> = {
	title: "Wallet/NetworkBadge",
	component: NetworkBadge,
	tags: ["autodocs"],
	parameters: {
		layout: "centered",
	},
	argTypes: {
		network: {
			control: "select",
			options: ["mainnet", "testnet"],
			description: "The network type to display",
		},
		className: { control: "text" },
	},
};

export default meta;
type Story = StoryObj<typeof NetworkBadge>;

export const Mainnet: Story = {
	args: {
		network: "mainnet",
	},
};

export const Testnet: Story = {
	args: {
		network: "testnet",
	},
};

/** Falls back to mainnet when an invalid network value is provided. */
export const InvalidFallback: Story = {
	args: { network: "unknown" as never },
};

export const WithCustomClass: Story = {
	args: { network: "testnet", className: "text-base px-4 py-1" },
};

/** Both badges side-by-side for comparison. */
export const AllVariants: Story = {
	render: () => (
		<div className="flex gap-3">
			<NetworkBadge network="mainnet" />
			<NetworkBadge network="testnet" />
		</div>
	),
};
