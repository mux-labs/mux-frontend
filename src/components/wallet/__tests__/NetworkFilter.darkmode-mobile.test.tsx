/**
 * Tests covering changes from #304-307:
 *  - #306: dark mode ring-offset on active NetworkFilter button
 *  - #307: mobile flex-1 class on NetworkFilter buttons
 */
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { NetworkFilter } from "@/components/wallet/NetworkFilter";

const noop = () => {};

describe("NetworkFilter – #306 dark mode ring-offset", () => {
	it("applies dark:ring-offset-background to the active button", () => {
		render(<NetworkFilter selectedNetwork="testnet" onNetworkChange={noop} />);
		const btn = screen.getByLabelText("Filter by Testnet");
		expect(btn).toHaveClass("dark:ring-offset-background");
	});

	it("does NOT apply ring-2 to inactive buttons", () => {
		render(<NetworkFilter selectedNetwork="testnet" onNetworkChange={noop} />);
		const mainnetBtn = screen.getByLabelText("Filter by Mainnet");
		expect(mainnetBtn).not.toHaveClass("ring-2");
	});

	it("moves ring to newly active button on selection change", () => {
		const { rerender } = render(
			<NetworkFilter selectedNetwork="testnet" onNetworkChange={noop} />,
		);
		rerender(
			<NetworkFilter selectedNetwork="mainnet" onNetworkChange={noop} />,
		);
		const mainnetBtn = screen.getByLabelText("Filter by Mainnet");
		const testnetBtn = screen.getByLabelText("Filter by Testnet");
		expect(mainnetBtn).toHaveClass("ring-2");
		expect(testnetBtn).not.toHaveClass("ring-2");
	});
});

describe("NetworkFilter – #307 mobile layout (flex-1 sm:flex-none)", () => {
	it("applies flex-1 to all buttons for mobile stretch", () => {
		render(<NetworkFilter selectedNetwork="all" onNetworkChange={noop} />);
		const buttons = screen.getAllByRole("button");
		for (const btn of buttons) {
			expect(btn).toHaveClass("flex-1");
		}
	});

	it("applies sm:flex-none to all buttons to revert on larger screens", () => {
		render(<NetworkFilter selectedNetwork="all" onNetworkChange={noop} />);
		const buttons = screen.getAllByRole("button");
		for (const btn of buttons) {
			expect(btn).toHaveClass("sm:flex-none");
		}
	});
});
