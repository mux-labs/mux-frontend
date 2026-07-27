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

/** Rendered in dark mode to verify the dark: contrast variants used on real pages. */
export const DarkMode: Story = {
	args: { network: "testnet" },
	parameters: { backgrounds: { default: "dark" } },
	decorators: [
		(Story) => (
			<div className="dark bg-zinc-950 p-6">
				<Story />
			</div>
		),
	],
};

/**
 * How the badge looks inline with the other wallet metadata it's usually
 * paired with — a quick visual regression check for the wallet table/detail
 * layouts rather than the badge in isolation.
 */
export const InWalletRow: Story = {
	render: () => (
		<div className="flex items-center gap-3 rounded-lg border border-zinc-200 p-3 dark:border-zinc-800">
			<code className="font-mono text-sm text-zinc-700 dark:text-zinc-300">
				GBZX...MADI
			</code>
			<NetworkBadge network="mainnet" />
		</div>
	),
};

/** Long custom className to confirm text/badge sizing doesn't overflow oddly. */
export const CompactSize: Story = {
	args: { network: "mainnet", className: "text-[10px] px-2 py-0" },
};
