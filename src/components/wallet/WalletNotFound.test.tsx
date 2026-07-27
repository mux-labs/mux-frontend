import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { WalletNotFound } from "./WalletNotFound";

describe("WalletNotFound", () => {
	it("renders the not found title", () => {
		render(<WalletNotFound />);
		expect(screen.getByText("Wallet not found")).toBeInTheDocument();
	});

	it("shows a generic description when no wallet id is given", () => {
		render(<WalletNotFound />);
		expect(
			screen.getByText(
				"No wallet exists for this ID. It may have been removed or the link is invalid.",
			),
		).toBeInTheDocument();
	});

	it("includes the wallet id in the description when provided", () => {
		render(<WalletNotFound walletId="w-does-not-exist" />);
		expect(
			screen.getByText(/No wallet exists for id "w-does-not-exist"/),
		).toBeInTheDocument();
	});

	it("renders a link back to the wallets dashboard by default", () => {
		render(<WalletNotFound />);
		const link = screen.getByRole("link", { name: /back to wallets/i });
		expect(link).toBeInTheDocument();
		expect(link).toHaveAttribute("href", "/dashboard/wallets");
	});

	it("supports a custom back link destination and label", () => {
		render(<WalletNotFound backHref="/dashboard" backLabel="Back to dashboard" />);
		const link = screen.getByRole("link", { name: /back to dashboard/i });
		expect(link).toHaveAttribute("href", "/dashboard");
	});

	it("announces the not-found state to assistive technology", () => {
		const { container } = render(<WalletNotFound />);
		const status = container.querySelector('[role="status"]');
		expect(status).toBeInTheDocument();
		expect(status).toHaveAttribute("aria-live", "polite");
	});

	it("does not render a retry button since retrying a bad id cannot succeed", () => {
		render(<WalletNotFound />);
		expect(screen.queryByRole("button")).not.toBeInTheDocument();
	});
});
