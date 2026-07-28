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
				expect(
					screen.getByText(/failed to load wallets/i),
				).toBeInTheDocument(),
			);
			expect(
				screen.getByRole("button", { name: /retry/i }),
			).toBeInTheDocument();
			expect(screen.queryByRole("table")).not.toBeInTheDocument();
			expect(
				screen.queryByText(/no wallets found/i),
			).not.toBeInTheDocument();
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
			expect(screen.getByRole("button", { name: /retry/i })).toBeInTheDocument();
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
				expect(
					screen.getByText(/failed to load wallets/i),
				).toBeInTheDocument(),
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
	// #423 – Network filter
	// ---------------------------------------------------------------------------
	describe("network filter (#423)", () => {
		it("renders the network filter buttons after wallets load", async () => {
			mockFetchOk([mockMainnetWallet, mockTestnetWallet]);
			renderWalletsPage();

			await waitFor(() =>
				expect(screen.getByRole("group", { name: /network filter/i })).toBeInTheDocument(),
			);
			expect(
				screen.getByRole("button", { name: /filter by all networks/i }),
			).toBeInTheDocument();
			expect(
				screen.getByRole("button", { name: /filter by testnet/i }),
			).toBeInTheDocument();
			expect(
				screen.getByRole("button", { name: /filter by mainnet/i }),
			).toBeInTheDocument();
		});

		it("shows all wallets when 'All Networks' is selected (default)", async () => {
			mockFetchOk([mockMainnetWallet, mockTestnetWallet]);
			renderWalletsPage();

			await waitFor(() =>
				expect(screen.getByRole("table")).toBeInTheDocument(),
			);

			// All Networks is selected by default
			expect(
				screen.getByRole("button", { name: /filter by all networks/i }),
			).toHaveAttribute("aria-pressed", "true");

			// Both wallets should be in the table
			const rows = screen.getAllByRole("row");
			expect(rows.length).toBeGreaterThanOrEqual(3); // header + 2 wallets
		});

		it("shows only mainnet wallets when Mainnet filter is selected", async () => {
			mockFetchOk([mockMainnetWallet, mockTestnetWallet]);
			const user = userEvent.setup();
			renderWalletsPage();

			await waitFor(() =>
				expect(screen.getByRole("table")).toBeInTheDocument(),
			);

			await user.click(
				screen.getByRole("button", { name: /filter by mainnet/i }),
			);

			// Mainnet button should now be active
			expect(
				screen.getByRole("button", { name: /filter by mainnet/i }),
			).toHaveAttribute("aria-pressed", "true");

			// Only mainnet wallet row should appear (header + 1 data row)
			const rows = screen.getAllByRole("row");
			expect(rows).toHaveLength(2);
		});

		it("shows only testnet wallets when Testnet filter is selected", async () => {
			mockFetchOk([mockMainnetWallet, mockTestnetWallet]);
			const user = userEvent.setup();
			renderWalletsPage();

			await waitFor(() =>
				expect(screen.getByRole("table")).toBeInTheDocument(),
			);

			await user.click(
				screen.getByRole("button", { name: /filter by testnet/i }),
			);

			expect(
				screen.getByRole("button", { name: /filter by testnet/i }),
			).toHaveAttribute("aria-pressed", "true");

			// Only testnet wallet row (header + 1 data row)
			const rows = screen.getAllByRole("row");
			expect(rows).toHaveLength(2);
		});

		it("restores all wallets when switching back to 'All Networks'", async () => {
			mockFetchOk([mockMainnetWallet, mockTestnetWallet]);
			const user = userEvent.setup();
			renderWalletsPage();

			await waitFor(() =>
				expect(screen.getByRole("table")).toBeInTheDocument(),
			);

			// Filter to mainnet
			await user.click(
				screen.getByRole("button", { name: /filter by mainnet/i }),
			);
			expect(screen.getAllByRole("row")).toHaveLength(2);

			// Switch back to all
			await user.click(
				screen.getByRole("button", { name: /filter by all networks/i }),
			);

			expect(
				screen.getByRole("button", { name: /filter by all networks/i }),
			).toHaveAttribute("aria-pressed", "true");
			// Both wallets visible again
			const rows = screen.getAllByRole("row");
			expect(rows.length).toBeGreaterThanOrEqual(3);
		});

		it("shows a network-specific empty state when no wallets match the selected filter", async () => {
			// Only mainnet wallets in the response
			mockFetchOk([mockMainnetWallet]);
			const user = userEvent.setup();
			renderWalletsPage();

			await waitFor(() =>
				expect(screen.getByRole("table")).toBeInTheDocument(),
			);

			// Select testnet — no wallets match
			await user.click(
				screen.getByRole("button", { name: /filter by testnet/i }),
			);

			await waitFor(() =>
				expect(
					screen.getByText(/no wallets on this network/i),
				).toBeInTheDocument(),
			);
			expect(screen.queryByRole("table")).not.toBeInTheDocument();
		});

		it("the 'Show all networks' action in the network empty state resets the filter", async () => {
			mockFetchOk([mockMainnetWallet]);
			const user = userEvent.setup();
			renderWalletsPage();

			await waitFor(() =>
				expect(screen.getByRole("table")).toBeInTheDocument(),
			);

			// Filter to testnet to get empty state
			await user.click(
				screen.getByRole("button", { name: /filter by testnet/i }),
			);

			await waitFor(() =>
				expect(
					screen.getByText(/no wallets on this network/i),
				).toBeInTheDocument(),
			);

			// Click 'Show all networks' action
			await user.click(
				screen.getByRole("button", { name: /show all networks/i }),
			);

			// Should return to the table with all wallets
			await waitFor(() =>
				expect(screen.getByRole("table")).toBeInTheDocument(),
			);
			expect(
				screen.queryByText(/no wallets on this network/i),
			).not.toBeInTheDocument();
		});

		it("does not show the network filter while wallets are still loading", () => {
			mockFetchOk([mockMainnetWallet]);
			renderWalletsPage();

			// Loading state: skeleton visible, network filter hidden
			expect(screen.getAllByTestId("skeleton").length).toBeGreaterThan(0);
			expect(
				screen.queryByRole("group", { name: /network filter/i }),
			).not.toBeInTheDocument();
		});

		it("disables the network filter buttons when the fetch fails and no wallets are cached", async () => {
			mockFetchFail(500);
			renderWalletsPage();

			await waitFor(() =>
				expect(screen.getByText(/failed to load wallets/i)).toBeInTheDocument(),
			);

			const filterGroup = screen.getByRole("group", { name: /network filter/i });
			const buttons = within(filterGroup).getAllByRole("button");
			buttons.forEach((btn) => expect(btn).toBeDisabled());
		});
	});
});
