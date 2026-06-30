import { renderHook, act, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { useWalletBalance } from "@/hooks/useWalletBalance";

vi.mock("@/mock-data/wallets", () => ({
	dummyWallets: [
		{
			id: "wallet-001",
			address: "GBZXN7PIRZGNMHGA7MUUUF4GWPY5AYPV6LY4UV2GL6VJGIQRXFDNMADI",
			network: "mainnet",
			status: "active",
			createdAt: new Date("2024-01-15T10:30:00Z"),
			balance: "1000.00 XLM",
		},
	],
}));

describe("useWalletBalance", () => {
	beforeEach(() => {
		vi.useFakeTimers();
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it("starts with loading=true and no wallet", () => {
		const { result } = renderHook(() => useWalletBalance("wallet-001"));
		expect(result.current.loading).toBe(true);
		expect(result.current.wallet).toBeNull();
		expect(result.current.error).toBeNull();
	});

	it("resolves wallet and balance after fetch", async () => {
		const { result } = renderHook(() => useWalletBalance("wallet-001"));

		// Advance past the 600ms simulated latency
		await act(async () => {
			await vi.advanceTimersByTimeAsync(700);
		});

		expect(result.current.loading).toBe(false);
		expect(result.current.wallet).not.toBeNull();
		expect(result.current.balance).toMatch(/XLM$/);
		expect(result.current.lastUpdated).toBeInstanceOf(Date);
	});

	it("sets error for unknown wallet id", async () => {
		const { result } = renderHook(() => useWalletBalance("unknown-id"));

		await act(async () => {
			await vi.advanceTimersByTimeAsync(700);
		});

		expect(result.current.loading).toBe(false);
		expect(result.current.error).toMatch(/not found/i);
		expect(result.current.wallet).toBeNull();
	});

	it("does nothing when id is null", () => {
		const { result } = renderHook(() => useWalletBalance(null));
		expect(result.current.loading).toBe(false);
		expect(result.current.wallet).toBeNull();
	});

	it("re-polls after interval", async () => {
		const { result } = renderHook(() => useWalletBalance("wallet-001", 5_000));

		// First fetch completes
		await act(async () => {
			await vi.advanceTimersByTimeAsync(700);
		});

		const firstUpdate = result.current.lastUpdated;
		expect(firstUpdate).toBeInstanceOf(Date);

		// Advance past interval + fetch latency to trigger second poll
		await act(async () => {
			await vi.advanceTimersByTimeAsync(5_700);
		});

		expect(result.current.lastUpdated?.getTime()).toBeGreaterThan(
			firstUpdate!.getTime(),
		);
	}, 15_000);
});
