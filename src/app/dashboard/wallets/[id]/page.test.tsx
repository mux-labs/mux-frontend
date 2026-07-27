import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import WalletDetailPage from "./page";

vi.mock("@/components/wallet/WalletDetail", () => ({
	WalletDetail: ({ id }: { id: string }) => (
		<div data-testid="wallet-detail">Wallet {id}</div>
	),
}));

describe("WalletDetailPage", () => {
	it("uses the shared PageHeader with a wallets back action", async () => {
		const ui = await WalletDetailPage({
			params: Promise.resolve({ id: "wallet-001" }),
		});

		render(ui);

		expect(
			screen.getByRole("heading", { level: 1, name: "Wallet Detail" }),
		).toBeInTheDocument();
		expect(
			screen.getByText("Live balance, identity, and account activity"),
		).toBeInTheDocument();
		expect(screen.getByRole("link", { name: /back to wallets/i })).toHaveAttribute(
			"href",
			"/dashboard/wallets",
		);
		expect(screen.getByTestId("wallet-detail")).toHaveTextContent("wallet-001");
	});
});
