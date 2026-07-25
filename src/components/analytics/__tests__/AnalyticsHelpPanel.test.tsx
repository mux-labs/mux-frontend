import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AnalyticsHelpPanel } from "../AnalyticsHelpPanel";

describe("AnalyticsHelpPanel (#454)", () => {
	beforeEach(() => {
		// Reset sessionStorage before each test so dismissal state is clean.
		sessionStorage.clear();
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	it("renders the help panel by default", () => {
		render(<AnalyticsHelpPanel />);
		expect(
			screen.getByRole("complementary", {
				name: /analytics data sources help/i,
			}),
		).toBeInTheDocument();
	});

	it("shows the 'About these analytics' heading", () => {
		render(<AnalyticsHelpPanel />);
		expect(
			screen.getByRole("heading", { name: /about these analytics/i }),
		).toBeInTheDocument();
	});

	it("documents all four data sources", () => {
		render(<AnalyticsHelpPanel />);
		expect(screen.getByText(/metrics cards/i)).toBeInTheDocument();
		expect(screen.getByText(/volume chart/i)).toBeInTheDocument();
		expect(screen.getByText(/transactions chart/i)).toBeInTheDocument();
		expect(screen.getByText(/top assets table/i)).toBeInTheDocument();
	});

	it("shows the API endpoint for metrics cards", () => {
		render(<AnalyticsHelpPanel />);
		expect(screen.getByText("GET /api/analytics/metrics")).toBeInTheDocument();
	});

	it("shows a dismiss button", () => {
		render(<AnalyticsHelpPanel />);
		expect(
			screen.getByRole("button", { name: /dismiss analytics help/i }),
		).toBeInTheDocument();
	});

	it("hides the panel after clicking dismiss", async () => {
		const user = userEvent.setup();
		render(<AnalyticsHelpPanel />);

		await user.click(
			screen.getByRole("button", { name: /dismiss analytics help/i }),
		);

		expect(
			screen.queryByRole("complementary", {
				name: /analytics data sources help/i,
			}),
		).not.toBeInTheDocument();
	});

	it("persists dismissal in sessionStorage", async () => {
		const user = userEvent.setup();
		render(<AnalyticsHelpPanel />);

		await user.click(
			screen.getByRole("button", { name: /dismiss analytics help/i }),
		);

		expect(sessionStorage.getItem("analytics-help-dismissed")).toBe("true");
	});

	it("does not render when already dismissed in sessionStorage", () => {
		sessionStorage.setItem("analytics-help-dismissed", "true");
		render(<AnalyticsHelpPanel />);

		expect(
			screen.queryByRole("complementary", {
				name: /analytics data sources help/i,
			}),
		).not.toBeInTheDocument();
	});

	it("has a link to the full API reference", () => {
		render(<AnalyticsHelpPanel />);
		const link = screen.getByRole("link", { name: /full api reference/i });
		expect(link).toBeInTheDocument();
		expect(link).toHaveAttribute("href", "/docs/analytics");
	});

	it("mentions the 5-minute refresh cadence", () => {
		render(<AnalyticsHelpPanel />);
		expect(screen.getByText(/5 minutes/i)).toBeInTheDocument();
	});
});
