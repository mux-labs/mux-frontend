import type { Meta, StoryObj } from "@storybook/react";
import { MOCK_WALLET_IDS } from "@/mock-data/wallets";
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
 * **Mock vs production split (#711):**
 * Stories use wallet IDs sourced from `MOCK_WALLET_IDS` in
 * `src/mock-data/wallets.ts` — never hardcoded strings — so a single
 * rename propagates everywhere. These IDs are only meaningful in the
 * mock/dev/Storybook environment; in production the IDs come from the
 * real backend and `WalletDetail` fetches by the ID passed via the route
 * param.
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
	args: { id: MOCK_WALLET_IDS.ACTIVE_MAINNET },
};

/**
 * A testnet wallet — shown to confirm the Network badge renders the correct
 * amber colour scheme for testnet wallets.
 */
export const Testnet: Story = {
	args: { id: MOCK_WALLET_IDS.ACTIVE_TESTNET },
};

/**
 * A wallet in `pending` status. Confirms the pulsing yellow badge and that
 * the address copy / refresh actions remain fully functional.
 */
export const Pending: Story = {
	args: { id: MOCK_WALLET_IDS.PENDING },
};

/**
 * An `inactive` wallet with a non-zero balance and no recent activity.
 * The grey status badge should be displayed.
 */
export const Inactive: Story = {
	args: { id: MOCK_WALLET_IDS.INACTIVE_ARCHIVED },
};

/**
 * A high-balance wallet — useful for verifying that large numbers are
 * formatted correctly inside the balance card.
 */
export const HighBalance: Story = {
	args: { id: MOCK_WALLET_IDS.HIGH_BALANCE },
};

/**
 * Requesting an ID that does not exist in the mock data.
 * The component should transition to the full-page ErrorState with a retry
 * button after the fetch promise rejects.
 */
export const NotFound: Story = {
	args: { id: "wallet-does-not-exist" },
};
