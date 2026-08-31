import type { Wallet } from "@/types/wallet";

/**
 * Canonical IDs for the in-repo mock wallets.
 *
 * Use these constants wherever a test or story needs to reference a mock
 * wallet by ID — never hardcode the strings directly. That way a future
 * rename only needs to happen here (#711).
 *
 * These IDs are only meaningful in mock/dev mode. In production the IDs
 * come from the real backend and these constants are never used.
 */
export const MOCK_WALLET_IDS = {
	/** Mainnet active wallet with a healthy balance. */
	ACTIVE_MAINNET: "wallet-001",
	/** Testnet active wallet. */
	ACTIVE_TESTNET: "wallet-002",
	/** Mainnet wallet in `pending` status. */
	PENDING: "wallet-003",
	/** High-balance testnet wallet. */
	HIGH_BALANCE: "wallet-004",
	/** Archived inactive mainnet wallet. */
	INACTIVE_ARCHIVED: "wallet-005",
	/** Active mainnet wallet with moderate balance. */
	ACTIVE_MAINNET_2: "wallet-006",
	/** Testnet pending wallet. */
	PENDING_TESTNET: "wallet-007",
	/** Active mainnet wallet. */
	ACTIVE_MAINNET_3: "wallet-008",
	/** Archived inactive testnet wallet. */
	INACTIVE_ARCHIVED_TESTNET: "wallet-009",
	/** Mainnet pending wallet with balance. */
	PENDING_WITH_BALANCE: "wallet-010",
} as const;

export type MockWalletId = (typeof MOCK_WALLET_IDS)[keyof typeof MOCK_WALLET_IDS];

export const dummyWallets: Wallet[] = [
	{
		id: "wallet-001",
		address: "GBZXN7PIRZGNMHGA7MUUUF4GWPY5AYPV6LY4UV2GL6VJGIQRXFDNMADI",
		network: "mainnet",
		status: "active",
		createdAt: new Date("2024-01-15T10:30:00Z"),
		balance: "1,250.50 XLM",
		lastActivity: new Date("2025-01-20T14:22:00Z"),
	},
	{
		id: "wallet-002",
		address: "GCFONE23AB7Y6C5YZOMKUKGETPIAJA752ZPMORQO5VKA6LHXHC7Y3YPE",
		network: "testnet",
		status: "active",
		createdAt: new Date("2024-02-20T08:15:00Z"),
		balance: "500.00 XLM",
		lastActivity: new Date("2025-01-19T09:45:00Z"),
	},
	{
		id: "wallet-003",
		address: "GDQP2KPQGKIHYJGXNUIYOMHARUARCA7DJT5FO2FFOOBER7KKQOAVSMIA",
		network: "mainnet",
		status: "pending",
		createdAt: new Date("2024-03-10T16:45:00Z"),
		balance: "0.00 XLM",
	},
	{
		id: "wallet-004",
		address: "GCKFBEIYV2U22IO2BJ4KVJOIP7XPWQGQFKKWXR6DOSJBV7STMAQSMTRQ",
		network: "testnet",
		status: "active",
		createdAt: new Date("2024-04-05T12:00:00Z"),
		balance: "10,000.00 XLM",
		lastActivity: new Date("2025-01-21T11:30:00Z"),
	},
	{
		id: "wallet-005",
		address: "GBDEVU63Y6NTHJQQZIKVTC23NWLQVP3WJ2RI2OTSJTNYOIGICST6DUXR",
		network: "mainnet",
		status: "inactive",
		createdAt: new Date("2023-12-01T09:00:00Z"),
		balance: "75.25 XLM",
		lastActivity: new Date("2024-06-15T18:00:00Z"),
		archived: true,
	},
	{
		id: "wallet-006",
		address: "GCXKG6RN4ONIEPCMNFB732A436Z5PNDSRLGWK7GBLCMQLIFO4S7EYWVU",
		network: "mainnet",
		status: "active",
		createdAt: new Date("2024-05-18T14:20:00Z"),
		balance: "3,500.00 XLM",
		lastActivity: new Date("2025-01-22T08:15:00Z"),
	},
	{
		id: "wallet-007",
		address: "GDZRG6BKQC2A4JGNLQWBVL7Q5BJORQ6JMO5UVLVJS4THCL7T7HGPMEZA",
		network: "testnet",
		status: "pending",
		createdAt: new Date("2024-06-22T11:10:00Z"),
	},
	{
		id: "wallet-008",
		address: "GBHB7DKQKJACQI5MJPJRPNQVXCQ3LQKBOXQ3MLCZOLVTPASAHURA7Y6Y",
		network: "mainnet",
		status: "active",
		createdAt: new Date("2024-07-30T17:55:00Z"),
		balance: "890.75 XLM",
		lastActivity: new Date("2025-01-18T20:40:00Z"),
	},
	{
		id: "wallet-009",
		address: "GCWCFS7KIMCNZPNB4FQXLDQ7B5ZENCLXQ5T5P7DL7S4QBKM2DPZTGWYA",
		network: "testnet",
		status: "inactive",
		createdAt: new Date("2024-08-12T06:30:00Z"),
		balance: "0.00 XLM",
		lastActivity: new Date("2024-09-01T12:00:00Z"),
		archived: true,
	},
	{
		id: "wallet-010",
		address: "GDMQQNJM4UL7QIA66XMOPRZLCLBQSRXKCLR4DQFRNG7XWZLWQY6RXHPQ",
		network: "mainnet",
		status: "pending",
		createdAt: new Date("2024-09-25T13:40:00Z"),
		balance: "250.00 XLM",
	},
];
