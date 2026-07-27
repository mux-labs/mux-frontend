import { render, screen } from "@testing-library/react";
import React from "react";
import { vi } from "vitest";
import { ExplorerLink } from "../ExplorerLink";

// Mock the getExplorerUrl function
vi.mock("@/utils/explorerUrl", () => ({
	getExplorerUrl: vi.fn((address, network) => {
		return `https://stellar.expert/explorer/${network}/account/${address}`;
	}),
	isValidStellarAddress: vi.fn((address) => {
		return /^G[A-Z2-7]{55}$/.test(address);
	}),
}));

describe("ExplorerLink component", () => {
	const validAddress =
		"GBZXN7PIRZGNMHGA7MUUUF4GWPY5AYPV6LY4UV2GL6VJGIQRXFDNMADI";
	const invalidAddress = "INVALID_ADDRESS";

	it("should render as a link with valid address", () => {
		render(
			<ExplorerLink
				address={validAddress}
				network="mainnet"
				label="View on Explorer"
			/>,
		);

		const link = screen.getByRole("link");
		expect(link).toBeInTheDocument();
		expect(link).toHaveAttribute("target", "_blank");
		expect(link).toHaveAttribute("rel", "noopener noreferrer");
	});

	it("should render disabled button with invalid address", () => {
		render(
			<ExplorerLink
				address={invalidAddress}
				network="mainnet"
				label="View on Explorer"
			/>,
		);

		const button = screen.getByRole("button");
		expect(button).toBeDisabled();
		expect(button).toHaveAttribute("title", "Invalid address");
	});

	it("should show external link icon by default", () => {
		const { container } = render(
			<ExplorerLink address={validAddress} network="mainnet" />,
		);

		const icon = container.querySelector("svg");
		expect(icon).toBeInTheDocument();
	});

	it("should hide icon when showIcon is false", () => {
		const { container } = render(
			<ExplorerLink
				address={validAddress}
				network="mainnet"
				showIcon={false}
			/>,
		);

		const icon = container.querySelector("svg");
		expect(icon).not.toBeInTheDocument();
	});

	it("should display label when provided", () => {
		render(
			<ExplorerLink
				address={validAddress}
				network="mainnet"
				label="View on Explorer"
			/>,
		);

		expect(screen.getByText("View on Explorer")).toBeInTheDocument();
	});

	it("should apply custom className", () => {
		const { container } = render(
			<ExplorerLink
				address={validAddress}
				network="mainnet"
				className="custom-class"
			/>,
		);

		const button = container.querySelector("button");
		expect(button).toHaveClass("custom-class");
	});

	it("should use custom title attribute", () => {
		render(
			<ExplorerLink
				address={validAddress}
				network="mainnet"
				title="Custom title"
			/>,
		);

		const link = screen.getByRole("link");
		expect(link).toHaveAttribute("title", "Custom title");
	});

	it("should use default title for valid address", () => {
		render(<ExplorerLink address={validAddress} network="mainnet" />);

		const link = screen.getByRole("link");
		expect(link).toHaveAttribute("title", "View on Stellar Explorer (mainnet)");
	});

	it("should support different button variants", () => {
		const { container: container1 } = render(
			<ExplorerLink
				address={validAddress}
				network="mainnet"
				variant="outline"
			/>,
		);

		const button1 = container1.querySelector("button");
		expect(button1).toHaveAttribute("data-variant", "outline");

		const { container: container2 } = render(
			<ExplorerLink address={validAddress} network="mainnet" variant="link" />,
		);

		const button2 = container2.querySelector("button");
		expect(button2).toHaveAttribute("data-variant", "link");
	});

	it("should support different button sizes", () => {
		const { container } = render(
			<ExplorerLink address={validAddress} network="mainnet" size="lg" />,
		);

		const button = container.querySelector("button");
		expect(button).toHaveAttribute("data-size", "lg");
	});

	it("should work with testnet", () => {
		render(
			<ExplorerLink
				address={validAddress}
				network="testnet"
				label="View on Explorer"
			/>,
		);

		const link = screen.getByRole("link");
		expect(link).toHaveAttribute("title", "View on Stellar Explorer (testnet)");
	});

	it("should handle account type", () => {
		render(
			<ExplorerLink address={validAddress} network="mainnet" type="account" />,
		);

		const link = screen.getByRole("link");
		expect(link).toBeInTheDocument();
	});
});
