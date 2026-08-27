import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import WalletsPage from "@/app/dashboard/wallets/page";
import { NetworkProvider } from "@/context/NetworkContext";
import { clearWalletsCacheForTests } from "@/hooks/useWallets";
import type { Wallet } from "@/types/wallet";

function renderWalletsPage() {
	return render(
		<NetworkProvider>
			<WalletsPage />
		</NetworkProvider>,
	);
}

const activeWallet: Wallet = {
	id: "wallet-001",
	address: "GBZXN7PIRZGNMHGA7MUUUF4GWPY5AYPV6LY4UV2GL6VJGIQRXFDNMADI",
	network: "mainnet",
	status: "active",
	createdAt: new Date("2024-01-15T10:30:00Z"),
	balance: "1,250.50 XLM",
};

const archivedWallet: Wallet = {
	id: "wallet-005",
	address: "GBDEVU63Y6NTHJQQZIKVTC23NWLQVP3WJ2RI2OTSJTNYOIGICST6DUXR",
	network: "mainnet",
	status: "inactive",
	createdAt: new Date("2023-12-01T09:00:00Z"),
	balance: "75.25 XLM",
	archived: true,
};

function mockFetchOk(data: unknown) {
	vi.stubGlobal(
		"fetch",
		vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve(data) }),
	);
}

describe("WalletsPage archived toggle", () => {
	beforeEach(() => {
		// Each test stubs its own wallet fetch response; without clearing
		// useWallets' module-level cache, a later test in this file can
		// silently reuse an earlier test's cached wallets instead of its own
		// mocked fetch response (the cache is keyed by network and has a
		// 30s TTL, so it stays "fresh" across tests in the same run).
		clearWalletsCacheForTests();
		vi.spyOn(console, "debug").mockImplementation(() => {});
	});

	afterEach(() => {
		clearWalletsCacheForTests();
		vi.restoreAllMocks();
		vi.unstubAllGlobals();
	});

	it("hides archived wallets by default", async () => {
		mockFetchOk([activeWallet, archivedWallet]);
		renderWalletsPage();

		await waitFor(() => expect(screen.getByRole("table")).toBeInTheDocument());
		expect(screen.getByText("1 wallet")).toBeInTheDocument();
		expect(screen.getByTestId("show-archived-toggle")).not.toBeChecked();
	});

	it("shows archived wallets once the toggle is checked", async () => {
		mockFetchOk([activeWallet, archivedWallet]);
		const user = userEvent.setup();
		renderWalletsPage();

		await waitFor(() => expect(screen.getByRole("table")).toBeInTheDocument());
		await user.click(screen.getByTestId("show-archived-toggle"));

		expect(screen.getByText("2 wallets")).toBeInTheDocument();
	});

	it("does not render the archived toggle when there are no archived wallets", async () => {
		mockFetchOk([activeWallet]);
		renderWalletsPage();

		await waitFor(() => expect(screen.getByRole("table")).toBeInTheDocument());
		expect(
			screen.queryByTestId("show-archived-toggle"),
		).not.toBeInTheDocument();
	});

	it("shows an empty state when every wallet is archived and the toggle is off", async () => {
		mockFetchOk([archivedWallet]);
		renderWalletsPage();

		await waitFor(() =>
			expect(screen.getByText(/no wallets to show/i)).toBeInTheDocument(),
		);
		expect(screen.queryByRole("table")).not.toBeInTheDocument();
	});
});
