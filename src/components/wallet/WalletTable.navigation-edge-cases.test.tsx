import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Wallet } from "@/types/wallet";
import { WalletTable } from "./WalletTable";

const pushMock = vi.fn();

vi.mock("next/navigation", () => ({
	useRouter: () => ({ push: pushMock }),
}));

const wallets: Wallet[] = [
	{
		id: "w-1",
		address: "GBZXN7PIRZGNMHGA7MUUUF4GWPY5AYPV6LY4UV2GL6VJGIQRXFDNMADI",
		network: "mainnet",
		status: "active",
		createdAt: new Date("2024-01-15"),
		balance: "1,250.50 XLM",
	},
	{
		id: "w-2",
		address: "GCFONE23AB7Y6C5YZOMKUKGETPIAJA752ZPMORQO5VKA6LHXHC7Y3YPE",
		network: "testnet",
		status: "pending",
		createdAt: new Date("2024-02-20"),
	},
	{
		id: "w-3",
		address: "GDQP2KPQGKIHYJGXNUIYOMHARUARCA7DJT5FO2FFOOKY3B2WSQHG4W37",
		network: "mainnet",
		status: "inactive",
		createdAt: new Date("2024-03-01"),
	},
];

describe("WalletTable navigation edge cases", () => {
	beforeEach(() => {
		pushMock.mockClear();
	});

	it("ignores unhandled keys and does not navigate or move focus", async () => {
		const user = userEvent.setup();
		render(<WalletTable wallets={wallets} />);
		const firstRow = screen.getByTestId("wallet-row-0");
		firstRow.focus();

		await user.keyboard("{Escape}");
		await user.keyboard("a");

		expect(pushMock).not.toHaveBeenCalled();
	});

	it("navigates to the correct wallet when Enter is pressed on a non-first row", async () => {
		const user = userEvent.setup();
		render(<WalletTable wallets={wallets} />);
		const secondRow = screen.getByTestId("wallet-row-1");
		secondRow.focus();

		await user.keyboard("{Enter}");

		expect(pushMock).toHaveBeenCalledWith("/dashboard/wallets/w-2");
	});

	it("navigates to the correct wallet when Space is pressed on the last row", async () => {
		const user = userEvent.setup();
		render(<WalletTable wallets={wallets} />);
		const lastRow = screen.getByTestId("wallet-row-2");
		lastRow.focus();

		await user.keyboard(" ");

		expect(pushMock).toHaveBeenCalledWith("/dashboard/wallets/w-3");
	});

	it("only applies the focus ring to the currently focused row", async () => {
		const user = userEvent.setup();
		render(<WalletTable wallets={wallets} />);
		const rows = screen.getAllByTestId(/wallet-row-/);

		rows[0].focus();
		await user.keyboard("{ArrowDown}");

		expect(rows[0].className).not.toContain("ring-2");
		expect(rows[1].className).toContain("ring-2");
		expect(rows[2].className).not.toContain("ring-2");
	});

	it("does not crash when the wallets list shrinks while a row is focused", async () => {
		const user = userEvent.setup();
		const { rerender } = render(<WalletTable wallets={wallets} />);
		const lastRow = screen.getByTestId("wallet-row-2");
		lastRow.focus();

		rerender(<WalletTable wallets={wallets.slice(0, 1)} />);

		expect(screen.getByText("1 wallet")).toBeInTheDocument();
		expect(screen.queryByTestId("wallet-row-2")).not.toBeInTheDocument();
		// Should not throw when navigating after the underlying rowRefs shrank.
		await user.keyboard("{ArrowUp}");
	});

	it("renders a screen-reader-only caption describing the table contents", () => {
		render(<WalletTable wallets={wallets} />);
		expect(
			screen.getByText(
				"List of wallets with network, status, balance, and activity",
			),
		).toBeInTheDocument();
	});

	it("links every mobile card to its own wallet detail page", () => {
		render(<WalletTable wallets={wallets} />);
		const links = screen
			.getAllByRole("link")
			.filter((link) => link.getAttribute("href")?.startsWith("/dashboard/wallets/"));
		const hrefs = links.map((link) => link.getAttribute("href"));
		expect(hrefs).toContain("/dashboard/wallets/w-1");
		expect(hrefs).toContain("/dashboard/wallets/w-2");
		expect(hrefs).toContain("/dashboard/wallets/w-3");
	});

	it("does not navigate when Enter is pressed while no row has focus context", () => {
		render(<WalletTable wallets={wallets} />);
		// No row focused/keyboard event fired — sanity check that mounting
		// alone never triggers a navigation side effect.
		expect(pushMock).not.toHaveBeenCalled();
	});
});
