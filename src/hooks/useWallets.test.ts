import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useWallets } from "@/hooks/useWallets";
import * as api from "@/lib/api";
import type { Wallet } from "@/types/wallet";

const mockWallets: Wallet[] = [
	{
		id: "w-1",
		address: "GBZXN7PIRZGNMHGA7MUUUF4GWPY5AYPV6LY4UV2GL6VJGIQRXFDNMADI",
		network: "mainnet",
		status: "active",
		createdAt: new Date("2024-01-15"),
	},
];

describe("useWallets", () => {
	beforeEach(() => {
		vi.spyOn(api, "fetchWallets");
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	it("starts in loading state", () => {
		vi.mocked(api.fetchWallets).mockResolvedValue(mockWallets);
		const { result } = renderHook(() => useWallets());
		expect(result.current.loading).toBe(true);
		expect(result.current.wallets).toEqual([]);
		expect(result.current.error).toBeNull();
	});

	it("returns wallets on success", async () => {
		vi.mocked(api.fetchWallets).mockResolvedValue(mockWallets);
		const { result } = renderHook(() => useWallets());

		await waitFor(() => expect(result.current.loading).toBe(false));

		expect(result.current.wallets).toEqual(mockWallets);
		expect(result.current.error).toBeNull();
	});

	it("sets error on failure", async () => {
		vi.mocked(api.fetchWallets).mockRejectedValue(new Error("Server error"));
		const { result } = renderHook(() => useWallets());

		await waitFor(() => expect(result.current.loading).toBe(false));

		expect(result.current.error).toBe("Server error");
		expect(result.current.wallets).toEqual([]);
	});

	it("refetch reloads wallets", async () => {
		vi.mocked(api.fetchWallets).mockResolvedValue(mockWallets);
		const { result } = renderHook(() => useWallets());

		await waitFor(() => expect(result.current.loading).toBe(false));

		const updated: Wallet[] = [{ ...mockWallets[0], id: "w-2" }];
		vi.mocked(api.fetchWallets).mockResolvedValue(updated);

		act(() => result.current.refetch());

		await waitFor(() => expect(result.current.loading).toBe(false));
		expect(result.current.wallets[0].id).toBe("w-2");
	});

	it("clears error on successful refetch", async () => {
		vi.mocked(api.fetchWallets).mockRejectedValueOnce(new Error("fail"));
		const { result } = renderHook(() => useWallets());

		await waitFor(() => expect(result.current.error).toBe("fail"));

		vi.mocked(api.fetchWallets).mockResolvedValue(mockWallets);
		act(() => result.current.refetch());

		await waitFor(() => expect(result.current.loading).toBe(false));
		expect(result.current.error).toBeNull();
		expect(result.current.wallets).toEqual(mockWallets);
	});
});
