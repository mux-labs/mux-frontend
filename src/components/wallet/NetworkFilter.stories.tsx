import type { Meta, StoryObj } from "@storybook/react";
import { fn } from "@storybook/test";
import { useState } from "react";
import type { WalletNetwork } from "@/types/wallet";
import { NetworkFilter } from "./NetworkFilter";

const meta: Meta<typeof NetworkFilter> = {
	title: "Wallet/NetworkFilter",
	component: NetworkFilter,
	tags: ["autodocs"],
	parameters: {
		layout: "centered",
	},
	argTypes: {
		selectedNetwork: {
			control: "select",
			options: ["all", "mainnet", "testnet"],
			description: "Currently active network filter",
		},
		disabled: {
			control: "boolean",
			description: "Disable all filter buttons",
		},
	},
	args: {
		onNetworkChange: fn(),
	},
};

export default meta;
type Story = StoryObj<typeof NetworkFilter>;

export const AllNetworks: Story = {
	args: {
		selectedNetwork: "all",
	},
};

export const MainnetSelected: Story = {
	args: {
		selectedNetwork: "mainnet",
	},
};

export const TestnetSelected: Story = {
	args: {
		selectedNetwork: "testnet",
	},
};

export const Disabled: Story = {
	args: {
		selectedNetwork: "all",
		disabled: true,
	},
};

/** Interactive story — click buttons to switch the selected network. */
export const Interactive: Story = {
	render: () => {
		const [network, setNetwork] = useState<WalletNetwork | "all">("all");
		return (
			<div className="space-y-3">
				<NetworkFilter
					selectedNetwork={network}
					onNetworkChange={setNetwork}
				/>
				<p className="text-sm text-zinc-500">
					Selected: <strong>{network}</strong>
				</p>
			</div>
		);
	},
};

/** Simulates a narrow mobile viewport. */
export const MobileLayout: Story = {
	parameters: {
		viewport: { defaultViewport: "mobile1" },
	},
	render: () => {
		const [network, setNetwork] = useState<WalletNetwork | "all">("all");
		return (
			<NetworkFilter
				selectedNetwork={network}
				onNetworkChange={setNetwork}
				className="w-full"
			/>
		);
	},
};
