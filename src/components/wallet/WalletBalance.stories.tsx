import type { Meta, StoryObj } from "@storybook/react";
import { WalletBalance } from "./WalletBalance";

const meta: Meta<typeof WalletBalance> = {
	title: "Wallet/WalletBalance",
	component: WalletBalance,
	tags: ["autodocs"],
	parameters: {
		layout: "centered",
	},
	argTypes: {
		balance: {
			control: "text",
			description: "The balance value to display",
		},
		currency: {
			control: "text",
			description: "Currency code (default: USD)",
		},
		isAllowed: {
			control: "boolean",
			description: "Whether the user has permission to see the balance",
		},
		isLoading: {
			control: "boolean",
			description: "Show loading skeleton",
		},
		isError: {
			control: "boolean",
			description: "Show error state",
		},
	},
	args: {
		currency: "USD",
		isAllowed: true,
		isLoading: false,
		isError: false,
	},
};

export default meta;
type Story = StoryObj<typeof WalletBalance>;

export const WithBalance: Story = {
	args: {
		balance: 1250.5,
	},
};

export const ZeroBalance: Story = {
	args: {
		balance: 0,
	},
};

export const LargeBalance: Story = {
	args: {
		balance: 1234567.891234,
		currency: "USD",
	},
};

export const Loading: Story = {
	args: {
		balance: 1000,
		isLoading: true,
	},
};

export const ErrorState: Story = {
	args: {
		balance: null,
		isError: true,
	},
};

export const NotAllowed: Story = {
	args: {
		balance: 999.99,
		isAllowed: false,
	},
};

export const InvalidBalance: Story = {
	args: {
		balance: null,
	},
};
