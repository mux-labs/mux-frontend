import { vi } from "vitest";
import {
	mockRecoveryTimelineCompleted,
	mockRecoveryTimelineInProgress,
} from "@/mock-data/recovery";
import {
	fetchRecoveryEvents,
	fetchRecoveryStatus,
	pollRecoveryStatus,
	type RecoveryStatusResponse,
} from "../recoveryApi";

// Mock fetchWithAuth and loadSession (matching the production module imports)
vi.mock("@/utils/fetchWithAuth", () => ({
	fetchWithAuth: vi.fn(),
}));

vi.mock("@/lib/session", () => ({
	loadSession: vi.fn(),
}));

import { loadSession } from "@/lib/session";
import { fetchWithAuth } from "@/utils/fetchWithAuth";

const mockFetch = vi.mocked(fetchWithAuth);
const mockLoadSession = vi.mocked(loadSession);

function okResponse(body: unknown) {
	return {
		ok: true,
		status: 200,
		json: async () => body,
	} as Response;
}

describe("Recovery API Service", () => {
	beforeEach(() => {
		vi.resetAllMocks();
		vi.useFakeTimers();
		mockLoadSession.mockReturnValue({
			accessToken: "test-access-token",
			refreshToken: "r",
			expiresAt: Date.now() + 60_000,
		});
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	describe("fetchRecoveryStatus", () => {
		it("should fetch recovery status successfully", async () => {
			const mockResponse = {
				...mockRecoveryTimelineCompleted,
				startedAt: mockRecoveryTimelineCompleted.startedAt.toISOString(),
				completedAt: mockRecoveryTimelineCompleted.completedAt?.toISOString(),
				events: mockRecoveryTimelineCompleted.events.map((e) => ({
					...e,
					timestamp: e.timestamp.toISOString(),
				})),
			};

			mockFetch.mockResolvedValueOnce(okResponse(mockResponse));

			const result = await fetchRecoveryStatus("wallet-123");

			expect(result.success).toBe(true);
			expect(result.data).toBeDefined();
			expect(result.data?.id).toBe(mockRecoveryTimelineCompleted.id);
		});

		it("should return error for invalid wallet ID", async () => {
			const result = await fetchRecoveryStatus("");

			expect(result.success).toBe(false);
			expect(result.error).toBeDefined();
		});

		it("should handle network errors with retry", async () => {
			mockFetch
				.mockRejectedValueOnce(new Error("Network error"))
				.mockResolvedValueOnce(
					okResponse({
						...mockRecoveryTimelineCompleted,
						startedAt: mockRecoveryTimelineCompleted.startedAt.toISOString(),
						events: mockRecoveryTimelineCompleted.events.map((e) => ({
							...e,
							timestamp: e.timestamp.toISOString(),
						})),
					}),
				);

			const resultPromise = fetchRecoveryStatus("wallet-123", {
				retryAttempts: 2,
				retryDelay: 100,
			});
			// Advance past retry delay so the setTimeout(resolve) in the retry fires
			await vi.advanceTimersByTimeAsync(200);
			const result = await resultPromise;

			expect(result.success).toBe(true);
			expect(mockFetch).toHaveBeenCalledTimes(2);
		});

		it("should handle HTTP errors", async () => {
			mockFetch.mockResolvedValueOnce({
				ok: false,
				status: 404,
				json: async () => ({ message: "Not found" }),
			} as Response);

			const result = await fetchRecoveryStatus("wallet-123");

			expect(result.success).toBe(false);
			expect(result.error).toBe("Not found");
		});

		it("should handle timeout errors", async () => {
			mockFetch
				.mockRejectedValueOnce(new Error("timeout"))
				.mockResolvedValueOnce(
					okResponse({
						...mockRecoveryTimelineCompleted,
						startedAt: mockRecoveryTimelineCompleted.startedAt.toISOString(),
						events: mockRecoveryTimelineCompleted.events.map((e) => ({
							...e,
							timestamp: e.timestamp.toISOString(),
						})),
					}),
				);

			const resultPromise = fetchRecoveryStatus("wallet-123", {
				retryAttempts: 2,
				retryDelay: 100,
			});
			// Advance past retry delay so the setTimeout(resolve) in the retry fires
			await vi.advanceTimersByTimeAsync(200);
			const result = await resultPromise;

			expect(result.success).toBe(true);
		});

		it("should validate response data", async () => {
			mockFetch.mockResolvedValueOnce(okResponse({ invalid: "data" }));

			const result = await fetchRecoveryStatus("wallet-123");

			expect(result.success).toBe(false);
			expect(result.error).toContain("Invalid");
		});

		it("should parse date strings correctly", async () => {
			const mockResponse = {
				...mockRecoveryTimelineCompleted,
				startedAt: "2025-01-20T10:00:00Z",
				completedAt: "2025-01-20T10:35:00Z",
				events: mockRecoveryTimelineCompleted.events.map((e) => ({
					...e,
					timestamp: e.timestamp.toISOString(),
				})),
			};

			mockFetch.mockResolvedValueOnce(okResponse(mockResponse));

			const result = await fetchRecoveryStatus("wallet-123");

			expect(result.success).toBe(true);
			expect(result.data?.startedAt).toBeInstanceOf(Date);
			expect(result.data?.completedAt).toBeInstanceOf(Date);
		});

		it("should include timestamp in response", async () => {
			mockFetch.mockResolvedValueOnce(
				okResponse({
					...mockRecoveryTimelineCompleted,
					startedAt: mockRecoveryTimelineCompleted.startedAt.toISOString(),
					events: mockRecoveryTimelineCompleted.events.map((e) => ({
						...e,
						timestamp: e.timestamp.toISOString(),
					})),
				}),
			);

			const result = await fetchRecoveryStatus("wallet-123");

			expect(result.timestamp).toBeDefined();
			expect(typeof result.timestamp).toBe("number");
		});
	});

	describe("fetchRecoveryEvents", () => {
		it("should fetch recovery events successfully", async () => {
			const mockEvents = mockRecoveryTimelineCompleted.events.map((e) => ({
				...e,
				timestamp: e.timestamp.toISOString(),
			}));

			mockFetch.mockResolvedValueOnce(okResponse(mockEvents));

			const result = await fetchRecoveryEvents("recovery-123");

			expect(result.success).toBe(true);
			expect(result.data).toHaveLength(mockEvents.length);
		});

		it("should return error for invalid recovery ID", async () => {
			const result = await fetchRecoveryEvents("");

			expect(result.success).toBe(false);
			expect(result.error).toBeDefined();
		});

		it("should handle HTTP errors", async () => {
			mockFetch.mockResolvedValueOnce({
				ok: false,
				status: 500,
				json: async () => ({ message: "Server error" }),
			} as Response);

			const result = await fetchRecoveryEvents("recovery-123");

			expect(result.success).toBe(false);
			expect(result.error).toBeDefined();
		});

		it("should validate events array", async () => {
			mockFetch.mockResolvedValueOnce(okResponse({ invalid: "data" }));

			const result = await fetchRecoveryEvents("recovery-123");

			expect(result.success).toBe(false);
			expect(result.error).toContain("Invalid");
		});

		it("should parse event timestamps", async () => {
			const mockEvents = [
				{
					id: "event-1",
					type: "initiated",
					status: "completed",
					title: "Test",
					description: "Test",
					timestamp: "2025-01-20T10:00:00Z",
				},
			];

			mockFetch.mockResolvedValueOnce(okResponse(mockEvents));

			const result = await fetchRecoveryEvents("recovery-123");

			expect(result.success).toBe(true);
			expect(result.data?.[0].timestamp).toBeInstanceOf(Date);
		});
	});

	describe("pollRecoveryStatus", () => {
		it("should poll recovery status at intervals", async () => {
			// Use in_progress so polling continues past the first callback
			const mockResponse = {
				...mockRecoveryTimelineInProgress,
				startedAt: mockRecoveryTimelineInProgress.startedAt.toISOString(),
				events: mockRecoveryTimelineInProgress.events.map((e) => ({
					...e,
					timestamp: e.timestamp.toISOString(),
				})),
			};

			mockFetch.mockResolvedValue(okResponse(mockResponse));

			const onUpdate = vi.fn();
			const stop = pollRecoveryStatus("wallet-123", 1000, 5000, onUpdate);

			// Flush microtasks so the async poll() completes
			await vi.advanceTimersByTimeAsync(0);

			// Initial call
			expect(onUpdate).toHaveBeenCalledTimes(1);

			// Advance to the next interval — the setTimeout(poll, 1000) fires
			await vi.advanceTimersByTimeAsync(1000);
			expect(onUpdate).toHaveBeenCalledTimes(2);

			// Stop polling
			stop();
			await vi.advanceTimersByTimeAsync(1000);
			expect(onUpdate).toHaveBeenCalledTimes(2); // No additional calls
		});

		it("should stop polling when recovery is completed", async () => {
			const completedResponse = {
				...mockRecoveryTimelineCompleted,
				status: "completed",
				startedAt: mockRecoveryTimelineCompleted.startedAt.toISOString(),
				events: mockRecoveryTimelineCompleted.events.map((e) => ({
					...e,
					timestamp: e.timestamp.toISOString(),
				})),
			};

			mockFetch.mockResolvedValue(okResponse(completedResponse));

			const onUpdate = vi.fn();
			pollRecoveryStatus("wallet-123", 1000, 5000, onUpdate);

			await vi.advanceTimersByTimeAsync(0);

			expect(onUpdate).toHaveBeenCalledTimes(1);

			await vi.advanceTimersByTimeAsync(1000);
			// Should not poll again since status is completed
			expect(onUpdate).toHaveBeenCalledTimes(1);
		});

		it("should stop polling when recovery fails", async () => {
			const failedResponse = {
				...mockRecoveryTimelineCompleted,
				status: "failed",
				startedAt: mockRecoveryTimelineCompleted.startedAt.toISOString(),
				events: mockRecoveryTimelineCompleted.events.map((e) => ({
					...e,
					timestamp: e.timestamp.toISOString(),
				})),
			};

			mockFetch.mockResolvedValue(okResponse(failedResponse));

			const onUpdate = vi.fn();
			pollRecoveryStatus("wallet-123", 1000, 5000, onUpdate);

			await vi.advanceTimersByTimeAsync(0);

			expect(onUpdate).toHaveBeenCalledTimes(1);

			await vi.advanceTimersByTimeAsync(1000);
			// Should not poll again since status is failed
			expect(onUpdate).toHaveBeenCalledTimes(1);
		});

		it("should respect max polling duration", async () => {
			const inProgressResponse = {
				...mockRecoveryTimelineCompleted,
				status: "in_progress",
				startedAt: mockRecoveryTimelineCompleted.startedAt.toISOString(),
				events: mockRecoveryTimelineCompleted.events.map((e) => ({
					...e,
					timestamp: e.timestamp.toISOString(),
				})),
			};

			mockFetch.mockResolvedValue(okResponse(inProgressResponse));

			const onUpdate = vi.fn();
			pollRecoveryStatus("wallet-123", 1000, 3000, onUpdate);

			await vi.advanceTimersByTimeAsync(0);

			// Initial call
			expect(onUpdate).toHaveBeenCalledTimes(1);

			// Advance to 1 second
			await vi.advanceTimersByTimeAsync(1000);
			expect(onUpdate).toHaveBeenCalledTimes(2);

			// Advance to 2 seconds
			await vi.advanceTimersByTimeAsync(1000);
			expect(onUpdate).toHaveBeenCalledTimes(3);

			// Advance to 3 seconds (max duration reached)
			await vi.advanceTimersByTimeAsync(1000);
			expect(onUpdate).toHaveBeenCalledTimes(3); // No additional calls
		});

		// Use 404 (non-retryable) so fetchRecoveryStatus returns immediately
		// without hitting the retry-delay setTimeout that hangs under fake timers.
		it("should handle polling errors", async () => {
			mockFetch.mockResolvedValue({
				ok: false,
				status: 404,
				json: async () => ({ message: "Not found" }),
			} as Response);

			const onUpdate = vi.fn();
			pollRecoveryStatus("wallet-123", 1000, 5000, onUpdate);

			await vi.advanceTimersByTimeAsync(0);

			expect(onUpdate).toHaveBeenCalledTimes(1);
			expect(onUpdate).toHaveBeenCalledWith(
				expect.objectContaining({
					success: false,
				}),
			);
		});
	});

	describe("Error handling", () => {
		it("should handle fetch errors gracefully", async () => {
			mockFetch.mockRejectedValue(new Error("Network error"));

			const result = await fetchRecoveryStatus("wallet-123", {
				retryAttempts: 1,
			});

			expect(result.success).toBe(false);
			expect(result.error).toBeDefined();
		});

		it("should handle malformed JSON responses", async () => {
			mockFetch.mockResolvedValueOnce({
				ok: true,
				json: async () => {
					throw new Error("Invalid JSON");
				},
			} as Response);

			// retryAttempts: 1 so the retry-delay setTimeout never fires under fake timers
			const result = await fetchRecoveryStatus("wallet-123", {
				retryAttempts: 1,
			});

			expect(result.success).toBe(false);
		});

		it("should handle missing required fields", async () => {
			mockFetch.mockResolvedValueOnce(
				okResponse({
					id: "recovery-123",
					// Missing required fields
				}),
			);

			const result = await fetchRecoveryStatus("wallet-123");

			expect(result.success).toBe(false);
			expect(result.error).toContain("Invalid");
		});
	});

	describe("Configuration", () => {
		it("should use custom base URL", async () => {
			mockFetch.mockResolvedValueOnce(
				okResponse({
					...mockRecoveryTimelineCompleted,
					startedAt: mockRecoveryTimelineCompleted.startedAt.toISOString(),
					events: mockRecoveryTimelineCompleted.events.map((e) => ({
						...e,
						timestamp: e.timestamp.toISOString(),
					})),
				}),
			);

			await fetchRecoveryStatus("wallet-123", {
				baseUrl: "https://api.example.com",
			});

			expect(mockFetch).toHaveBeenCalledWith(
				expect.stringContaining("https://api.example.com"),
				expect.any(Object),
			);
		});

		it("should use custom timeout", async () => {
			mockFetch.mockImplementationOnce(
				() =>
					new Promise((resolve) => {
						setTimeout(
							() =>
								resolve(
									okResponse({
										...mockRecoveryTimelineCompleted,
										startedAt:
											mockRecoveryTimelineCompleted.startedAt.toISOString(),
										events: mockRecoveryTimelineCompleted.events.map((e) => ({
											...e,
											timestamp: e.timestamp.toISOString(),
										})),
									}),
								),
							100,
						);
					}),
			);

			// Advance fake timers so the mock's setTimeout(100) fires
			const resultPromise = fetchRecoveryStatus("wallet-123", {
				timeout: 200,
			});
			await vi.advanceTimersByTimeAsync(150);
			const result = await resultPromise;

			expect(result.success).toBe(true);
		});
		it("should use custom retry attempts", async () => {
			mockFetch
				.mockRejectedValueOnce(new Error("Error 1"))
				.mockRejectedValueOnce(new Error("Error 2"))
				.mockResolvedValueOnce(
					okResponse({
						...mockRecoveryTimelineCompleted,
						startedAt: mockRecoveryTimelineCompleted.startedAt.toISOString(),
						events: mockRecoveryTimelineCompleted.events.map((e) => ({
							...e,
							timestamp: e.timestamp.toISOString(),
						})),
					}),
				);

			// Advance fake timers so retry-delay setTimeouts fire
			const resultPromise = fetchRecoveryStatus("wallet-123", {
				retryAttempts: 3,
				retryDelay: 100,
			});
			await vi.advanceTimersByTimeAsync(500);
			const result = await resultPromise;

			expect(result.success).toBe(true);
			expect(mockFetch).toHaveBeenCalledTimes(3);
		});
	});
});
