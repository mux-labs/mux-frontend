import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { ChartDataPoint } from "@/mock-data/analytics";
import { AnalyticsChart } from "./AnalyticsChart";

const DATA: ChartDataPoint[] = [
	{ date: "Mon", value: 100 },
	{ date: "Tue", value: 200 },
	{ date: "Wed", value: 150 },
];

// ---------------------------------------------------------------------------
// Rendering with data
// ---------------------------------------------------------------------------

describe("AnalyticsChart — with data", () => {
	it("renders the title", () => {
		render(<AnalyticsChart title="Volume" data={DATA} />);
		expect(screen.getByText("Volume")).toBeInTheDocument();
	});

	it("renders the description when provided", () => {
		render(
			<AnalyticsChart title="Volume" description="Daily volume" data={DATA} />,
		);
		expect(screen.getByText("Daily volume")).toBeInTheDocument();
	});

	it("does not render description when omitted", () => {
		render(<AnalyticsChart title="Volume" data={DATA} />);
		expect(screen.queryByText("Daily volume")).not.toBeInTheDocument();
	});

	it("renders a bar for each data point", () => {
		const { container } = render(<AnalyticsChart title="Volume" data={DATA} />);
		// Each SparkBar renders a label span
		const labels = container.querySelectorAll(
			".flex.flex-1.flex-col.items-center",
		);
		expect(labels).toHaveLength(DATA.length);
	});

	it("renders the date labels for each data point", () => {
		render(<AnalyticsChart title="Volume" data={DATA} />);
		expect(screen.getByText("Mon")).toBeInTheDocument();
		expect(screen.getByText("Tue")).toBeInTheDocument();
		expect(screen.getByText("Wed")).toBeInTheDocument();
	});

	it("renders Total and Avg footer values", () => {
		render(<AnalyticsChart title="Volume" data={DATA} />);
		// Total = 450, Avg = 150
		expect(screen.getByText(/total:/i)).toBeInTheDocument();
		expect(screen.getByText(/avg:/i)).toBeInTheDocument();
	});

	it("uses the custom formatValue function", () => {
		render(
			<AnalyticsChart
				title="Volume"
				data={DATA}
				formatValue={(v) => `$${v}`}
			/>,
		);
		expect(screen.getByText("Total: $450")).toBeInTheDocument();
		expect(screen.getByText("Avg: $150")).toBeInTheDocument();
	});

	it("disables nonessential bar transitions for reduced motion users", () => {
		const { container } = render(<AnalyticsChart title="Volume" data={DATA} />);
		const bar = container.querySelector(".motion-reduce\\:transition-none");
		expect(bar).toBeInTheDocument();
	});
});

// ---------------------------------------------------------------------------
// Empty data
// ---------------------------------------------------------------------------

describe("AnalyticsChart — empty data", () => {
	it("renders the default empty message when data is empty", () => {
		render(<AnalyticsChart title="Volume" data={[]} />);
		expect(screen.getByText("No data for this period")).toBeInTheDocument();
	});

	it("renders a custom empty message", () => {
		render(
			<AnalyticsChart
				title="Volume"
				data={[]}
				emptyMessage="Nothing to show"
			/>,
		);
		expect(screen.getByText("Nothing to show")).toBeInTheDocument();
	});

	it("does not render bar elements when data is empty", () => {
		const { container } = render(<AnalyticsChart title="Volume" data={[]} />);
		const bars = container.querySelectorAll(
			".flex.flex-1.flex-col.items-center",
		);
		expect(bars).toHaveLength(0);
	});

	it("does not render Total/Avg footer when data is empty", () => {
		render(<AnalyticsChart title="Volume" data={[]} />);
		expect(screen.queryByText(/total:/i)).not.toBeInTheDocument();
		expect(screen.queryByText(/avg:/i)).not.toBeInTheDocument();
	});
});
