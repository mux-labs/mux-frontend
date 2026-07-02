import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { AssetData } from "@/mock-data/analytics";
import { TopAssetsTable } from "./TopAssetsTable";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const ASSETS: AssetData[] = [
	{
		rank: 1,
		name: "Mux Protocol",
		symbol: "MUX",
		volume: "$4,234,567",
		volumeChange: 15.2,
		tvl: "$18.2M",
		txCount: 28432,
	},
	{
		rank: 2,
		name: "Stellar",
		symbol: "XLM",
		volume: "$3,456,789",
		volumeChange: 8.7,
		tvl: "$12.8M",
		txCount: 21890,
	},
	{
		rank: 3,
		name: "USDC",
		symbol: "USDC",
		volume: "$2,345,678",
		volumeChange: -3.1,
		tvl: "$45.6M",
		txCount: 15678,
	},
];

const SINGLE_ASSET: AssetData = {
	rank: 1,
	name: "Bitcoin",
	symbol: "BTC",
	volume: "$987,654",
	volumeChange: -1.8,
	tvl: "$6.7M",
	txCount: 5678,
};

// ---------------------------------------------------------------------------
// Structure
// ---------------------------------------------------------------------------

describe("TopAssetsTable — structure", () => {
	it("renders the section heading", () => {
		render(<TopAssetsTable assets={ASSETS} />);
		expect(
			screen.getByRole("heading", { name: /top assets by volume/i }),
		).toBeInTheDocument();
	});

	it("renders the section description", () => {
		render(<TopAssetsTable assets={ASSETS} />);
		expect(screen.getByText(/highest traded assets/i)).toBeInTheDocument();
	});

	it("renders a table element", () => {
		render(<TopAssetsTable assets={ASSETS} />);
		expect(screen.getByRole("table")).toBeInTheDocument();
	});

	it("renders the expected column headers", () => {
		render(<TopAssetsTable assets={ASSETS} />);
		expect(
			screen.getByRole("columnheader", { name: /^#$/i }),
		).toBeInTheDocument();
		expect(
			screen.getByRole("columnheader", { name: /asset/i }),
		).toBeInTheDocument();
		expect(
			screen.getByRole("columnheader", { name: /volume/i }),
		).toBeInTheDocument();
		expect(
			screen.getByRole("columnheader", { name: /change/i }),
		).toBeInTheDocument();
		expect(
			screen.getByRole("columnheader", { name: /tvl/i }),
		).toBeInTheDocument();
		expect(
			screen.getByRole("columnheader", { name: /transactions/i }),
		).toBeInTheDocument();
	});

	it("renders a row for each asset", () => {
		render(<TopAssetsTable assets={ASSETS} />);
		const rows = screen.getAllByRole("row");
		// 1 header row + 3 data rows
		expect(rows).toHaveLength(4);
	});

	it("renders an empty tbody when assets is an empty array", () => {
		render(<TopAssetsTable assets={[]} />);
		const rows = screen.getAllByRole("row");
		// Only the header row
		expect(rows).toHaveLength(1);
	});
});

// ---------------------------------------------------------------------------
// Row content
// ---------------------------------------------------------------------------

describe("TopAssetsTable — row content", () => {
	it("renders the rank for each asset", () => {
		render(<TopAssetsTable assets={ASSETS} />);
		expect(screen.getByText("1")).toBeInTheDocument();
		expect(screen.getByText("2")).toBeInTheDocument();
		expect(screen.getByText("3")).toBeInTheDocument();
	});

	it("renders the full asset name", () => {
		render(<TopAssetsTable assets={ASSETS} />);
		expect(screen.getByText("Mux Protocol")).toBeInTheDocument();
		expect(screen.getByText("Stellar")).toBeInTheDocument();
		// USDC has the same name and symbol; getAllByText handles duplicates
		const usdcElements = screen.getAllByText("USDC");
		expect(usdcElements.length).toBeGreaterThanOrEqual(1);
	});

	it("renders the asset symbol", () => {
		render(<TopAssetsTable assets={ASSETS} />);
		// Symbol appears both as the avatar letter and in the symbol text
		const muxSymbols = screen.getAllByText("MUX");
		expect(muxSymbols.length).toBeGreaterThanOrEqual(1);
	});

	it("renders the pre-formatted volume string", () => {
		render(<TopAssetsTable assets={ASSETS} />);
		expect(screen.getByText("$4,234,567")).toBeInTheDocument();
		expect(screen.getByText("$3,456,789")).toBeInTheDocument();
		expect(screen.getByText("$2,345,678")).toBeInTheDocument();
	});

	it("renders the TVL for each asset", () => {
		render(<TopAssetsTable assets={ASSETS} />);
		expect(screen.getByText("$18.2M")).toBeInTheDocument();
		expect(screen.getByText("$12.8M")).toBeInTheDocument();
		expect(screen.getByText("$45.6M")).toBeInTheDocument();
	});

	it("renders the transaction count with locale formatting", () => {
		render(<TopAssetsTable assets={ASSETS} />);
		// 28432 → "28,432" via .toLocaleString()
		expect(screen.getByText("28,432")).toBeInTheDocument();
		expect(screen.getByText("21,890")).toBeInTheDocument();
		expect(screen.getByText("15,678")).toBeInTheDocument();
	});

	it("renders the volume change as an absolute % value", () => {
		render(<TopAssetsTable assets={ASSETS} />);
		expect(screen.getByText("15.2%")).toBeInTheDocument();
		expect(screen.getByText("8.7%")).toBeInTheDocument();
		// -3.1 → abs → 3.1
		expect(screen.getByText("3.1%")).toBeInTheDocument();
	});

	it("renders an avatar with the first letter of the symbol", () => {
		render(<TopAssetsTable assets={[SINGLE_ASSET]} />);
		// Avatar div contains "B" (first letter of BTC)
		const avatars = screen
			.getAllByText("B")
			.filter((el) => el.classList.contains("rounded-full"));
		expect(avatars.length).toBeGreaterThanOrEqual(1);
	});
});

// ---------------------------------------------------------------------------
// Volume change direction (positive / negative)
// ---------------------------------------------------------------------------

describe("TopAssetsTable — volume change styling", () => {
	it("applies emerald colour for a positive volume change", () => {
		render(<TopAssetsTable assets={[ASSETS[0]]} />); // MUX: +15.2%
		const { container } = render(<TopAssetsTable assets={[ASSETS[0]]} />);
		const badge = container.querySelector('[class*="emerald"]');
		expect(badge).toBeInTheDocument();
	});

	it("applies red colour for a negative volume change", () => {
		const { container } = render(<TopAssetsTable assets={[ASSETS[2]]} />); // USDC: -3.1%
		const badge = container.querySelector('[class*="red"]');
		expect(badge).toBeInTheDocument();
	});

	it("renders an up-arrow SVG for a positive volume change", () => {
		const { container } = render(<TopAssetsTable assets={[ASSETS[0]]} />);
		const svg = container.querySelector("svg");
		expect(svg?.innerHTML).toContain("M5 15l7-7 7 7");
	});

	it("renders a down-arrow SVG for a negative volume change", () => {
		const { container } = render(<TopAssetsTable assets={[ASSETS[2]]} />);
		const svg = container.querySelector("svg");
		expect(svg?.innerHTML).toContain("M19 9l-7 7-7-7");
	});
});

// ---------------------------------------------------------------------------
// Single asset
// ---------------------------------------------------------------------------

describe("TopAssetsTable — single asset", () => {
	it("renders exactly one data row for a single asset", () => {
		render(<TopAssetsTable assets={[SINGLE_ASSET]} />);
		const rows = screen.getAllByRole("row");
		// 1 header + 1 data row
		expect(rows).toHaveLength(2);
	});

	it("renders all fields for the single asset", () => {
		render(<TopAssetsTable assets={[SINGLE_ASSET]} />);
		expect(screen.getByText("Bitcoin")).toBeInTheDocument();
		expect(screen.getByText("$987,654")).toBeInTheDocument();
		expect(screen.getByText("$6.7M")).toBeInTheDocument();
		// 5678 → "5,678"
		expect(screen.getByText("5,678")).toBeInTheDocument();
	});
});

// ---------------------------------------------------------------------------
// Accessibility
// ---------------------------------------------------------------------------

describe("TopAssetsTable — accessibility", () => {
	it("renders a table with correct aria semantics (row/cell roles)", () => {
		render(<TopAssetsTable assets={ASSETS} />);
		const cells = screen.getAllByRole("cell");
		// 6 columns × 3 rows = 18 cells
		// Note: hidden columns still exist in the DOM
		expect(cells.length).toBeGreaterThanOrEqual(3 * 4); // at least 4 visible cols × 3 rows
	});

	it("column headers have text describing the column", () => {
		render(<TopAssetsTable assets={ASSETS} />);
		const headers = screen.getAllByRole("columnheader");
		const texts = headers.map((h) => h.textContent?.trim());
		expect(texts).toContain("#");
		expect(texts).toContain("Asset");
		expect(texts).toContain("Volume");
	});
});
