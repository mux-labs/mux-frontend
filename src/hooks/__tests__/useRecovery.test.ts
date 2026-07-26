import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import * as recoveryApi from "@/services/recoveryApi";
import { useRecovery } from "../useRecovery";

// ─── Mock the API layer so tests never hit real network ───────────────────────
vi.mock("@/services/recoveryApi");

const mockFetchRecoveryStatus = vi.mocked(recoveryApi.fetchRecoveryStatus);
const mockPollRecoveryStatus = vi.mocked(recoveryApi.pollRecoveryStatus);

const mockTimeline = {
	id: "recovery-1",
	walletId: "wallet-123",
	startedAt: new Date("2024-01-01T00:00:00Z"),
	status: "completed" as const,
	events: [],
};

function stubSuccess() {
	mockFetchRecoveryStatus.mockResolvedValue({
		success: true,
		data: mockTimeline,
		timestamp: Date.now(),
	});
	mockPollRecoveryStatus.mockReturnValue(vi.fn());
}

function stubError(message = "API error") {
	mockFetchRecoveryStatus.mockResolvedValue({
		success: false,
		error: message,
		timestamp: Date.now(),
	});
}

/** Wait for the bootstrap loading → idle transition to complete. */
async function waitForIdle(result: {
	current: ReturnType<typeof useRecovery>;
}) {
	await waitFor(() => expect(result.current.state).toBe("idle"), {
		timeout: 3000,
	});
}

// ─── Stub / demo mode (walletId = null) ───────────────────────────────────────
describe("useRecovery — stub mode (no walletId)", () => {
	it("starts in loading state", () => {
		const { result } = renderHook(() => useRecovery());
		expect(result.current.state).toBe("loading");
		expect(result.current.errorMessage).toBeNull();
	});

	it("transitions loading → idle after bootstrap", async () => {
		const { result } = renderHook(() => useRecovery());
		await waitForIdle(result);
		expect(result.current.state).toBe("idle");
	});

	it("does not initiate recovery while loading", () => {
		const { result } = renderHook(() => useRecovery());
		act(() => {
			result.current.initiateRecovery();
		});
		expect(result.current.state).toBe("loading");
	});

	it("transitions idle → confirming on initiateRecovery (#457)", async () => {
		const { result } = renderHook(() => useRecovery());
		await waitForIdle(result);
		act(() => {
			result.current.initiateRecovery();
		});
		expect(result.current.state).toBe("confirming");
	});

	it("transitions confirming → idle on cancelRecovery (#457)", async () => {
		const { result } = renderHook(() => useRecovery());
		await waitForIdle(result);
		act(() => {
			result.current.initiateRecovery();
		});
		act(() => {
			result.current.cancelRecovery();
		});
		expect(result.current.state).toBe("idle");
	});

	it("transitions confirming → pending → success on confirmRecovery (#457)", async () => {
		const { result } = renderHook(() => useRecovery());
		await waitForIdle(result);
		act(() => {
			result.current.initiateRecovery();
		});
		expect(result.current.state).toBe("confirming");
		await act(async () => {
			await result.current.confirmRecovery();
		});
		expect(result.current.state).toBe("success");
	});

	it("does not transition from idle on cancelRecovery", async () => {
		const { result } = renderHook(() => useRecovery());
		await waitForIdle(result);
		act(() => {
			result.current.cancelRecovery();
		});
		expect(result.current.state).toBe("idle");
	});

	it("does not re-initiate when already confirming", async () => {
		const { result } = renderHook(() => useRecovery());
		await waitForIdle(result);
		act(() => {
			result.current.initiateRecovery();
		});
		act(() => {
			result.current.initiateRecovery();
		}); // no-op
		expect(result.current.state).toBe("confirming");
	});

	it("resets to idle from success on resetRecovery", async () => {
		const { result } = renderHook(() => useRecovery());
		await waitForIdle(result);
		act(() => {
			result.current.initiateRecovery();
		});
		await act(async () => {
			await result.current.confirmRecovery();
		});
		expect(result.current.state).toBe("success");
		act(() => {
			result.current.resetRecovery();
		});
		expect(result.current.state).toBe("idle");
	});

	it("allows re-initiation after cancelRecovery", async () => {
		const { result } = renderHook(() => useRecovery());
		await waitForIdle(result);
		act(() => {
			result.current.initiateRecovery();
		});
		act(() => {
			result.current.cancelRecovery();
		});
		act(() => {
			result.current.initiateRecovery();
		});
		expect(result.current.state).toBe("confirming");
	});
});

// ─── Real API mode (walletId provided) — #455, #457, #459 ─────────────────────
describe("useRecovery — real API mode (walletId provided) #455 #457 #459", () => {
	beforeEach(() => {
		// resetAllMocks clears both call history AND mock implementations so each
		// test can set up its own mocks without interference from previous tests.
		vi.resetAllMocks();
	});

	it("starts in loading state while API fetches (#459)", () => {
		stubSuccess();
		const { result } = renderHook(() => useRecovery("wallet-123"));
		expect(result.current.state).toBe("loading");
	});

	it("transitions to idle after successful API fetch (#455)", async () => {
		stubSuccess();
		const { result } = renderHook(() => useRecovery("wallet-123"));
		await waitFor(() => expect(result.current.state).toBe("idle"), {
			timeout: 3000,
		});
		expect(result.current.errorMessage).toBeNull();
	});

	it("transitions to error state when API fetch fails (#459)", async () => {
		stubError("Network failure");
		const { result } = renderHook(() => useRecovery("wallet-123"));
		await waitFor(() => expect(result.current.state).toBe("error"), {
			timeout: 3000,
		});
		expect(result.current.errorMessage).toContain("Network failure");
	});

	it("exposes errorMessage on bootstrap API failure (#459)", async () => {
		stubError("Timeout");
		const { result } = renderHook(() => useRecovery("wallet-123"));
		await waitFor(() => expect(result.current.state).toBe("error"), {
			timeout: 3000,
		});
		expect(result.current.errorMessage).toBeTruthy();
	});

	it("transitions idle → confirming on initiateRecovery (#457)", async () => {
		stubSuccess();
		const { result } = renderHook(() => useRecovery("wallet-123"));
		await waitFor(() => expect(result.current.state).toBe("idle"), {
			timeout: 3000,
		});
		act(() => {
			result.current.initiateRecovery();
		});
		expect(result.current.state).toBe("confirming");
	});

	it("confirm step stays in confirming until user confirms (#457)", async () => {
		stubSuccess();
		const { result } = renderHook(() => useRecovery("wallet-123"));
		await waitFor(() => expect(result.current.state).toBe("idle"), {
			timeout: 3000,
		});
		act(() => {
			result.current.initiateRecovery();
		});
		// Must not auto-advance — explicit confirmation required
		expect(result.current.state).toBe("confirming");
	});

	it("goes pending then success after confirmRecovery (#457)", async () => {
		stubSuccess();
		const { result } = renderHook(() => useRecovery("wallet-123"));
		await waitFor(() => expect(result.current.state).toBe("idle"), {
			timeout: 3000,
		});
		act(() => {
			result.current.initiateRecovery();
		});
		await act(async () => {
			await result.current.confirmRecovery();
		});
		expect(result.current.state).toBe("success");
	});

	it("cancel restores idle from confirming state (#457)", async () => {
		stubSuccess();
		const { result } = renderHook(() => useRecovery("wallet-123"));
		await waitFor(() => expect(result.current.state).toBe("idle"), {
			timeout: 3000,
		});
		act(() => {
			result.current.initiateRecovery();
		});
		act(() => {
			result.current.cancelRecovery();
		});
		expect(result.current.state).toBe("idle");
	});

	it("resetRecovery retries the API fetch after a bootstrap error (#459)", async () => {
		// First call fails, second succeeds
		mockFetchRecoveryStatus
			.mockResolvedValueOnce({
				success: false,
				error: "down",
				timestamp: Date.now(),
			})
			.mockResolvedValue({
				success: true,
				data: mockTimeline,
				timestamp: Date.now(),
			});
		mockPollRecoveryStatus.mockReturnValue(vi.fn());

		const { result } = renderHook(() => useRecovery("wallet-123"));
		await waitFor(() => expect(result.current.state).toBe("error"), {
			timeout: 3000,
		});

		act(() => {
			result.current.resetRecovery();
		});

		await waitFor(() => expect(result.current.state).toBe("idle"), {
			timeout: 3000,
		});
	});
});
