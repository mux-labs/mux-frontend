import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import WalletsPage from "@/app/dashboard/wallets/page";
import { NetworkProvider } from "@/context/NetworkContext";
import { clearWalletsCacheForTests } from "@/hooks/useWallets";
import type { Wallet } from "@/types/wallet";

const mockWallet: Wallet = {
	id: "wallet-001",
	address: "GBZXN7PIRZGNMHGA7MUUUF4GWPY5AYPV6LY4UV2GL6VJGIQRXFDNMADI",
	network: "mainnet",
	status: "active",
	createdAt: new Date("2024-01-15T10:30:00Z"),
	balance: "1,250.50 XLM",
};

const mockMainnetWallet: Wallet = {
	id: "wallet-m1",
	address: "GBZXN7PIRZGNMHGA7MUUUF4GWPY5AYPV6LY4UV2GL6VJGIQRXFDNMADI",
	network: "mainnet",
	status: "active",
	createdAt: new Date("2024-01-15T10:30:00Z"),
	balance: "1,250.50 XLM",
};

const mockTestnetWallet: Wallet = {
	id: "wallet-t1",
	address: "GCFONE23AB7Y6C5YZOMKUKGETPIAJA752ZPMORQO5VKA6LHXHC7Y3YPE",
	network: "testnet",
	status: "active",
	createdAt: new Date("2024-02-20T08:15:00Z"),
	balance: "500.00 XLM",
};

function mockFetchOk(data: unknown) {
	vi.stubGlobal(
		"fetch",
		vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve(data) }),
	);
}

function mockFetchFail(status = 500) {
	vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status }));
}

function renderWalletsPage() {
	return render(
		<NetworkProvider>
			<WalletsPage />
		</NetworkProvider>,
	);
}

describe("WalletsPage (/dashboard/wallets)", () => {
	let consoleSpy: ReturnType<typeof vi.spyOn>;

	beforeEach(() => {
		clearWalletsCacheForTests();
		localStorage.removeItem("mux_network");
		consoleSpy = vi.spyOn(console, "debug").mockImplementation(() => {});
	});

	afterEach(() => {
		clearWalletsCacheForTests();
		consoleSpy.mockRestore();
		vi.restoreAllMocks();
		vi.unstubAllGlobals();
	});

	describe("analytics tracking", () => {
		it("fires a page_view event for the wallets page on mount", async () => {
			mockFetchOk([mockWallet]);
			renderWalletsPage();
			expect(consoleSpy).toHaveBeenCalledWith("[analytics]", "page_view", {
				page: "wallets",
			});
		});
	});

	describe("page header", () => {
		it("renders the heading and description", async () => {
			mockFetchOk([mockWallet]);
			renderWalletsPage();
			expect(
				screen.getByRole("heading", { name: /wallet monitoring/i }),
			).toBeInTheDocument();
			expect(
				screen.getByText(/track and manage your stellar wallets/i),
			).toBeInTheDocument();
		});
	});

	describe("loading state", () => {
		it("shows a skeleton while wallets are loading", () => {
			mockFetchOk([mockWallet]);
			renderWalletsPage();
			expect(screen.getAllByTestId("skeleton").length).toBeGreaterThan(0);
			expect(screen.queryByRole("table")).not.toBeInTheDocument();
		});
	});

	describe("with wallets data", () => {
		it("renders the WalletTable", async () => {
			mockFetchOk([mockWallet]);
			renderWalletsPage();
			await waitFor(() =>
				expect(screen.getByRole("table")).toBeInTheDocument(),
			);
		});

		it("does not render the EmptyState or ErrorState", async () => {
			mockFetchOk([mockWallet]);
			renderWalletsPage();
			await waitFor(() =>
				expect(screen.getByRole("table")).toBeInTheDocument(),
			);
			expect(
				screen.queryByText(/you haven't added any wallets/i),
			).not.toBeInTheDocument();
			expect(
				screen.queryByText(/failed to load wallets/i),
			).not.toBeInTheDocument();
		});
	});

	describe("empty state", () => {
		it("renders the EmptyState when there are no wallets", async () => {
			mockFetchOk([]);
			renderWalletsPage();
			await waitFor(() =>
				expect(screen.getByText(/no wallets found/i)).toBeInTheDocument(),
			);
			expect(
				screen.getByRole("button", { name: /add wallet/i }),
			).toBeInTheDocument();
			expect(screen.queryByRole("table")).not.toBeInTheDocument();
		});
	});

	describe("error state", () => {
		it("renders an error message with a retry button when the fetch fails", async () => {
			mockFetchFail(500);
			renderWalletsPage();
			await waitFor(() =>
				expect(screen.getByText(/failed to load wallets/i)).toBeInTheDocument(),
			);
			expect(
				screen.getByRole("button", { name: /retry/i }),
			).toBeInTheDocument();
			expect(screen.queryByRole("table")).not.toBeInTheDocument();
			expect(screen.queryByText(/no wallets found/i)).not.toBeInTheDocument();
		});

		it("renders a friendly rate-limit message when wallets return 429", async () => {
			mockFetchFail(429);
			renderWalletsPage();
			await waitFor(() =>
				expect(
					screen.getByText(/wallets are temporarily rate limited/i),
				).toBeInTheDocument(),
			);
			expect(
				screen.getByText(/making wallet requests too quickly/i),
			).toBeInTheDocument();
			expect(
				screen.getByRole("button", { name: /retry/i }),
			).toBeInTheDocument();
		});

		it("re-triggers the fetch when Retry is clicked and recovers", async () => {
			const fetchMock = vi
				.fn()
				.mockResolvedValueOnce({ ok: false, status: 500 })
				.mockResolvedValueOnce({
					ok: true,
					json: () => Promise.resolve([mockWallet]),
				});
			vi.stubGlobal("fetch", fetchMock);

			const user = userEvent.setup();
			renderWalletsPage();

			await waitFor(() =>
				expect(screen.getByText(/failed to load wallets/i)).toBeInTheDocument(),
			);

			await user.click(screen.getByRole("button", { name: /retry/i }));

			await waitFor(() =>
				expect(screen.getByRole("table")).toBeInTheDocument(),
			);
			expect(fetchMock).toHaveBeenCalledTimes(2);
		});

		it("invalidates and refetches wallets after adding a wallet", async () => {
			const fetchMock = vi.fn().mockResolvedValue({
				ok: true,
				json: () => Promise.resolve([mockWallet]),
			});
			vi.stubGlobal("fetch", fetchMock);

			const user = userEvent.setup();
			renderWalletsPage();

			await waitFor(() =>
				expect(screen.getByRole("table")).toBeInTheDocument(),
			);
			await user.click(screen.getByRole("button", { name: /add wallet/i }));
			const dialog = screen.getByRole("dialog", { name: /add wallet/i });
			await user.type(
				within(dialog).getByLabelText(/stellar address/i),
				"GDQP2KPQGKIHYJGXNUIYOMHARUARCA7DJT5FO2FFOOBER7KKQOAVSMIA",
			);
			await user.click(
				within(dialog).getByRole("button", { name: /^add wallet$/i }),
			);

			await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
		});
	});

	// ---------------------------------------------------------------------------
	// Network scoping — single source of truth, no double filtering
	//
	// This page used to also render a page-local "all/testnet/mainnet"
	// NetworkFilter widget (#423) that re-filtered wallets client-side on
	// top of data useWallets({ network }) had *already* scoped server-side
	// to the globally-selected network. Since that fetch is never actually
	// scoped to "all", the second filter could only ever agree with the
	// server-side scoping or contradict it — e.g. picking "testnet" in the
	// local widget while the global switcher was on "mainnet" produced a
	// false "no wallets on this network" empty state instead of the
	// mainnet wallets that were already loaded. The fix removes the
	// redundant client-side filter; the global network switcher (see
	// TopNav / NetworkContext) is the only network control left.
	// ---------------------------------------------------------------------------
	describe("network scoping (no double filtering)", () => {
		it("scopes the wallets fetch to the active network from the global switcher", async () => {
			const fetchMock = vi.fn((url: string) => {
				const requestedNetwork = new URL(
					url,
					"http://localhost",
				).searchParams.get("network");
				const data = [mockMainnetWallet, mockTestnetWallet].filter(
					(wallet) => wallet.network === requestedNetwork,
				);
				return Promise.resolve({ ok: true, json: () => Promise.resolve(data) });
			});
			vi.stubGlobal("fetch", fetchMock);
			renderWalletsPage();

			await waitFor(() =>
				expect(screen.getByRole("table")).toBeInTheDocument(),
			);

			// NetworkContext defaults to "mainnet" with no stored preference —
			// the fetch is scoped there, and only that wallet is rendered.
			expect(fetchMock.mock.calls[0][0]).toContain("network=mainnet");
			expect(screen.getAllByRole("row")).toHaveLength(2); // header + 1 wallet
		});

		it("shows testnet wallets (not a stale empty state) when the global network is testnet", async () => {
			localStorage.setItem("mux_network", "testnet");
			mockFetchOk([mockTestnetWallet]);
			renderWalletsPage();

			await waitFor(() =>
				expect(screen.getByRole("table")).toBeInTheDocument(),
			);
			expect(
				within(screen.getByRole("table")).getAllByRole("row"),
			).toHaveLength(2);
			expect(
				screen.queryByText(/no wallets on this network/i),
			).not.toBeInTheDocument();
		});

		it("does not render a second, independent network filter control", async () => {
			mockFetchOk([mockMainnetWallet, mockTestnetWallet]);
			renderWalletsPage();

			await waitFor(() =>
				expect(screen.getByRole("table")).toBeInTheDocument(),
			);

			expect(
				screen.queryByRole("group", { name: /network filter/i }),
			).not.toBeInTheDocument();
			expect(
				screen.queryByRole("button", { name: /filter by all networks/i }),
			).not.toBeInTheDocument();
		});
	});
});
