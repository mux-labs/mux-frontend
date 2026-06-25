import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError, fetchWalletById, fetchWallets } from "@/lib/api";

const mockWalletsResponse = [
	{
		id: "w-1",
		address: "GBZXN7PIRZGNMHGA7MUUUF4GWPY5AYPV6LY4UV2GL6VJGIQRXFDNMADI",
		network: "mainnet",
		status: "active",
		createdAt: "2024-01-15T10:30:00Z",
		balance: "100 XLM",
		lastActivity: "2024-06-01T00:00:00Z",
	},
	{
		id: "w-2",
		address: "GCFONE23AB7Y6C5YZOMKUKGETPIAJA752ZPMORQO5VKA6LHXHC7Y3YPE",
		network: "testnet",
		status: "pending",
		createdAt: "2024-02-20T08:15:00Z",
	},
];

describe("fetchWallets", () => {
	beforeEach(() => {
		vi.stubGlobal("fetch", vi.fn());
	});

	afterEach(() => {
		vi.unstubAllGlobals();
	});

	it("returns wallets with Date objects on success", async () => {
		vi.mocked(fetch).mockResolvedValueOnce({
			ok: true,
			json: async () => mockWalletsResponse,
		} as Response);

		const wallets = await fetchWallets();

		expect(wallets).toHaveLength(2);
		expect(wallets[0].createdAt).toBeInstanceOf(Date);
		expect(wallets[0].lastActivity).toBeInstanceOf(Date);
		expect(wallets[1].lastActivity).toBeUndefined();
		expect(wallets[0].network).toBe("mainnet");
	});

	it("throws ApiError on non-ok response", async () => {
		vi.mocked(fetch).mockResolvedValue({
			ok: false,
			status: 500,
			statusText: "Internal Server Error",
		} as Response);

		await expect(fetchWallets()).rejects.toThrow(ApiError);
		await expect(fetchWallets()).rejects.toThrow("Failed to fetch wallets");
	});

	it("throws on network failure", async () => {
		vi.mocked(fetch).mockRejectedValueOnce(new Error("Network error"));

		await expect(fetchWallets()).rejects.toThrow("Network error");
	});

	it("returns wallet by id when available", async () => {
		vi.mocked(fetch).mockResolvedValueOnce({
			ok: true,
			json: async () => mockWalletsResponse,
		} as Response);

		const wallet = await fetchWalletById("w-2");
		expect(wallet).not.toBeNull();
		expect(wallet?.id).toBe("w-2");
		expect(wallet?.network).toBe("testnet");
	});

	it("returns null for unknown wallet id", async () => {
		vi.mocked(fetch).mockResolvedValueOnce({
			ok: true,
			json: async () => mockWalletsResponse,
		} as Response);

		const wallet = await fetchWalletById("unknown");
		expect(wallet).toBeNull();
	});
});
