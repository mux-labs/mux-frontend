import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { NetworkBadge } from "../NetworkBadge";

/**
 * Coverage for the scenarios added to NetworkBadge.stories.tsx
 * (DarkMode, InWalletRow, CompactSize) so the fixtures behind those
 * stories are also exercised by the automated test suite, not just
 * visually in Storybook.
 */
describe("NetworkBadge stories fixtures", () => {
	it("renders correctly inside a dark-mode wrapper", () => {
		render(
			<div className="dark bg-zinc-950 p-6">
				<NetworkBadge network="testnet" />
			</div>,
		);
		expect(screen.getByText("Testnet")).toBeInTheDocument();
	});

	it("renders alongside other wallet metadata (InWalletRow fixture)", () => {
		render(
			<div className="flex items-center gap-3 rounded-lg border p-3">
				<code>GBZX...MADI</code>
				<NetworkBadge network="mainnet" />
			</div>,
		);
		expect(screen.getByText("GBZX...MADI")).toBeInTheDocument();
		expect(screen.getByText("Mainnet")).toBeInTheDocument();
	});

	it("still shows the label when given a compact custom className", () => {
		const { container } = render(
			<NetworkBadge network="mainnet" className="text-[10px] px-2 py-0" />,
		);
		const badge = container.querySelector("span");
		expect(badge).toHaveClass("text-[10px]");
		expect(screen.getByText("Mainnet")).toBeInTheDocument();
	});

	it("keeps both networks visually distinct when rendered together (AllVariants fixture)", () => {
		const { container } = render(
			<div className="flex gap-3">
				<NetworkBadge network="mainnet" />
				<NetworkBadge network="testnet" />
			</div>,
		);
		const spans = container.querySelectorAll("span");
		expect(spans).toHaveLength(2);
		expect(spans[0].className).not.toBe(spans[1].className);
	});
});
