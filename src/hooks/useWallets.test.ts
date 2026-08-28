import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useWallet } from "@/hooks/useWallet";
import {
	clearWalletsCacheForTests,
	useWallets,
	WALLETS_RATE_LIMIT_MESSAGE,
} from "@/hooks/useWallets";
import { clearSession, saveSession } from "@/lib/session";
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
	clearWalletsCacheForTests();
	vi.stubEnv("NEXT_PUBLIC_API_URL", "https://api.example.com");
});

afterEach(() => {
	clearWalletsCacheForTests();
	clearSession();
	window.localStorage.removeItem("mux-auth-session");
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

	it("returns a friendly rate-limit error on 429 responses", async () => {
		vi.stubGlobal(
			"fetch",
			vi.fn().mockResolvedValue({ ok: false, status: 429 }),
		);

		const { result } = renderHook(() => useWallets());
		await waitFor(() => expect(result.current.loading).toBe(false));
		expect(result.current.error).toBe(WALLETS_RATE_LIMIT_MESSAGE);
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
		expect(fetchMock).toHaveBeenCalledWith(
			"/api/wallets",
			expect.objectContaining({ headers: expect.any(Object) }),
		);
		expect(result.current.error).toBeNull();
		expect(result.current.wallets).toEqual([mockWallet]);
	});

	it("scopes wallet requests by network", async () => {
		const fetchMock = vi.fn().mockResolvedValue({
			ok: true,
			json: () => Promise.resolve([mockWallet]),
		});
		vi.stubGlobal("fetch", fetchMock);

		const { result } = renderHook(() => useWallets({ network: "mainnet" }));
		await waitFor(() => expect(result.current.loading).toBe(false));

		expect(fetchMock).toHaveBeenCalledWith(
			"https://api.example.com/wallets?network=mainnet",
			expect.objectContaining({ headers: expect.any(Object) }),
		);
		expect(result.current.wallets).toEqual([mockWallet]);
	});

	it("returns fresh cached wallets without another request", async () => {
		const fetchMock = vi.fn().mockResolvedValue({
			ok: true,
			json: () => Promise.resolve([mockWallet]),
		});
		vi.stubGlobal("fetch", fetchMock);

		const first = renderHook(() => useWallets({ network: "mainnet" }));
		await waitFor(() => expect(first.result.current.loading).toBe(false));
		first.unmount();

		const second = renderHook(() => useWallets({ network: "mainnet" }));
		await waitFor(() => expect(second.result.current.loading).toBe(false));

		expect(second.result.current.wallets).toEqual([mockWallet]);
		expect(second.result.current.isCached).toBe(true);
		expect(fetchMock).toHaveBeenCalledTimes(1);
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
		await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
		await waitFor(() => expect(result.current.loading).toBe(false));
	});

	// Regression test for the sessionStorage/localStorage key mismatch: the
	// access token is written via `saveSession()` (src/lib/session.js, backed
	// by sessionStorage), so it must be read back the same way rather than
	// via a second, ad-hoc `localStorage` lookup that never sees it.
	it("attaches the Authorization header from the shared session store", async () => {
		saveSession({
			accessToken: "shared-store-token",
			refreshToken: "r",
			expiresAt: Date.now() + 60_000,
		});

		const fetchMock = vi.fn().mockResolvedValue({
			ok: true,
			json: () => Promise.resolve([mockWallet]),
		});
		vi.stubGlobal("fetch", fetchMock);

		const { result } = renderHook(() => useWallets());
		await waitFor(() => expect(result.current.loading).toBe(false));

		expect(fetchMock).toHaveBeenCalledWith(
			expect.any(String),
			expect.objectContaining({
				headers: expect.objectContaining({
					Authorization: "Bearer shared-store-token",
				}),
			}),
		);
	});

	it("omits the Authorization header when a token exists only under the legacy localStorage key", async () => {
		window.localStorage.setItem(
			"mux-auth-session",
			JSON.stringify({ accessToken: "stale-localstorage-token" }),
		);

		const fetchMock = vi.fn().mockResolvedValue({
			ok: true,
			json: () => Promise.resolve([mockWallet]),
		});
		vi.stubGlobal("fetch", fetchMock);

		const { result } = renderHook(() => useWallets());
		await waitFor(() => expect(result.current.loading).toBe(false));

		const [, init] = fetchMock.mock.calls[0];
		expect((init.headers as Record<string, string>).Authorization).toBeUndefined();
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
