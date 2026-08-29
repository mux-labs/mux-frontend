import { renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useApiKeyUsage } from "@/hooks/useApiKeyUsage";
import type { ApiKeyUsageSummary } from "@/mock-data/api-key-usage";

const mockUsage: ApiKeyUsageSummary = {
	apiKeyId: "1",
	totalRequests: 1200,
	requestsLast24h: 42,
	lastUsedAt: "2024-01-20T00:00:00Z",
	dailyRequests: [{ date: "2024-01-20", requests: 42 }],
};

afterEach(() => {
	vi.restoreAllMocks();
	vi.unstubAllGlobals();
});

describe("useApiKeyUsage", () => {
	it("does not fetch when no key id is provided", () => {
		const fetchMock = vi.fn();
		vi.stubGlobal("fetch", fetchMock);

		const { result } = renderHook(() => useApiKeyUsage(undefined));

		expect(result.current.loading).toBe(false);
		expect(result.current.data).toBeNull();
		expect(fetchMock).not.toHaveBeenCalled();
	});

	it("returns usage analytics for a key on success", async () => {
		vi.stubGlobal(
			"fetch",
			vi.fn().mockResolvedValue({
				ok: true,
				json: () => Promise.resolve({ data: mockUsage }),
			}),
		);

		const { result } = renderHook(() => useApiKeyUsage("1"));
		expect(result.current.loading).toBe(true);

		await waitFor(() => expect(result.current.loading).toBe(false));
		expect(result.current.data).toEqual(mockUsage);
		expect(result.current.error).toBeNull();
	});

	it("surfaces an error when the request fails", async () => {
		vi.stubGlobal(
			"fetch",
			vi.fn().mockResolvedValue({ ok: false, status: 502 }),
		);

		const { result } = renderHook(() => useApiKeyUsage("1"));

		await waitFor(() => expect(result.current.loading).toBe(false));
		expect(result.current.data).toBeNull();
		expect(result.current.error).toBeInstanceOf(Error);
	});
});
