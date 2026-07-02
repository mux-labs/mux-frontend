import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { Metric } from "@/mock-data/analytics";
import { MetricsCards } from "./MetricsCards";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const METRICS_POSITIVE: Metric[] = [
	{
		label: "Total Volume",
		value: "$12.4M",
		change: 12.5,
		changeLabel: "vs last period",
	},
	{
		label: "Total Transactions",
		value: "84,231",
		change: 8.2,
		changeLabel: "vs last period",
	},
];

const METRICS_NEGATIVE: Metric[] = [
	{
		label: "Active Wallets",
		value: "3,842",
		change: -2.1,
		changeLabel: "vs last period",
	},
	{
		label: "Success Rate",
		value: "99.2%",
		change: 0.3,
		changeLabel: "vs last period",
	},
];

const METRICS_FULL: Metric[] = [...METRICS_POSITIVE, ...METRICS_NEGATIVE];

// ---------------------------------------------------------------------------
// Rendering with data
// ---------------------------------------------------------------------------

describe("MetricsCards — rendering", () => {
	it("renders a card for each metric", () => {
		const { container } = render(<MetricsCards metrics={METRICS_FULL} />);
		// Each card is a direct child div of the grid
		const grid = container.firstElementChild;
		expect(grid?.children).toHaveLength(4);
	});

	it("renders the label for each metric", () => {
		render(<MetricsCards metrics={METRICS_FULL} />);
		expect(screen.getByText("Total Volume")).toBeInTheDocument();
		expect(screen.getByText("Total Transactions")).toBeInTheDocument();
		expect(screen.getByText("Active Wallets")).toBeInTheDocument();
		expect(screen.getByText("Success Rate")).toBeInTheDocument();
	});

	it("renders the value for each metric", () => {
		render(<MetricsCards metrics={METRICS_FULL} />);
		expect(screen.getByText("$12.4M")).toBeInTheDocument();
		expect(screen.getByText("84,231")).toBeInTheDocument();
		expect(screen.getByText("3,842")).toBeInTheDocument();
		expect(screen.getByText("99.2%")).toBeInTheDocument();
	});

	it("renders the change percentage as an absolute value with % sign", () => {
		render(<MetricsCards metrics={METRICS_FULL} />);
		expect(screen.getByText("12.5%")).toBeInTheDocument();
		expect(screen.getByText("8.2%")).toBeInTheDocument();
		expect(screen.getByText("2.1%")).toBeInTheDocument(); // -2.1 → abs → 2.1
		expect(screen.getByText("0.3%")).toBeInTheDocument();
	});

	it("renders the changeLabel for each metric", () => {
		render(<MetricsCards metrics={METRICS_FULL} />);
		const labels = screen.getAllByText("vs last period");
		expect(labels).toHaveLength(4);
	});

	it("renders with a single metric", () => {
		render(<MetricsCards metrics={[METRICS_POSITIVE[0]]} />);
		expect(screen.getByText("Total Volume")).toBeInTheDocument();
		expect(screen.getByText("$12.4M")).toBeInTheDocument();
	});

	it("renders nothing in the grid when metrics is empty", () => {
		const { container } = render(<MetricsCards metrics={[]} />);
		const grid = container.firstElementChild;
		expect(grid?.children).toHaveLength(0);
	});
});

// ---------------------------------------------------------------------------
// Positive vs negative change styling
// ---------------------------------------------------------------------------

describe("MetricsCards — change direction styling", () => {
	it("applies emerald colour class for a positive change", () => {
		const { container } = render(
			<MetricsCards metrics={[METRICS_POSITIVE[0]]} />,
		);
		// The change badge wrapper has text-emerald-* class
		const badge = container.querySelector('[class*="emerald"]');
		expect(badge).toBeInTheDocument();
	});

	it("applies red colour class for a negative change", () => {
		const { container } = render(
			<MetricsCards metrics={[METRICS_NEGATIVE[0]]} />,
		);
		const badge = container.querySelector('[class*="red"]');
		expect(badge).toBeInTheDocument();
	});

	it("applies emerald colour class for a zero change (neutral treated as non-negative)", () => {
		const zeroChangeMetric: Metric = {
			label: "Zero",
			value: "0",
			change: 0,
			changeLabel: "no change",
		};
		const { container } = render(<MetricsCards metrics={[zeroChangeMetric]} />);
		const badge = container.querySelector('[class*="emerald"]');
		expect(badge).toBeInTheDocument();
	});
});

// ---------------------------------------------------------------------------
// Arrow icons
// ---------------------------------------------------------------------------

describe("MetricsCards — arrow icons", () => {
	it("renders an up-arrow SVG for a positive change", () => {
		const { container } = render(
			<MetricsCards metrics={[METRICS_POSITIVE[0]]} />,
		);
		// ArrowIcon renders an SVG; up arrow has the path "M5 15l7-7 7 7"
		const svg = container.querySelector("svg");
		expect(svg).toBeInTheDocument();
		expect(svg?.innerHTML).toContain("M5 15l7-7 7 7");
	});

	it("renders a down-arrow SVG for a negative change", () => {
		const { container } = render(
			<MetricsCards metrics={[METRICS_NEGATIVE[0]]} />,
		);
		const svg = container.querySelector("svg");
		expect(svg).toBeInTheDocument();
		expect(svg?.innerHTML).toContain("M19 9l-7 7-7-7");
	});
});

// ---------------------------------------------------------------------------
// Edge cases
// ---------------------------------------------------------------------------

describe("MetricsCards — edge cases", () => {
	it("handles a metric with a very large positive change", () => {
		const metric: Metric = {
			label: "Spike",
			value: "999",
			change: 999.99,
			changeLabel: "vs last period",
		};
		render(<MetricsCards metrics={[metric]} />);
		expect(screen.getByText("999.99%")).toBeInTheDocument();
	});

	it("handles a metric with a large negative change", () => {
		const metric: Metric = {
			label: "Drop",
			value: "10",
			change: -100,
			changeLabel: "vs last period",
		};
		render(<MetricsCards metrics={[metric]} />);
		expect(screen.getByText("100%")).toBeInTheDocument();
	});

	it("renders a custom changeLabel correctly", () => {
		const metric: Metric = {
			label: "Custom",
			value: "42",
			change: 5,
			changeLabel: "since yesterday",
		};
		render(<MetricsCards metrics={[metric]} />);
		expect(screen.getByText("since yesterday")).toBeInTheDocument();
	});
});
