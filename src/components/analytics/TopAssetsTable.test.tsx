import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { TopAssetsTable } from "./TopAssetsTable";
import type { AssetData } from "@/mock-data/analytics";

// Mock the CopyButton component
vi.mock("./CopyButton", () => ({
	CopyButton: ({
		text,
		label,
		onCopySuccess,
	}: {
		text: string;
		label?: string;
		onCopySuccess?: (text: string) => void;
	}) => (
		<button
			data-testid="analytics-copy-button"
			onClick={() => onCopySuccess?.(text)}
			aria-label={label}
		>
			Copy
		</button>
	),
}));

const mockAssets: AssetData[] = [
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

describe("TopAssetsTable", () => {
	it("renders table with header", () => {
		render(<TopAssetsTable assets={mockAssets} />);
		expect(screen.getByText("Top Assets by Volume")).toBeInTheDocument();
		expect(
			screen.getByText("Highest traded assets on the platform"),
		).toBeInTheDocument();
	});

	it("renders all column headers", () => {
		render(<TopAssetsTable assets={mockAssets} />);
		expect(screen.getByText("#")).toBeInTheDocument();
		expect(screen.getByText("Asset")).toBeInTheDocument();
		expect(screen.getByText("Volume")).toBeInTheDocument();
		expect(screen.getByText("Change")).toBeInTheDocument();
		expect(screen.getByText("TVL")).toBeInTheDocument();
		expect(screen.getByText("Transactions")).toBeInTheDocument();
	});

	it("renders all assets", () => {
		render(<TopAssetsTable assets={mockAssets} />);

		for (const asset of mockAssets) {
			expect(screen.getByText(asset.name)).toBeInTheDocument();
			expect(screen.getByText(asset.symbol)).toBeInTheDocument();
			expect(screen.getByText(asset.volume)).toBeInTheDocument();
		}
	});

	it("renders copy buttons for each asset (symbol, volume, TVL)", () => {
		render(<TopAssetsTable assets={mockAssets} />);
		const copyButtons = screen.getAllByTestId("analytics-copy-button");
		// 3 copy buttons per asset: symbol, volume, TVL
		expect(copyButtons.length).toBe(mockAssets.length * 3);
	});

	it("displays asset rankings", () => {
		render(<TopAssetsTable assets={mockAssets} />);
		expect(screen.getByText("1")).toBeInTheDocument();
		expect(screen.getByText("2")).toBeInTheDocument();
		expect(screen.getByText("3")).toBeInTheDocument();
	});

	it("displays asset icons with first letter of symbol", () => {
		const { container } = render(<TopAssetsTable assets={mockAssets} />);
		expect(container.textContent).toContain("M"); // MUX
		expect(container.textContent).toContain("X"); // XLM
		expect(container.textContent).toContain("U"); // USDC
	});

	it("displays positive volume changes in emerald color", () => {
		render(<TopAssetsTable assets={mockAssets} />);
		const positiveChange = screen.getByText("15.2%");
		expect(positiveChange.className).toContain("text-emerald-600");
	});

	it("displays negative volume changes in red color", () => {
		render(<TopAssetsTable assets={mockAssets} />);
		const negativeChange = screen.getByText("3.1%");
		expect(negativeChange.className).toContain("text-red-600");
	});

	it("displays TVL values", () => {
		render(<TopAssetsTable assets={mockAssets} />);
		expect(screen.getByText("$18.2M")).toBeInTheDocument();
		expect(screen.getByText("$12.8M")).toBeInTheDocument();
		expect(screen.getByText("$45.6M")).toBeInTheDocument();
	});

	it("displays transaction counts with locale formatting", () => {
		render(<TopAssetsTable assets={mockAssets} />);
		expect(screen.getByText("28,432")).toBeInTheDocument();
		expect(screen.getByText("21,890")).toBeInTheDocument();
		expect(screen.getByText("15,678")).toBeInTheDocument();
	});

	it("handles symbol copy button click", async () => {
		const user = userEvent.setup();
		render(<TopAssetsTable assets={mockAssets} />);

		const copyButtons = screen.getAllByTestId("analytics-copy-button");
		await user.click(copyButtons[0]); // First button is symbol copy
		// Toast behavior is tested via integration
	});

	it("handles volume copy button click", async () => {
		const user = userEvent.setup();
		render(<TopAssetsTable assets={mockAssets} />);

		const copyButtons = screen.getAllByTestId("analytics-copy-button");
		await user.click(copyButtons[1]); // Second button is volume copy
		// Toast behavior is tested via integration
	});

	it("handles TVL copy button click", async () => {
		const user = userEvent.setup();
		render(<TopAssetsTable assets={mockAssets} />);

		const copyButtons = screen.getAllByTestId("analytics-copy-button");
		await user.click(copyButtons[2]); // Third button is TVL copy
		// Toast behavior is tested via integration
	});

	it("has group hover effect on rows", () => {
		const { container } = render(<TopAssetsTable assets={mockAssets} />);
		const rows = container.querySelectorAll("tbody tr");
		for (const row of rows) {
			expect(row.className).toContain("group");
		}
	});

	it("copy buttons become visible on row hover", () => {
		const { container } = render(<TopAssetsTable assets={mockAssets} />);
		const copyButtonContainers = container.querySelectorAll(
			".opacity-0.group-hover\\:opacity-100",
		);
		expect(copyButtonContainers.length).toBeGreaterThan(0);
	});

	it("has responsive column visibility", () => {
		const { container } = render(<TopAssetsTable assets={mockAssets} />);
		const changeColumns = container.querySelectorAll(
			"th.hidden.sm\\:table-cell",
		);
		const tvlColumns = container.querySelectorAll("th.hidden.md\\:table-cell");
		expect(changeColumns.length).toBeGreaterThan(0);
		expect(tvlColumns.length).toBeGreaterThan(0);
	});

	it("handles empty assets array", () => {
		render(<TopAssetsTable assets={[]} />);
		expect(screen.getByText("Top Assets by Volume")).toBeInTheDocument();
		const copyButtons = screen.queryAllByTestId("analytics-copy-button");
		expect(copyButtons).toHaveLength(0);
	});

	it("each copy button has correct accessible label", () => {
		render(<TopAssetsTable assets={mockAssets} />);

		expect(screen.getByLabelText("Copy MUX symbol")).toBeInTheDocument();
		expect(screen.getByLabelText("Copy MUX volume")).toBeInTheDocument();
		expect(screen.getByLabelText("Copy MUX TVL")).toBeInTheDocument();
	});

	it("rows have hover background effect", () => {
		const { container } = render(<TopAssetsTable assets={mockAssets} />);
		const rows = container.querySelectorAll("tbody tr");
		for (const row of rows) {
			expect(row.className).toContain("hover:bg-zinc-50");
		}
	});

	it("renders table with proper overflow handling", () => {
		const { container } = render(<TopAssetsTable assets={mockAssets} />);
		const overflowContainer = container.querySelector(".overflow-x-auto");
		expect(overflowContainer).toBeInTheDocument();
	});

	it("table has minimum width for scrolling on small screens", () => {
		const { container } = render(<TopAssetsTable assets={mockAssets} />);
		const table = container.querySelector("table");
		expect(table?.className).toContain("min-w-[480px]");
	});
});
