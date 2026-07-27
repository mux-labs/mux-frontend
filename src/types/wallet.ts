/** A Stellar wallet tracked on the platform. */
export interface Wallet {
	/** Unique internal identifier for this wallet record. */
	id: string;
	/** Full 56-character Stellar public key (G-address). */
	address: string;
	/** Optional display name for this wallet. */
	name?: string;
	label?: string;
	network: "testnet" | "mainnet";
	/** Lifecycle status of the wallet. `pending` until confirmed on-chain. */
	status: "active" | "pending" | "inactive";
	/** When the wallet was registered on this platform. */
	createdAt: Date;
	/** Formatted XLM balance string, e.g. `"1,250.50 XLM"`. Absent when not yet fetched. */
	balance?: string;
	/** Timestamp of the most recent on-chain activity, if known. */
	lastActivity?: Date;
	/** Whether the wallet has been archived. Archived wallets are hidden from the default list view. */
	archived?: boolean;
}

export type WalletNetwork = Wallet["network"];
export type WalletStatus = Wallet["status"];

/** Props for the `WalletTable` component. */
export interface WalletTableProps {
	/** The wallets to display. An empty array renders the empty-state message. */
	wallets: Wallet[];
	/**
	 * Called when the user clicks "Add Wallet". Omit to hide the button entirely.
	 */
	onAddWallet?: () => void;
	onCopySuccess?: (address: string) => void;
	onCopyError?: (error: string) => void;
}
