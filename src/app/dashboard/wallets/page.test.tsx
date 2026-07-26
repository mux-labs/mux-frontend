import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import WalletsPage from "@/app/dashboard/wallets/page";
import type { Wallet } from "@/types/wallet";

const mockWallet: Wallet = {
	id: "wallet-001",
	address: "GBZXN7PIRZGNMHGA7MUUUF4GWPY5AYPV6LY4UV2GL6VJGIQRXFDNMADI",
	network: "mainnet",
	status: "active",
	createdAt: new Date("2024-01-15T10:30:00Z"),
	balance: "1,250.50 XLM",
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

describe("WalletsPage (/dashboard/wallets)", () => {
	let consoleSpy: ReturnType<typeof vi.spyOn>;

	beforeEach(() => {
		consoleSpy = vi.spyOn(console, "debug").mockImplementation(() => {});
	});

	afterEach(() => {
		consoleSpy.mockRestore();
		vi.restoreAllMocks();
		vi.unstubAllGlobals();
	});

	describe("analytics tracking", () => {
		it("fires a page_view event for the wallets page on mount", async () => {
			mockFetchOk([mockWallet]);
			render(<WalletsPage />);
			expect(consoleSpy).toHaveBeenCalledWith("[analytics]", "page_view", {
				page: "wallets",
			});
		});
	});

	describe("page header", () => {
		it("renders the heading and description", async () => {
			mockFetchOk([mockWallet]);
			render(<WalletsPage />);
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
			render(<WalletsPage />);
			expect(screen.getAllByTestId("skeleton").length).toBeGreaterThan(0);
			expect(screen.queryByRole("table")).not.toBeInTheDocument();
		});
	});

	describe("with wallets data", () => {
		it("renders the WalletTable", async () => {
			mockFetchOk([mockWallet]);
			render(<WalletsPage />);
			await waitFor(() =>
				expect(screen.getByRole("table")).toBeInTheDocument(),
			);
		});

		it("does not render the EmptyState or ErrorState", async () => {
			mockFetchOk([mockWallet]);
			render(<WalletsPage />);
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
			render(<WalletsPage />);
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
			render(<WalletsPage />);
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
			render(<WalletsPage />);

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
	});
});
