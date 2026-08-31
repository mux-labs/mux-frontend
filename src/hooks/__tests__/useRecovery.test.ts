import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import * as recoveryApi from "@/services/recoveryApi";
import { useRecovery } from "../useRecovery";

// ─── Mock the API layer so tests never hit real network ───────────────────────
vi.mock("@/services/recoveryApi");

const mockFetchRecoveryStatus = vi.mocked(recoveryApi.fetchRecoveryStatus);
const mockPollRecoveryStatus = vi.mocked(recoveryApi.pollRecoveryStatus);
const mockInitiateRecovery = vi.mocked(recoveryApi.initiateRecovery);

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
	mockInitiateRecovery.mockResolvedValue({
		success: true,
		data: { recoveryId: "recovery-1" },
		timestamp: Date.now(),
	});
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

// ─── No walletId (#620) ───────────────────────────────────────────────────────
// With no wallet selected there is nothing to fetch a per-wallet status for, so
// the hook must NOT run a simulated `setTimeout` bootstrap — it mirrors the
// caller's real wallet-list fetch via `walletsLoading` instead.
describe("useRecovery — no walletId (#620)", () => {
	it("resolves straight to idle when the wallet list is not loading — no fake delay", () => {
		const { result } = renderHook(() => useRecovery(null));
		expect(result.current.state).toBe("idle");
		expect(result.current.errorMessage).toBeNull();
	});

	it("stays in loading while the upstream wallet list is still loading", () => {
		const { result } = renderHook(() =>
			useRecovery(null, { walletsLoading: true }),
		);
		expect(result.current.state).toBe("loading");
		expect(result.current.errorMessage).toBeNull();
	});

	it("transitions loading → idle when the wallet list settles", () => {
		const { result, rerender } = renderHook(
			({ loading }: { loading: boolean }) =>
				useRecovery(null, { walletsLoading: loading }),
			{ initialProps: { loading: true } },
		);
		expect(result.current.state).toBe("loading");
		rerender({ loading: false });
		expect(result.current.state).toBe("idle");
	});

	it("never schedules the old 1200ms simulated bootstrap timer", () => {
		const setTimeoutSpy = vi.spyOn(globalThis, "setTimeout");
		try {
			renderHook(() => useRecovery(null));
			const scheduledDelays = setTimeoutSpy.mock.calls.map((call) => call[1]);
			expect(scheduledDelays).not.toContain(1200);
		} finally {
			setTimeoutSpy.mockRestore();
		}
	});

	it("does not initiate recovery while loading", () => {
		const { result } = renderHook(() =>
			useRecovery(null, { walletsLoading: true }),
		);
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

// ─── Production, no wallet selected (#620) ────────────────────────────────────
// The `walletId === null` path must NOT fall back to a simulated setTimeout
// delay in production — that was a demo stub masquerading as a status fetch.
describe("useRecovery — production, no walletId (#620)", () => {
	beforeEach(() => {
		vi.stubEnv("NODE_ENV", "production");
	});

	afterEach(() => {
		vi.unstubAllEnvs();
	});

	it("resolves to idle without a simulated delay", async () => {
		const { result } = renderHook(() => useRecovery(null));
		// No fake 1200ms bootstrap — should settle almost immediately.
		await waitFor(() => expect(result.current.state).toBe("idle"), {
			timeout: 200,
		});
	});

	it("does not fake a recovery success when confirming with no wallet", async () => {
		const { result } = renderHook(() => useRecovery(null));
		await waitFor(() => expect(result.current.state).toBe("idle"), {
			timeout: 200,
		});

		act(() => {
			result.current.initiateRecovery();
		});
		await act(async () => {
			await result.current.confirmRecovery();
		});

		expect(result.current.state).toBe("error");
		expect(result.current.errorMessage).toMatch(/select a wallet/i);
	});
});
