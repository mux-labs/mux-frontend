export interface Wallet {
	id: string;
	address: string;
	network: "testnet" | "mainnet";
	status: "active" | "pending" | "inactive";
	createdAt: Date;
	balance?: string;
	lastActivity?: Date;
}

export type WalletNetwork = Wallet["network"];
export type WalletStatus = Wallet["status"];

export interface WalletTableProps {
	wallets: Wallet[];
}