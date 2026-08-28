import { render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ApiKeyUsageAnalytics } from "@/components/dashboard/ApiKeyUsageAnalytics";
import type { ApiKeyUsageSummary } from "@/mock-data/api-key-usage";

const mockUsage: ApiKeyUsageSummary = {
	apiKeyId: "1",
	totalRequests: 1200,
	requestsLast24h: 42,
	lastUsedAt: "2024-01-20T00:00:00Z",
	dailyRequests: [
		{ date: "2024-01-19", requests: 10 },
		{ date: "2024-01-20", requests: 42 },
	],
};

afterEach(() => {
	vi.restoreAllMocks();
	vi.unstubAllGlobals();
});

describe("ApiKeyUsageAnalytics", () => {
	it("shows a loading state before data resolves", () => {
		vi.stubGlobal("fetch", vi.fn(() => new Promise(() => {})));

		render(<ApiKeyUsageAnalytics apiKeyId="1" />);
		expect(screen.getByRole("status", { name: /loading api key usage/i })).toBeInTheDocument();
	});

	it("renders usage totals once loaded", async () => {
		vi.stubGlobal(
			"fetch",
			vi.fn().mockResolvedValue({
				ok: true,
				json: () => Promise.resolve({ data: mockUsage }),
			}),
		);

		render(<ApiKeyUsageAnalytics apiKeyId="1" apiKeyName="Production" />);

		await waitFor(() =>
			expect(screen.getByText(/usage analytics/i)).toBeInTheDocument(),
		);
		expect(screen.getByText("1,200")).toBeInTheDocument();
		expect(screen.getByText("42")).toBeInTheDocument();
	});

	it("renders an error state with a retry action on failure", async () => {
		vi.stubGlobal(
			"fetch",
			vi.fn().mockResolvedValue({ ok: false, status: 502 }),
		);

		render(<ApiKeyUsageAnalytics apiKeyId="1" />);

		await waitFor(() =>
			expect(
				screen.getByText(/unable to load usage analytics/i),
			).toBeInTheDocument(),
		);
	});
});
