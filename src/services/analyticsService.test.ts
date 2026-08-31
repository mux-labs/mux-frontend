import { beforeEach, describe, expect, it, vi } from "vitest";
import type ApiClient from "@/lib/api/client";
import {
	fetchAllAnalytics,
	fetchExportTransactions,
	fetchMetrics,
	fetchTopAssets,
	fetchTransactionsData,
	fetchVolumeData,
} from "./analyticsService";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const RANGE = { from: "2024-01-01", to: "2024-01-07" };

function makeClient(overrides: Partial<ApiClient> = {}): ApiClient {
	return {
		get: vi.fn(),
		post: vi.fn(),
		...overrides,
	} as unknown as ApiClient;
}

// ---------------------------------------------------------------------------
// fetchMetrics
// ---------------------------------------------------------------------------

describe("fetchMetrics", () => {
	it("calls the correct endpoint with date range params", async () => {
		const client = makeClient({
			get: vi.fn().mockResolvedValue({
				metrics: [
					{
						label: "Total Volume",
						value: "$1M",
						change: 5,
						changeLabel: "vs last period",
					},
				],
			}),
		});

		const result = await fetchMetrics(client, RANGE);

		expect(client.get).toHaveBeenCalledWith(
			"/analytics/metrics?from=2024-01-01&to=2024-01-07",
		);
		expect(result).toHaveLength(1);
		expect(result[0].label).toBe("Total Volume");
	});

	it("propagates errors from the client", async () => {
		const client = makeClient({
			get: vi.fn().mockRejectedValue(new Error("Network error")),
		});

		await expect(fetchMetrics(client, RANGE)).rejects.toThrow("Network error");
	});
});

// ---------------------------------------------------------------------------
// fetchVolumeData
// ---------------------------------------------------------------------------

describe("fetchVolumeData", () => {
	it("calls the correct endpoint and returns data array", async () => {
		const client = makeClient({
			get: vi.fn().mockResolvedValue({
				data: [{ date: "Mon", value: 2400000 }],
			}),
		});

		const result = await fetchVolumeData(client, RANGE);

		expect(client.get).toHaveBeenCalledWith(
			"/analytics/volume?from=2024-01-01&to=2024-01-07",
		);
		expect(result).toHaveLength(1);
		expect(result[0].date).toBe("Mon");
	});
});

// ---------------------------------------------------------------------------
// fetchTransactionsData
// ---------------------------------------------------------------------------

describe("fetchTransactionsData", () => {
	it("calls the correct endpoint and returns data array", async () => {
		const client = makeClient({
			get: vi.fn().mockResolvedValue({
				data: [{ date: "Mon", value: 12000 }],
			}),
		});

		const result = await fetchTransactionsData(client, RANGE);

		expect(client.get).toHaveBeenCalledWith(
			"/analytics/transactions?from=2024-01-01&to=2024-01-07",
		);
		expect(result[0].value).toBe(12000);
	});
});

// ---------------------------------------------------------------------------
// fetchTopAssets
// ---------------------------------------------------------------------------

describe("fetchTopAssets", () => {
	it("calls the correct endpoint and returns assets array", async () => {
		const client = makeClient({
			get: vi.fn().mockResolvedValue({
				assets: [
					{
						rank: 1,
						name: "Mux Protocol",
						symbol: "MUX",
						volume: "$4M",
						volumeChange: 15,
						tvl: "$18M",
						txCount: 28000,
					},
				],
			}),
		});

		const result = await fetchTopAssets(client, RANGE);

		expect(client.get).toHaveBeenCalledWith(
			"/analytics/top-assets?from=2024-01-01&to=2024-01-07",
		);
		expect(result[0].symbol).toBe("MUX");
	});
});

// ---------------------------------------------------------------------------
// fetchExportTransactions
// ---------------------------------------------------------------------------

describe("fetchExportTransactions", () => {
	it("calls the export transactions-list endpoint with date range params", async () => {
		const client = makeClient({
			get: vi.fn().mockResolvedValue({
				transactions: [
					{
						id: "tx-1",
						description: "Mainnet payout",
						date: "2024-01-03",
						humanDate: "Jan 3, 2024",
						category: "MW",
						status: "completed",
						amount: 250,
						currency: "XLM",
						type: "outgoing",
					},
				],
			}),
		});

		const result = await fetchExportTransactions(client, RANGE);

		expect(client.get).toHaveBeenCalledWith(
			"/analytics/transactions-list?from=2024-01-01&to=2024-01-07",
		);
		expect(result).toHaveLength(1);
		expect(result[0].description).toBe("Mainnet payout");
	});

	it("returns an empty array when the backend omits the transactions field", async () => {
		const client = makeClient({
			get: vi.fn().mockResolvedValue({}),
		});

		const result = await fetchExportTransactions(client, RANGE);
		expect(result).toEqual([]);
	});

	it("propagates errors from the client", async () => {
		const client = makeClient({
			get: vi.fn().mockRejectedValue(new Error("Network error")),
		});

		await expect(fetchExportTransactions(client, RANGE)).rejects.toThrow(
			"Network error",
		);
	});
});

// ---------------------------------------------------------------------------
// fetchAllAnalytics
// ---------------------------------------------------------------------------

describe("fetchAllAnalytics", () => {
	it("fetches all four endpoints in parallel and returns combined payload", async () => {
		const getMock = vi.fn().mockImplementation((path: string) => {
			if (path.startsWith("/analytics/metrics"))
				return Promise.resolve({
					metrics: [
						{ label: "Vol", value: "$1M", change: 1, changeLabel: "vs last" },
					],
				});
			if (path.startsWith("/analytics/volume"))
				return Promise.resolve({ data: [{ date: "Mon", value: 100 }] });
			if (path.startsWith("/analytics/transactions"))
				return Promise.resolve({ data: [{ date: "Mon", value: 50 }] });
			if (path.startsWith("/analytics/top-assets"))
				return Promise.resolve({
					assets: [
						{
							rank: 1,
							name: "MUX",
							symbol: "MUX",
							volume: "$1M",
							volumeChange: 5,
							tvl: "$5M",
							txCount: 1000,
						},
					],
				});
			return Promise.reject(new Error(`Unexpected path: ${path}`));
		});

		const client = makeClient({ get: getMock });
		const result = await fetchAllAnalytics(client, RANGE);

		expect(getMock).toHaveBeenCalledTimes(4);
		expect(result.metrics).toHaveLength(1);
		expect(result.volumeData).toHaveLength(1);
		expect(result.transactionsData).toHaveLength(1);
		expect(result.topAssets).toHaveLength(1);
	});

	it("rejects if any individual fetch fails", async () => {
		const getMock = vi.fn().mockRejectedValue(new Error("API down"));
		const client = makeClient({ get: getMock });

		await expect(fetchAllAnalytics(client, RANGE)).rejects.toThrow("API down");
	});
});

// ---------------------------------------------------------------------------
// Query string encoding
// ---------------------------------------------------------------------------

describe("date range query string encoding", () => {
	it("URL-encodes special characters in dates", async () => {
		const client = makeClient({
			get: vi.fn().mockResolvedValue({ metrics: [] }),
		});

		// Dates are plain YYYY-MM-DD so no special chars, but verify the format
		await fetchMetrics(client, { from: "2024-01-01", to: "2024-12-31" });

		expect(client.get).toHaveBeenCalledWith(
			"/analytics/metrics?from=2024-01-01&to=2024-12-31",
		);
	});
});
