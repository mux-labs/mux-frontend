import type { Meta, StoryObj } from "@storybook/react";
import { fn } from "@storybook/test";
import type { Wallet } from "@/types/wallet";
import { WalletTable } from "./WalletTable";

// ─── Mock data ────────────────────────────────────────────────────────────────

const activeMainnet: Wallet = {
	id: "wallet-001",
	address: "GBZXN7PIRZGNMHGA7MUUUF4GWPY5AYPV6LY4UV2GL6VJGIQRXFDNMADI",
	label: "Main Treasury",
	network: "mainnet",
	status: "active",
	createdAt: new Date("2024-01-15T10:30:00Z"),
	balance: "1,250.50 XLM",
	lastActivity: new Date("2025-01-20T14:22:00Z"),
};

const pendingTestnet: Wallet = {
	id: "wallet-002",
	address: "GCFONE23AB7Y6C5YZOMKUKGETPIAJA752ZPMORQO5VKA6LHXHC7Y3YPE",
	network: "testnet",
	status: "pending",
	createdAt: new Date("2024-02-20T08:15:00Z"),
};

const inactiveMainnet: Wallet = {
	id: "wallet-003",
	address: "GDQP2KPQGKIHYJGXNUIYOMHARUARCA7DJT5FO2FFOOBER7KKQOAVSMIA",
	label: "Cold Storage",
	network: "mainnet",
	status: "inactive",
	createdAt: new Date("2023-12-01T09:00:00Z"),
	balance: "75.25 XLM",
	lastActivity: new Date("2024-06-15T18:00:00Z"),
};

const activeTestnet: Wallet = {
	id: "wallet-004",
	address: "GCKFBEIYV2U22IO2BJ4KVJOIP7XPWQGQFKKWXR6DOSJBV7STMAQSMTRQ",
	network: "testnet",
	status: "active",
	createdAt: new Date("2024-04-05T12:00:00Z"),
	balance: "10,000.00 XLM",
	lastActivity: new Date("2025-01-21T11:30:00Z"),
};

// ─── Meta ─────────────────────────────────────────────────────────────────────

const meta: Meta<typeof WalletTable> = {
	title: "Wallet/WalletTable",
	component: WalletTable,
	tags: ["autodocs"],
	parameters: {
		layout: "padded",
	},
	argTypes: {
		wallets: { control: false },
		onAddWallet: { control: false },
		onCopySuccess: { control: false },
		onCopyError: { control: false },
	},
	args: {
		onAddWallet: fn(),
		onCopySuccess: fn(),
		onCopyError: fn(),
	},
};

export default meta;
type Story = StoryObj<typeof WalletTable>;

// ─── Stories ──────────────────────────────────────────────────────────────────

export const SingleWallet: Story = {
	args: {
		wallets: [activeMainnet],
	},
};

export const MultipleWallets: Story = {
	args: {
		wallets: [activeMainnet, pendingTestnet, inactiveMainnet, activeTestnet],
	},
};

export const MainnetOnly: Story = {
	args: {
		wallets: [activeMainnet, inactiveMainnet],
	},
};

export const TestnetOnly: Story = {
	args: {
		wallets: [pendingTestnet, activeTestnet],
	},
};

export const MixedNetworks: Story = {
	name: "Mixed Networks (testnet hint shown)",
	args: {
		wallets: [activeMainnet, pendingTestnet, activeTestnet],
	},
};

export const Empty: Story = {
	args: {
		wallets: [],
	},
};

export const WithoutAddButton: Story = {
	args: {
		wallets: [activeMainnet, pendingTestnet],
		onAddWallet: undefined,
	},
};

export const AllStatuses: Story = {
	args: {
		wallets: [
			{ ...activeMainnet, id: "s1", status: "active" },
			{ ...activeMainnet, id: "s2", status: "pending", balance: undefined },
			{ ...activeMainnet, id: "s3", status: "inactive" },
		],
	},
};
