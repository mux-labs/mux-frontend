import type { Meta, StoryObj } from "@storybook/react";
import { fn } from "@storybook/test";
import type { Wallet } from "@/types/wallet";
import ReceiveWalletModal from "./ReceiveWalletModal";

// ─── Mock wallets ─────────────────────────────────────────────────────────────

const activeWallet: Wallet = {
	id: "wallet-001",
	address: "GBZXN7PIRZGNMHGA7MUUUF4GWPY5AYPV6LY4UV2GL6VJGIQRXFDNMADI",
	label: "Main Treasury",
	network: "mainnet",
	status: "active",
	createdAt: new Date("2024-01-15T10:30:00Z"),
	balance: "1,250.50 XLM",
};

const pendingWallet: Wallet = {
	id: "wallet-002",
	address: "GCFONE23AB7Y6C5YZOMKUKGETPIAJA752ZPMORQO5VKA6LHXHC7Y3YPE",
	network: "testnet",
	status: "pending",
	createdAt: new Date("2024-02-20T08:15:00Z"),
};

const inactiveWallet: Wallet = {
	id: "wallet-003",
	address: "GDQP2KPQGKIHYJGXNUIYOMHARUARCA7DJT5FO2FFOOBER7KKQOAVSMIA",
	network: "mainnet",
	status: "inactive",
	createdAt: new Date("2023-12-01T09:00:00Z"),
};

const invalidAddressWallet: Wallet = {
	id: "wallet-bad",
	address: "INVALID_ADDRESS",
	network: "mainnet",
	status: "active",
	createdAt: new Date("2024-01-01T00:00:00Z"),
};

// ─── Meta ─────────────────────────────────────────────────────────────────────

const meta: Meta<typeof ReceiveWalletModal> = {
	title: "Wallet/ReceiveWalletModal",
	component: ReceiveWalletModal,
	tags: ["autodocs"],
	parameters: {
		layout: "fullscreen",
	},
	argTypes: {
		isOpen: {
			control: "boolean",
			description: "Controls modal visibility",
		},
		wallet: {
			control: false,
			description: "The wallet whose address and QR stub are shown",
		},
	},
	args: {
		isOpen: true,
		onClose: fn(),
	},
};

export default meta;
type Story = StoryObj<typeof ReceiveWalletModal>;

// ─── Stories ──────────────────────────────────────────────────────────────────

export const ActiveWallet: Story = {
	name: "Active wallet (QR + address)",
	args: {
		wallet: activeWallet,
	},
};

export const PendingWallet: Story = {
	name: "Pending wallet (stale warning)",
	args: {
		wallet: pendingWallet,
	},
};

export const InactiveWallet: Story = {
	name: "Inactive wallet (stale warning)",
	args: {
		wallet: inactiveWallet,
	},
};

export const InvalidAddress: Story = {
	name: "Invalid address (cannot show QR)",
	args: {
		wallet: invalidAddressWallet,
	},
};

export const NoWallet: Story = {
	name: "No wallet loaded (error state)",
	args: {
		wallet: null,
	},
};

export const Closed: Story = {
	args: {
		isOpen: false,
		wallet: activeWallet,
	},
};
