import type { Meta, StoryObj } from "@storybook/react";
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
		onNetworkChange: { action: "network changed" },
	},
};

export default meta;
type Story = StoryObj<typeof NetworkFilter>;

export const AllSelected: Story = {
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
				<NetworkFilter selectedNetwork={network} onNetworkChange={setNetwork} />
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
