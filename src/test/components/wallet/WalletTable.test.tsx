import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { WalletTable } from "@/components/wallet/WalletTable";
import type { Wallet } from "@/types/wallet";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const activeMainnetWallet: Wallet = {
	id: "w-001",
	address: "GBZXN7PIRZGNMHGA7MUUUF4GWPY5AYPV6LY4UV2GL6VJGIQRXFDNMADI",
	network: "mainnet",
	status: "active",
	createdAt: new Date("2024-01-15T10:30:00Z"),
	balance: "1,250.50 XLM",
	lastActivity: new Date("2025-01-20T14:22:00Z"),
};

const pendingTestnetWallet: Wallet = {
	id: "w-002",
	address: "GCFONE23AB7Y6C5YZOMKUKGETPIAJA752ZPMORQO5VKA6LHXHC7Y3YPE",
	network: "testnet",
	status: "pending",
	createdAt: new Date("2024-03-10T16:45:00Z"),
	// No balance or lastActivity — tests the "—" fallback
};

const inactiveWallet: Wallet = {
	id: "w-003",
	address: "GDQP2KPQGKIHYJGXNUIYOMHARUARCA7DJT5FO2FFOOBER7KKQOAVSMIA",
	network: "mainnet",
	status: "inactive",
	createdAt: new Date("2023-12-01T09:00:00Z"),
	balance: "75.25 XLM",
	lastActivity: new Date("2024-06-15T18:00:00Z"),
};

const allWallets = [activeMainnetWallet, pendingTestnetWallet, inactiveWallet];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function renderTable(wallets: Wallet[]) {
	return render(<WalletTable wallets={wallets} />);
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("WalletTable", () => {
	describe("table structure", () => {
		it("renders the table element", () => {
			renderTable(allWallets);
			expect(screen.getByRole("table")).toBeInTheDocument();
		});

		it("renders all expected column headers", () => {
			renderTable(allWallets);
			expect(
				screen.getByRole("columnheader", { name: /address/i }),
			).toBeInTheDocument();
			expect(
				screen.getByRole("columnheader", { name: /network/i }),
			).toBeInTheDocument();
			expect(
				screen.getByRole("columnheader", { name: /status/i }),
			).toBeInTheDocument();
			expect(
				screen.getByRole("columnheader", { name: /balance/i }),
			).toBeInTheDocument();
			expect(
				screen.getByRole("columnheader", { name: /created/i }),
			).toBeInTheDocument();
			expect(
				screen.getByRole("columnheader", { name: /last activity/i }),
			).toBeInTheDocument();
		});

		it("renders one row per wallet in the desktop table", () => {
			renderTable(allWallets);
			// getAllByRole("row") returns only <tr> elements (desktop table only)
			const rows = screen.getAllByRole("row");
			// 1 header row + 3 data rows
			expect(rows).toHaveLength(4);
		});
	});

	describe("address cell", () => {
		it("displays a truncated version of the wallet address", () => {
			renderTable([activeMainnetWallet]);
			// Responsive layout renders text in both desktop table and mobile card
			expect(screen.getAllByText("GBZXN7...MADI").length).toBeGreaterThan(0);
		});

		it("renders a copy button for each wallet (desktop + mobile)", () => {
			renderTable(allWallets);
			// Each wallet has a copy button in desktop view AND mobile card view
			const copyButtons = screen.getAllByTitle(/copy address/i);
			expect(copyButtons.length).toBeGreaterThanOrEqual(allWallets.length);
		});

		it("copy button has an accessible title", () => {
			renderTable([activeMainnetWallet]);
			const copyButtons = screen.getAllByTitle("Copy address");
			expect(copyButtons.length).toBeGreaterThan(0);
			expect(copyButtons[0]).toBeInTheDocument();
		});
	});

	describe("copy-to-clipboard interaction", () => {
		beforeEach(() => {
			vi.clearAllMocks();
		});

		it("calls clipboard.writeText with the full address on copy button click", async () => {
			const user = userEvent.setup();
			renderTable([activeMainnetWallet]);

			// Use the first copy button (desktop table)
			const btn = screen.getAllByTitle("Copy address")[0];
			await user.click(btn);

			expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
				activeMainnetWallet.address,
			);
		});

		it("shows a check icon and 'Copied!' title after clicking copy", async () => {
			const user = userEvent.setup();
			renderTable([activeMainnetWallet]);

			const btn = screen.getAllByTitle("Copy address")[0];
			await user.click(btn);

			expect(btn).toHaveAttribute("title", "Copied!");
		});
	});

	describe("network badge", () => {
		it("shows 'Mainnet' badge for mainnet wallets", () => {
			renderTable([activeMainnetWallet]);
			expect(screen.getAllByText("Mainnet").length).toBeGreaterThan(0);
		});

		it("shows 'Testnet' badge for testnet wallets", () => {
			renderTable([pendingTestnetWallet]);
			expect(screen.getAllByText("Testnet").length).toBeGreaterThan(0);
		});

		it("renders the correct badge count for a mixed list", () => {
			renderTable(allWallets);
			// 2 mainnet wallets × 2 views (desktop + mobile) = 4 "Mainnet" labels
			// 1 testnet wallet × 2 views = 2 "Testnet" labels
			const mainnetBadges = screen.getAllByText("Mainnet");
			const testnetBadges = screen.getAllByText("Testnet");
			expect(mainnetBadges.length).toBe(4);
			expect(testnetBadges.length).toBe(2);
		});
	});

	describe("status indicator", () => {
		it("shows 'Active' status for active wallets", () => {
			renderTable([activeMainnetWallet]);
			expect(screen.getAllByText("Active").length).toBeGreaterThan(0);
		});

		it("shows 'Pending' status for pending wallets", () => {
			renderTable([pendingTestnetWallet]);
			expect(screen.getAllByText("Pending").length).toBeGreaterThan(0);
		});

		it("shows 'Inactive' status for inactive wallets", () => {
			renderTable([inactiveWallet]);
			expect(screen.getAllByText("Inactive").length).toBeGreaterThan(0);
		});
	});

	describe("balance column", () => {
		it("displays the balance when provided", () => {
			renderTable([activeMainnetWallet]);
			expect(screen.getAllByText("1,250.50 XLM").length).toBeGreaterThan(0);
		});

		it("displays '—' when balance is undefined", () => {
			renderTable([pendingTestnetWallet]);
			// The desktop balance cell renders "—"; there may be additional "—" in
			// the mobile card or the lastActivity column.
			const dashes = screen.getAllByText("—");
			expect(dashes.length).toBeGreaterThan(0);
		});
	});

	describe("date columns", () => {
		it("displays a formatted createdAt date", () => {
			renderTable([activeMainnetWallet]);
			// Jan 15, 2024 — appears in both desktop and mobile
			expect(screen.getAllByText(/Jan/).length).toBeGreaterThan(0);
			expect(screen.getAllByText(/2024/).length).toBeGreaterThan(0);
		});

		it("displays '—' for lastActivity when undefined", () => {
			renderTable([pendingTestnetWallet]);
			const dashes = screen.getAllByText("—");
			// balance "—" in desktop + mobile, lastActivity "—" in desktop = ≥ 2
			expect(dashes.length).toBeGreaterThanOrEqual(2);
		});
	});

	describe("edge cases", () => {
		it("renders empty state when wallets array is empty", () => {
			renderTable([]);
			expect(screen.queryByRole("table")).not.toBeInTheDocument();
			expect(
				screen.getByText("No wallets found for this network."),
			).toBeInTheDocument();
		});

		it("renders a single wallet correctly", () => {
			renderTable([activeMainnetWallet]);
			const rows = screen.getAllByRole("row");
			expect(rows).toHaveLength(2); // header + 1 data row
		});

		it("renders a large list without errors", () => {
			const manyWallets: Wallet[] = Array.from({ length: 50 }, (_, i) => ({
				id: `w-${i}`,
				address: `GBZXN7PIRZGNMHGA7MUUUF4GWPY5AYPV6LY4UV2GL6VJGIQRXFDNMAD${i
					.toString()
					.padStart(1, "0")}`,
				network: i % 2 === 0 ? "mainnet" : ("testnet" as const),
				status: (["active", "pending", "inactive"] as const)[i % 3],
				createdAt: new Date("2024-01-01"),
			}));
			expect(() => renderTable(manyWallets)).not.toThrow();
			const rows = screen.getAllByRole("row");
			expect(rows).toHaveLength(51); // header + 50 data rows
		});

		it("handles a wallet with all optional fields missing", () => {
			const minimalWallet: Wallet = {
				id: "w-min",
				address: "GCFONE23AB7Y6C5YZOMKUKGETPIAJA752ZPMORQO5VKA6LHXHC7Y3YPE",
				network: "testnet",
				status: "pending",
				createdAt: new Date("2024-01-01"),
			};
			expect(() => renderTable([minimalWallet])).not.toThrow();
		});
	});
});
