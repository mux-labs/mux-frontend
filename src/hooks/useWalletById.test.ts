import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useWalletById } from "@/hooks/useWalletById";
import * as api from "@/lib/api";
import type { Wallet } from "@/types/wallet";

const mockWallet: Wallet = {
	id: "w-1",
	address: "GBZXN7PIRZGNMHGA7MUUUF4GWPY5AYPV6LY4UV2GL6VJGIQRXFDNMADI",
	network: "mainnet",
	status: "active",
	createdAt: new Date("2024-01-15"),
};

describe("useWalletById", () => {
	beforeEach(() => {
		vi.spyOn(api, "fetchWalletById");
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	it("starts in loading state", () => {
		vi.mocked(api.fetchWalletById).mockResolvedValue(mockWallet);
		const { result } = renderHook(() => useWalletById(mockWallet.id));

		expect(result.current.loading).toBe(true);
		expect(result.current.wallet).toBeNull();
		expect(result.current.error).toBeNull();
	});

	it("loads wallet successfully", async () => {
		vi.mocked(api.fetchWalletById).mockResolvedValue(mockWallet);
		const { result } = renderHook(() => useWalletById(mockWallet.id));

		await waitFor(() => expect(result.current.loading).toBe(false));

		expect(result.current.wallet).toEqual(mockWallet);
		expect(result.current.error).toBeNull();
	});

	it("sets error on failure", async () => {
		vi.mocked(api.fetchWalletById).mockRejectedValue(new Error("Server error"));
		const { result } = renderHook(() => useWalletById(mockWallet.id));

		await waitFor(() => expect(result.current.loading).toBe(false));

		expect(result.current.error).toBe("Server error");
		expect(result.current.wallet).toBeNull();
	});

	it("refetch reloads wallet", async () => {
		vi.mocked(api.fetchWalletById).mockResolvedValueOnce(mockWallet);
		const { result } = renderHook(() => useWalletById(mockWallet.id));

		await waitFor(() => expect(result.current.loading).toBe(false));

		const updatedWallet: Wallet = { ...mockWallet, status: "inactive" };
		vi.mocked(api.fetchWalletById).mockResolvedValue(updatedWallet);

		act(() => result.current.refetch());

		await waitFor(() => expect(result.current.loading).toBe(false));
		expect(result.current.wallet).toEqual(updatedWallet);
	});
});
