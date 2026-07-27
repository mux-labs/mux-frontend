import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { AnalyticsHeader } from "./AnalyticsHeader";

const range = {
	from: "2026-07-19",
	to: "2026-07-26",
};

describe("AnalyticsHeader", () => {
	it("renders the shared page heading and dashboard controls", () => {
		render(
			<AnalyticsHeader
				range={range}
				onRangeChange={vi.fn()}
				onRefresh={vi.fn()}
			/>,
		);

		expect(
			screen.getByRole("heading", { level: 1, name: "Analytics" }),
		).toBeInTheDocument();
		expect(
			screen.getByText(
				"Comprehensive overview of platform metrics, volumes, and trends",
			),
		).toBeInTheDocument();
		expect(
			screen.getByRole("button", { name: "Refresh analytics data" }),
		).toBeInTheDocument();
	});
});
