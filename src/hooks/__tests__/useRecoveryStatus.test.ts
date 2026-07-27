import { act, renderHook, waitFor } from "@testing-library/react";
import { vi } from "vitest";
import {
	mockRecoveryTimelineCompleted,
	mockRecoveryTimelineInProgress,
} from "@/mock-data/recovery";
import * as recoveryApi from "@/services/recoveryApi";
import { useRecoveryStatus } from "../useRecoveryStatus";

// Mock the API service
vi.mock("@/services/recoveryApi");

describe("useRecoveryStatus", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.useFakeTimers();
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	describe("Initial state", () => {
		it("should initialize with idle state", () => {
			const { result } = renderHook(() => useRecoveryStatus(null));

			expect(result.current.loading).toBe("idle");
			expect(result.current.timeline).toBeNull();
			expect(result.current.error).toBeNull();
			expect(result.current.isIdle).toBe(true);
		});

		it("should initialize with loading state when autoFetch is true", async () => {
			(recoveryApi.fetchRecoveryStatus as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
				success: true,
				data: mockRecoveryTimelineCompleted,
				timestamp: Date.now(),
			});

			const { result } = renderHook(() =>
				useRecoveryStatus("wallet-123", { autoFetch: true }),
			);

			expect(result.current.isLoading).toBe(true);

			await waitFor(() => {
				expect(result.current.isSuccess).toBe(true);
			});
		});

		it("should not fetch when autoFetch is false", () => {
			const { result } = renderHook(() =>
				useRecoveryStatus("wallet-123", { autoFetch: false }),
			);

			expect(result.current.isIdle).toBe(true);
			expect(recoveryApi.fetchRecoveryStatus).not.toHaveBeenCalled();
		});
	});

	describe("Fetching recovery status", () => {
		it("should fetch recovery status successfully", async () => {
			(recoveryApi.fetchRecoveryStatus as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
				success: true,
				data: mockRecoveryTimelineCompleted,
				timestamp: Date.now(),
			});

			const { result } = renderHook(() =>
				useRecoveryStatus("wallet-123", { autoFetch: true }),
			);

			await waitFor(() => {
				expect(result.current.isSuccess).toBe(true);
			});

			expect(result.current.timeline).toEqual(mockRecoveryTimelineCompleted);
			expect(result.current.error).toBeNull();
		});

		it("should handle fetch errors", async () => {
			(recoveryApi.fetchRecoveryStatus as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
				success: false,
				error: "Failed to fetch",
				timestamp: Date.now(),
			});

			const { result } = renderHook(() =>
				useRecoveryStatus("wallet-123", { autoFetch: true }),
			);

			await waitFor(() => {
				expect(result.current.isError).toBe(true);
			});

			expect(result.current.error).toBe("Failed to fetch");
			expect(result.current.timeline).toBeNull();
		});

		it("should handle null wallet ID", async () => {
			const { result } = renderHook(() =>
				useRecoveryStatus(null, { autoFetch: true }),
			);

			await waitFor(() => {
				expect(result.current.isError).toBe(true);
			});

			expect(result.current.error).toBeDefined();
		});

		it("should refetch on demand", async () => {
			(recoveryApi.fetchRecoveryStatus as ReturnType<typeof vi.fn>).mockResolvedValue({
				success: true,
				data: mockRecoveryTimelineCompleted,
				timestamp: Date.now(),
			});

			const { result } = renderHook(() =>
				useRecoveryStatus("wallet-123", { autoFetch: false }),
			);

			act(() => {
				result.current.refetch();
			});

			await waitFor(() => {
				expect(result.current.isSuccess).toBe(true);
			});

			expect(recoveryApi.fetchRecoveryStatus).toHaveBeenCalled();
		});
	});

	describe("Polling", () => {
		it("should start polling for in-progress recovery", async () => {
			(recoveryApi.fetchRecoveryStatus as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
				success: true,
				data: mockRecoveryTimelineInProgress,
				timestamp: Date.now(),
			});

			(recoveryApi.pollRecoveryStatus as ReturnType<typeof vi.fn>).mockReturnValueOnce(
				vi.fn(),
			);

			const { result } = renderHook(() =>
				useRecoveryStatus("wallet-123", { autoFetch: true }),
			);

			await waitFor(() => {
				expect(result.current.isSuccess).toBe(true);
			});

			expect(recoveryApi.pollRecoveryStatus).toHaveBeenCalled();
		});

		it("should not poll for completed recovery", async () => {
			(recoveryApi.fetchRecoveryStatus as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
				success: true,
				data: mockRecoveryTimelineCompleted,
				timestamp: Date.now(),
			});

			const { result } = renderHook(() =>
				useRecoveryStatus("wallet-123", { autoFetch: true }),
			);

			await waitFor(() => {
				expect(result.current.isSuccess).toBe(true);
			});

			expect(recoveryApi.pollRecoveryStatus).not.toHaveBeenCalled();
		});

		it("should stop polling on demand", async () => {
			const mockStop = vi.fn();
			(recoveryApi.fetchRecoveryStatus as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
				success: true,
				data: mockRecoveryTimelineInProgress,
				timestamp: Date.now(),
			});

			(recoveryApi.pollRecoveryStatus as ReturnType<typeof vi.fn>).mockReturnValueOnce(
				mockStop,
			);

			const { result } = renderHook(() =>
				useRecoveryStatus("wallet-123", { autoFetch: true }),
			);

			await waitFor(() => {
				expect(result.current.isSuccess).toBe(true);
			});

			act(() => {
				result.current.stopPolling();
			});

			expect(mockStop).toHaveBeenCalled();
		});

		it("should use custom poll interval", async () => {
			(recoveryApi.fetchRecoveryStatus as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
				success: true,
				data: mockRecoveryTimelineInProgress,
				timestamp: Date.now(),
			});

			(recoveryApi.pollRecoveryStatus as ReturnType<typeof vi.fn>).mockReturnValueOnce(
				vi.fn(),
			);

			renderHook(() =>
				useRecoveryStatus("wallet-123", {
					autoFetch: true,
					pollInterval: 10000,
				}),
			);

			await waitFor(() => {
				expect(recoveryApi.pollRecoveryStatus).toHaveBeenCalledWith(
					"wallet-123",
					10000,
					expect.any(Number),
					expect.any(Function),
				);
			});
		});
	});

	describe("Callbacks", () => {
		it("should call onStatusChange when status updates", async () => {
			const onStatusChange = vi.fn();

			(recoveryApi.fetchRecoveryStatus as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
				success: true,
				data: mockRecoveryTimelineCompleted,
				timestamp: Date.now(),
			});

			renderHook(() =>
				useRecoveryStatus("wallet-123", {
					autoFetch: true,
					onStatusChange,
				}),
			);

			await waitFor(() => {
				expect(onStatusChange).toHaveBeenCalledWith(
					mockRecoveryTimelineCompleted,
				);
			});
		});

		it("should call onError when fetch fails", async () => {
			const onError = vi.fn();

			(recoveryApi.fetchRecoveryStatus as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
				success: false,
				error: "Fetch failed",
				timestamp: Date.now(),
			});

			renderHook(() =>
				useRecoveryStatus("wallet-123", {
					autoFetch: true,
					onError,
				}),
			);

			await waitFor(() => {
				expect(onError).toHaveBeenCalledWith("Fetch failed");
			});
		});
	});

	describe("Stale state detection", () => {
		it("should mark data as stale", async () => {
			(recoveryApi.fetchRecoveryStatus as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
				success: true,
				data: mockRecoveryTimelineCompleted,
				timestamp: Date.now(),
			});

			const { result } = renderHook(() =>
				useRecoveryStatus("wallet-123", { autoFetch: true }),
			);

			await waitFor(() => {
				expect(result.current.isSuccess).toBe(true);
			});

			expect(result.current.isStale).toBe(false);

			act(() => {
				result.current.markAsStale();
			});

			expect(result.current.isStale).toBe(true);
		});

		it("should detect stale data after timeout", async () => {
			(recoveryApi.fetchRecoveryStatus as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
				success: true,
				data: mockRecoveryTimelineCompleted,
				timestamp: Date.now(),
			});

			const { result } = renderHook(() =>
				useRecoveryStatus("wallet-123", { autoFetch: true }),
			);

			await waitFor(() => {
				expect(result.current.isSuccess).toBe(true);
			});

			// Advance time by 61 seconds (stale threshold is 60 seconds)
			vi.advanceTimersByTime(61000);

			await waitFor(() => {
				expect(result.current.isStale).toBe(true);
			});
		});
	});

	describe("Error handling", () => {
		it("should clear error state", async () => {
			(recoveryApi.fetchRecoveryStatus as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
				success: false,
				error: "Error occurred",
				timestamp: Date.now(),
			});

			const { result } = renderHook(() =>
				useRecoveryStatus("wallet-123", { autoFetch: true }),
			);

			await waitFor(() => {
				expect(result.current.isError).toBe(true);
			});

			act(() => {
				result.current.clearError();
			});

			expect(result.current.error).toBeNull();
		});

		it("should handle missing wallet ID", async () => {
			const { result } = renderHook(() =>
				useRecoveryStatus(null, { autoFetch: true }),
			);

			await waitFor(() => {
				expect(result.current.isError).toBe(true);
			});

			expect(result.current.error).toContain("wallet ID");
		});
	});

	describe("Loading states", () => {
		it("should have correct loading state flags", async () => {
			(recoveryApi.fetchRecoveryStatus as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
				success: true,
				data: mockRecoveryTimelineCompleted,
				timestamp: Date.now(),
			});

			const { result } = renderHook(() =>
				useRecoveryStatus("wallet-123", { autoFetch: true }),
			);

			expect(result.current.isLoading).toBe(true);
			expect(result.current.isSuccess).toBe(false);
			expect(result.current.isError).toBe(false);

			await waitFor(() => {
				expect(result.current.isSuccess).toBe(true);
			});

			expect(result.current.isLoading).toBe(false);
			expect(result.current.isSuccess).toBe(true);
			expect(result.current.isError).toBe(false);
		});
	});

	describe("Cleanup", () => {
		it("should stop polling on unmount", async () => {
			const mockStop = vi.fn();
			(recoveryApi.fetchRecoveryStatus as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
				success: true,
				data: mockRecoveryTimelineInProgress,
				timestamp: Date.now(),
			});

			(recoveryApi.pollRecoveryStatus as ReturnType<typeof vi.fn>).mockReturnValueOnce(
				mockStop,
			);

			const { unmount } = renderHook(() =>
				useRecoveryStatus("wallet-123", { autoFetch: true }),
			);

			await waitFor(() => {
				expect(recoveryApi.pollRecoveryStatus).toHaveBeenCalled();
			});

			unmount();

			expect(mockStop).toHaveBeenCalled();
		});

		it("should handle wallet ID changes", async () => {
			(recoveryApi.fetchRecoveryStatus as ReturnType<typeof vi.fn>).mockResolvedValue({
				success: true,
				data: mockRecoveryTimelineCompleted,
				timestamp: Date.now(),
			});

			const { rerender } = renderHook(
				({ walletId }) => useRecoveryStatus(walletId, { autoFetch: true }),
				{ initialProps: { walletId: "wallet-123" } },
			);

			await waitFor(() => {
				expect(recoveryApi.fetchRecoveryStatus).toHaveBeenCalledWith(
					"wallet-123",
				);
			});

			rerender({ walletId: "wallet-456" });

			await waitFor(() => {
				expect(recoveryApi.fetchRecoveryStatus).toHaveBeenCalledWith(
					"wallet-456",
				);
			});
		});
	});

	describe("Edge cases", () => {
		it("should handle rapid refetch calls", async () => {
			(recoveryApi.fetchRecoveryStatus as ReturnType<typeof vi.fn>).mockResolvedValue({
				success: true,
				data: mockRecoveryTimelineCompleted,
				timestamp: Date.now(),
			});

			const { result } = renderHook(() =>
				useRecoveryStatus("wallet-123", { autoFetch: false }),
			);

			act(() => {
				result.current.refetch();
				result.current.refetch();
				result.current.refetch();
			});

			await waitFor(() => {
				expect(result.current.isSuccess).toBe(true);
			});
		});

		it("should handle polling with errors", async () => {
			const mockStop = vi.fn();
			(recoveryApi.fetchRecoveryStatus as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
				success: true,
				data: mockRecoveryTimelineInProgress,
				timestamp: Date.now(),
			});

			(recoveryApi.pollRecoveryStatus as ReturnType<typeof vi.fn>).mockImplementationOnce(
				(walletId, interval, maxDuration, onUpdate) => {
					onUpdate({
						success: false,
						error: "Polling error",
						timestamp: Date.now(),
					});
					return mockStop;
				},
			);

			const { result } = renderHook(() =>
				useRecoveryStatus("wallet-123", { autoFetch: true }),
			);

			await waitFor(() => {
				expect(result.current.isError).toBe(true);
			});

			expect(result.current.error).toBe("Polling error");
		});
	});
});
