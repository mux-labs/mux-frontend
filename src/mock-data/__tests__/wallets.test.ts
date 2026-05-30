import { describe, expect, it } from "vitest";
import { dummyWallets } from "../wallets";

describe("dummyWallets", () => {
	it("contains 10 wallets", () => {
		expect(dummyWallets).toHaveLength(10);
	});

	it("every wallet has required fields", () => {
		for (const wallet of dummyWallets) {
			expect(wallet.id).toBeTruthy();
			expect(wallet.address).toBeTruthy();
			expect(["mainnet", "testnet"]).toContain(wallet.network);
			expect(["active", "pending", "inactive"]).toContain(wallet.status);
			expect(wallet.createdAt).toBeInstanceOf(Date);
		}
	});

	it("all wallet ids are unique", () => {
		const ids = dummyWallets.map((w) => w.id);
		expect(new Set(ids).size).toBe(ids.length);
	});

	it("all wallet addresses are unique", () => {
		const addresses = dummyWallets.map((w) => w.address);
		expect(new Set(addresses).size).toBe(addresses.length);
	});

	it("contains wallets on both mainnet and testnet", () => {
		const networks = new Set(dummyWallets.map((w) => w.network));
		expect(networks.has("mainnet")).toBe(true);
		expect(networks.has("testnet")).toBe(true);
	});

	it("contains all three status values", () => {
		const statuses = new Set(dummyWallets.map((w) => w.status));
		expect(statuses.has("active")).toBe(true);
		expect(statuses.has("pending")).toBe(true);
		expect(statuses.has("inactive")).toBe(true);
	});

	it("total wallet count matches expected value for dashboard stat", () => {
		// This is the value the dashboard home page will display
		expect(dummyWallets.length).toBe(10);
	});
});
