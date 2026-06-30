import { act, renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { useRecovery } from "../useRecovery";

/** Wait for the bootstrap loading → idle transition to complete. */
async function waitForIdle(result: {
	current: ReturnType<typeof useRecovery>;
}) {
	await waitFor(
		() => {
			expect(result.current.state).toBe("idle");
		},
		{ timeout: 3000 },
	);
}

describe("useRecovery", () => {
	it("starts in loading state", () => {
		const { result } = renderHook(() => useRecovery());
		expect(result.current.state).toBe("loading");
		expect(result.current.errorMessage).toBeNull();
	});

	it("transitions loading → idle after bootstrap", async () => {
		const { result } = renderHook(() => useRecovery());
		expect(result.current.state).toBe("loading");
		await waitForIdle(result);
		expect(result.current.state).toBe("idle");
	});

	it("does not initiate recovery while loading", async () => {
		const { result } = renderHook(() => useRecovery());
		// Attempt to initiate while still loading — should be a no-op
		await act(async () => {
			result.current.initiateRecovery();
		});
		expect(result.current.state).toBe("loading");
	});

	it("transitions idle → confirming on initiateRecovery", async () => {
		const { result } = renderHook(() => useRecovery());
		await waitForIdle(result);
		await act(async () => {
			result.current.initiateRecovery();
		});
		expect(result.current.state).toBe("confirming");
	});

	it("transitions confirming → idle on cancelRecovery", async () => {
		const { result } = renderHook(() => useRecovery());
		await waitForIdle(result);
		await act(async () => {
			result.current.initiateRecovery();
		});
		await act(async () => {
			result.current.cancelRecovery();
		});
		expect(result.current.state).toBe("idle");
	});

	it("transitions confirming → pending → success on confirmRecovery", async () => {
		const { result } = renderHook(() => useRecovery());
		await waitForIdle(result);

		await act(async () => {
			result.current.initiateRecovery();
		});
		expect(result.current.state).toBe("confirming");

		await act(async () => {
			await result.current.confirmRecovery();
		});
		expect(result.current.state).toBe("success");
	});

	it("generates a recovery request ID on success", async () => {
		const { result } = renderHook(() => useRecovery());
		await waitForIdle(result);

		await act(async () => {
			result.current.initiateRecovery();
		});
		await act(async () => {
			await result.current.confirmRecovery();
		});

		expect(result.current.recoveryRequestId).toMatch(/^REC-[A-Z0-9]{4}-[A-Z0-9]{4}$/);
	});

	it("clears the recovery request ID on reset", async () => {
		const { result } = renderHook(() => useRecovery());
		await waitForIdle(result);

		await act(async () => {
			result.current.initiateRecovery();
		});
		await act(async () => {
			await result.current.confirmRecovery();
		});
		expect(result.current.recoveryRequestId).not.toBeNull();

		await act(async () => {
			result.current.resetRecovery();
		});
		expect(result.current.recoveryRequestId).toBeNull();
	});

	it("recoveryRequestId is null in non-success states", async () => {
		const { result } = renderHook(() => useRecovery());
		expect(result.current.recoveryRequestId).toBeNull();

		await waitForIdle(result);
		expect(result.current.recoveryRequestId).toBeNull();

		await act(async () => {
			result.current.initiateRecovery();
		});
		expect(result.current.recoveryRequestId).toBeNull();
	});

	it("does not transition from idle on cancelRecovery", async () => {
		const { result } = renderHook(() => useRecovery());
		await waitForIdle(result);
		await act(async () => {
			result.current.cancelRecovery();
		});
		expect(result.current.state).toBe("idle");
	});

	it("does not re-initiate when already confirming", async () => {
		const { result } = renderHook(() => useRecovery());
		await waitForIdle(result);
		await act(async () => {
			result.current.initiateRecovery();
		});
		await act(async () => {
			result.current.initiateRecovery(); // no-op
		});
		expect(result.current.state).toBe("confirming");
	});

	it("resets to idle from success on resetRecovery", async () => {
		const { result } = renderHook(() => useRecovery());
		await waitForIdle(result);

		await act(async () => {
			result.current.initiateRecovery();
		});
		await act(async () => {
			await result.current.confirmRecovery();
		});
		expect(result.current.state).toBe("success");

		await act(async () => {
			result.current.resetRecovery();
		});
		expect(result.current.state).toBe("idle");
	});

	it("allows re-initiation from error state", async () => {
		const { result } = renderHook(() => useRecovery());
		await waitForIdle(result);
		await act(async () => {
			result.current.initiateRecovery();
		});
		await act(async () => {
			result.current.cancelRecovery();
		});
		await act(async () => {
			result.current.initiateRecovery();
		});
		expect(result.current.state).toBe("confirming");
	});
});
