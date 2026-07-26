import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useWallet } from "@/hooks/useWallet";
import { useWallets } from "@/hooks/useWallets";
import type { Wallet } from "@/types/wallet";

const mockWallet: Wallet = {
	id: "wallet-001",
	address: "GBZXN7PIRZGNMHGA7MUUUF4GWPY5AYPV6LY4UV2GL6VJGIQRXFDNMADI",
	network: "mainnet",
	status: "active",
	createdAt: new Date("2024-01-15T10:30:00Z"),
	balance: "1,250.50 XLM",
};

beforeEach(() => {
	vi.stubEnv("NEXT_PUBLIC_API_URL", "https://api.example.com");
});

afterEach(() => {
	vi.unstubAllEnvs();
	vi.restoreAllMocks();
});

// ---------------------------------------------------------------------------
// useWallets
// ---------------------------------------------------------------------------
describe("useWallets", () => {
	it("returns wallets on success", async () => {
		vi.stubGlobal(
			"fetch",
			vi.fn().mockResolvedValue({
				ok: true,
				json: () => Promise.resolve([mockWallet]),
			}),
		);

		const { result } = renderHook(() => useWallets());
		expect(result.current.loading).toBe(true);

		await waitFor(() => expect(result.current.loading).toBe(false));
		expect(result.current.wallets).toEqual([mockWallet]);
		expect(result.current.error).toBeNull();
	});

	it("normalizes API date strings into Date objects", async () => {
		vi.stubGlobal(
			"fetch",
			vi.fn().mockResolvedValue({
				ok: true,
				json: () =>
					Promise.resolve([
						{
							...mockWallet,
							createdAt: "2024-01-15T10:30:00Z",
							lastActivity: "2024-01-16T10:30:00Z",
						},
					]),
			}),
		);

		const { result } = renderHook(() => useWallets());
		await waitFor(() => expect(result.current.loading).toBe(false));

		expect(result.current.wallets[0].createdAt).toBeInstanceOf(Date);
		expect(result.current.wallets[0].lastActivity).toBeInstanceOf(Date);
	});

	it("sets error on non-ok response", async () => {
		vi.stubGlobal(
			"fetch",
			vi.fn().mockResolvedValue({ ok: false, status: 500 }),
		);

		const { result } = renderHook(() => useWallets());
		await waitFor(() => expect(result.current.loading).toBe(false));
		expect(result.current.error).toMatch(/500/);
		expect(result.current.wallets).toEqual([]);
	});

	it("falls back to the local Next.js wallets route when NEXT_PUBLIC_API_URL is missing", async () => {
		const fetchMock = vi.fn().mockResolvedValue({
			ok: true,
			json: () => Promise.resolve([mockWallet]),
		});
		vi.stubGlobal("fetch", fetchMock);
		vi.unstubAllEnvs();

		const { result } = renderHook(() => useWallets());
		await waitFor(() => expect(result.current.loading).toBe(false));
		expect(fetchMock).toHaveBeenCalledWith("/api/wallets");
		expect(result.current.error).toBeNull();
		expect(result.current.wallets).toEqual([mockWallet]);
	});

	it("refetch triggers a new request", async () => {
		const fetchMock = vi.fn().mockResolvedValue({
			ok: true,
			json: () => Promise.resolve([mockWallet]),
		});
		vi.stubGlobal("fetch", fetchMock);

		const { result } = renderHook(() => useWallets());
		await waitFor(() => expect(result.current.loading).toBe(false));
		expect(fetchMock).toHaveBeenCalledTimes(1);

		act(() => result.current.refetch());
		await waitFor(() => expect(result.current.loading).toBe(false));
		expect(fetchMock).toHaveBeenCalledTimes(2);
	});
});

// ---------------------------------------------------------------------------
// useWallet
// ---------------------------------------------------------------------------
describe("useWallet", () => {
	it("returns wallet on success", async () => {
		vi.stubGlobal(
			"fetch",
			vi.fn().mockResolvedValue({
				ok: true,
				json: () => Promise.resolve(mockWallet),
			}),
		);

		const { result } = renderHook(() => useWallet("wallet-001"));
		await waitFor(() => expect(result.current.loading).toBe(false));
		expect(result.current.wallet).toEqual(mockWallet);
		expect(result.current.error).toBeNull();
	});

	it("normalizes API date strings into Date objects", async () => {
		vi.stubGlobal(
			"fetch",
			vi.fn().mockResolvedValue({
				ok: true,
				json: () =>
					Promise.resolve({
						...mockWallet,
						createdAt: "2024-01-15T10:30:00Z",
						lastActivity: "2024-01-16T10:30:00Z",
					}),
			}),
		);

		const { result } = renderHook(() => useWallet("wallet-001"));
		await waitFor(() => expect(result.current.loading).toBe(false));

		expect(result.current.wallet?.createdAt).toBeInstanceOf(Date);
		expect(result.current.wallet?.lastActivity).toBeInstanceOf(Date);
	});

	it("sets error to 'not_found' on 404", async () => {
		vi.stubGlobal(
			"fetch",
			vi.fn().mockResolvedValue({ ok: false, status: 404 }),
		);

		const { result } = renderHook(() => useWallet("missing-id"));
		await waitFor(() => expect(result.current.loading).toBe(false));
		expect(result.current.error).toBe("not_found");
	});

	it("sets error on non-ok non-404 response", async () => {
		vi.stubGlobal(
			"fetch",
			vi.fn().mockResolvedValue({ ok: false, status: 503 }),
		);

		const { result } = renderHook(() => useWallet("wallet-001"));
		await waitFor(() => expect(result.current.loading).toBe(false));
		expect(result.current.error).toMatch(/503/);
	});

	it("falls back to the local Next.js wallet route when NEXT_PUBLIC_API_URL is missing", async () => {
		const fetchMock = vi.fn().mockResolvedValue({
			ok: true,
			json: () => Promise.resolve(mockWallet),
		});
		vi.stubGlobal("fetch", fetchMock);
		vi.unstubAllEnvs();

		const { result } = renderHook(() => useWallet("wallet-001"));
		await waitFor(() => expect(result.current.loading).toBe(false));
		expect(fetchMock).toHaveBeenCalledWith("/api/wallets/wallet-001");
		expect(result.current.error).toBeNull();
		expect(result.current.wallet).toEqual(mockWallet);
	});

	it("encodes the wallet id in the request URL", async () => {
		const fetchMock = vi.fn().mockResolvedValue({
			ok: true,
			json: () => Promise.resolve(mockWallet),
		});
		vi.stubGlobal("fetch", fetchMock);

		renderHook(() => useWallet("wallet/special"));
		await waitFor(() =>
			expect(fetchMock).toHaveBeenCalledWith(
				"https://api.example.com/wallets/wallet%2Fspecial",
			),
		);
	});
});
