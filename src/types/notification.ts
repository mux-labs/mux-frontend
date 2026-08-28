/** A single entry in the notifications center feed. */
export interface AppNotification {
	id: string;
	title: string;
	description: string;
	createdAt: Date;
	read: boolean;
	network?: "testnet" | "mainnet";
}
