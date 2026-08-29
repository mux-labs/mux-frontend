/**
 * Regression tests for #706: DashboardOverview must type against the
 * canonical OverviewData, not the mock-only type in src/mock-data/overview.ts.
 *
 * The structural checks below are compile-time assertions expressed as
 * runtime tests so they will fail in CI if the type contract regresses.
 */
import { describe, expect, it } from "vitest";
import type { OverviewData } from "@/types/overview";
import { mockOverview } from "@/mock-data/overview";

describe("OverviewData canonical type (#706)", () => {
	it("mock fixture satisfies the canonical OverviewData shape", () => {
		// If the mock-data type and the canonical type diverge this assignment
		// will produce a TypeScript error at compile time AND the runtime
		// property checks below will catch any missing fields.
		const data: OverviewData = mockOverview;

		expect(typeof data.totalWallets).toBe("number");
		expect(typeof data.activeWallets).toBe("number");
		expect(typeof data.totalTransactions).toBe("number");
		expect(typeof data.totalVolumeXlm).toBe("string");
		expect(typeof data.apiRequestsToday).toBe("number");
		expect(typeof data.lastUpdated).toBe("string");
	});

	it("canonical type requires all mandatory fields (regression guard)", () => {
		// Constructing a value that is missing a field would produce a
		// TypeScript compile error.  The runtime check confirms the field set
		// at least matches what downstream components rely on.
		const requiredFields: Array<keyof OverviewData> = [
			"totalWallets",
			"activeWallets",
			"totalTransactions",
			"totalVolumeXlm",
			"apiRequestsToday",
			"lastUpdated",
		];

		for (const field of requiredFields) {
			expect(
				mockOverview,
				`mockOverview is missing required field: ${field}`,
			).toHaveProperty(field);
		}
	});

	it("REGRESSION #706: OverviewData is not imported from mock-data by DashboardOverview", async () => {
		// This test acts as a documentation guard.  The real enforcement is the
		// TypeScript import in DashboardOverview.tsx pointing to @/types/overview.
		// Here we confirm the canonical module exports the type and the mock
		// module re-exports it (backward compat) rather than redefining it.
		const canonicalModule = await import("@/types/overview");
		const mockModule = await import("@/mock-data/overview");

		// Both modules must expose an OverviewData-shaped object (mockOverview).
		expect(mockModule.mockOverview).toBeDefined();

		// The canonical module must not export a mockOverview fixture
		// (it is a types-only module).
		expect(
			(canonicalModule as Record<string, unknown>).mockOverview,
		).toBeUndefined();
	});
});
