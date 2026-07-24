import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { MultiAssetBalance } from "../MultiAssetBalance";

describe("MultiAssetBalance", () => {
	it("renders an empty state when there are no assets", () => {
		render(<MultiAssetBalance assets={[]} />);
		expect(screen.getByText("No asset balances found.")).toBeInTheDocument();
	});

	it("renders native XLM with consistent precision formatting", () => {
		render(<MultiAssetBalance assets={[{ code: "XLM", balance: "100" }]} />);
		expect(screen.getByText("100.00 XLM")).toBeInTheDocument();
	});

	it("renders non-native assets with their raw balance and code", () => {
		render(
			<MultiAssetBalance
				assets={[{ code: "USDC", issuer: "GISSUER", balance: "42.5" }]}
			/>,
		);
		expect(screen.getByText("42.5 USDC")).toBeInTheDocument();
	});

	it("renders one list item per asset", () => {
		render(
			<MultiAssetBalance
				assets={[
					{ code: "XLM", balance: "10" },
					{ code: "USDC", issuer: "GISSUER", balance: "5" },
				]}
			/>,
		);
		expect(screen.getAllByRole("listitem")).toHaveLength(2);
	});
});
