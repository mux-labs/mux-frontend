import type { Meta, StoryObj } from "@storybook/react";
import { WalletDetail } from "./WalletDetail";

/**
 * `WalletDetail` shows live balance and full metadata for a single wallet.
 *
 * It polls the backend on a 30-second interval and provides:
 * - One-click address copy with toast confirmation
 * - Manual balance refresh with toast feedback
 * - Skeleton loading state while data is in flight
 * - Full-page error state when the wallet cannot be found
 *
 * All stories use wallet IDs from the project's mock-data layer so no real
 * network calls are made.
 */
const meta = {
	title: "Wallet/WalletDetail",
	component: WalletDetail,
	tags: ["autodocs"],
	parameters: {
		layout: "padded",
		docs: {
			description: {
				component:
					"Displays live balance and metadata for a single wallet identified by its ID.",
			},
		},
	},
	argTypes: {
		id: {
			control: "text",
			description:
				"Unique wallet identifier. Must match an entry in the mock-data layer (or a real backend ID in production).",
			table: {
				type: { summary: "string" },
			},
		},
	},
} satisfies Meta<typeof WalletDetail>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * A mainnet wallet with an active status and a healthy balance.
 * Demonstrates the fully-loaded state after the initial fetch resolves.
 */
export const Active: Story = {
	args: { id: "wallet-001" },
};

/**
 * A testnet wallet — shown to confirm the Network badge renders the correct
 * amber colour scheme for testnet wallets.
 */
export const Testnet: Story = {
	args: { id: "wallet-002" },
};

/**
 * A wallet in `pending` status. Confirms the pulsing yellow badge and that
 * the address copy / refresh actions remain fully functional.
 */
export const Pending: Story = {
	args: { id: "wallet-003" },
};

/**
 * An `inactive` wallet with a non-zero balance and no recent activity.
 * The grey status badge should be displayed.
 */
export const Inactive: Story = {
	args: { id: "wallet-005" },
};

/**
 * A high-balance wallet — useful for verifying that large numbers are
 * formatted correctly inside the balance card.
 */
export const HighBalance: Story = {
	args: { id: "wallet-004" },
};

/**
 * Requesting an ID that does not exist in the mock data.
 * The component should transition to the full-page ErrorState with a retry
 * button after the fetch promise rejects.
 */
export const NotFound: Story = {
	args: { id: "wallet-does-not-exist" },
};
