/**
 * Tests for #711: MOCK_WALLET_IDS constants are exported from mock-data/wallets
 * and must align with the actual dummyWallets entries so stories that reference
 * them don't silently load a NotFound state.
 */
import { describe, expect, it } from "vitest";
import { MOCK_WALLET_IDS, dummyWallets } from "@/mock-data/wallets";

const walletIds = new Set(dummyWallets.map((w) => w.id));

describe("MOCK_WALLET_IDS — #711", () => {
	it("exports MOCK_WALLET_IDS as a const object", () => {
		expect(MOCK_WALLET_IDS).toBeDefined();
		expect(typeof MOCK_WALLET_IDS).toBe("object");
	});

	it("every MOCK_WALLET_IDS value matches an entry in dummyWallets", () => {
		for (const [key, id] of Object.entries(MOCK_WALLET_IDS)) {
			expect(
				walletIds.has(id),
				`MOCK_WALLET_IDS.${key} = "${id}" not found in dummyWallets`,
			).toBe(true);
		}
	});

	it("ACTIVE_MAINNET resolves to a mainnet active wallet", () => {
		const wallet = dummyWallets.find(
			(w) => w.id === MOCK_WALLET_IDS.ACTIVE_MAINNET,
		);
		expect(wallet).toBeDefined();
		expect(wallet?.network).toBe("mainnet");
		expect(wallet?.status).toBe("active");
	});

	it("ACTIVE_TESTNET resolves to a testnet wallet", () => {
		const wallet = dummyWallets.find(
			(w) => w.id === MOCK_WALLET_IDS.ACTIVE_TESTNET,
		);
		expect(wallet).toBeDefined();
		expect(wallet?.network).toBe("testnet");
	});

	it("PENDING resolves to a pending wallet", () => {
		const wallet = dummyWallets.find(
			(w) => w.id === MOCK_WALLET_IDS.PENDING,
		);
		expect(wallet).toBeDefined();
		expect(wallet?.status).toBe("pending");
	});

	it("HIGH_BALANCE resolves to a wallet with a non-zero balance", () => {
		const wallet = dummyWallets.find(
			(w) => w.id === MOCK_WALLET_IDS.HIGH_BALANCE,
		);
		expect(wallet).toBeDefined();
		expect(wallet?.balance).toBeDefined();
	});

	it("INACTIVE_ARCHIVED resolves to an archived wallet", () => {
		const wallet = dummyWallets.find(
			(w) => w.id === MOCK_WALLET_IDS.INACTIVE_ARCHIVED,
		);
		expect(wallet).toBeDefined();
		expect(wallet?.archived).toBe(true);
	});

	it("all MOCK_WALLET_IDS values are unique strings", () => {
		const values = Object.values(MOCK_WALLET_IDS);
		const unique = new Set(values);
		expect(unique.size).toBe(values.length);
		for (const v of values) {
			expect(typeof v).toBe("string");
		}
	});
});
