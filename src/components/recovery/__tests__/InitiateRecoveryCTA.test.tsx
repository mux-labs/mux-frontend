import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { UseRecoveryReturn } from "@/hooks/useRecovery";
import { InitiateRecoveryCTA } from "../InitiateRecoveryCTA";

function makeRecovery(
	overrides: Partial<UseRecoveryReturn> = {},
): UseRecoveryReturn {
	return {
		state: "idle",
		errorMessage: null,
		recoveryRequestId: null,
		initiateRecovery: vi.fn(),
		confirmRecovery: vi.fn(),
		cancelRecovery: vi.fn(),
		resetRecovery: vi.fn(),
		...overrides,
	};
}

describe("InitiateRecoveryCTA", () => {
	it("renders the initiate button in idle state", () => {
		render(<InitiateRecoveryCTA recovery={makeRecovery()} />);
		expect(
			screen.getByRole("button", { name: /initiate recovery/i }),
		).toBeInTheDocument();
	});

	it("calls initiateRecovery when button is clicked", async () => {
		const initiateRecovery = vi.fn();
		render(
			<InitiateRecoveryCTA recovery={makeRecovery({ initiateRecovery })} />,
		);
		await userEvent.click(
			screen.getByRole("button", { name: /initiate recovery/i }),
		);
		expect(initiateRecovery).toHaveBeenCalledOnce();
	});

	it("shows confirmation UI in confirming state", () => {
		render(
			<InitiateRecoveryCTA recovery={makeRecovery({ state: "confirming" })} />,
		);
		expect(
			screen.getByText(/confirm recovery initiation/i),
		).toBeInTheDocument();
		expect(
			screen.getByRole("button", { name: /yes, initiate recovery/i }),
		).toBeInTheDocument();
		expect(screen.getByRole("button", { name: /cancel/i })).toBeInTheDocument();
	});

	it("calls confirmRecovery on confirm button click", async () => {
		const confirmRecovery = vi.fn();
		render(
			<InitiateRecoveryCTA
				recovery={makeRecovery({ state: "confirming", confirmRecovery })}
			/>,
		);
		await userEvent.click(
			screen.getByRole("button", { name: /yes, initiate recovery/i }),
		);
		expect(confirmRecovery).toHaveBeenCalledOnce();
	});

	it("calls cancelRecovery on cancel button click", async () => {
		const cancelRecovery = vi.fn();
		render(
			<InitiateRecoveryCTA
				recovery={makeRecovery({ state: "confirming", cancelRecovery })}
			/>,
		);
		await userEvent.click(screen.getByRole("button", { name: /cancel/i }));
		expect(cancelRecovery).toHaveBeenCalledOnce();
	});

	it("shows spinner in pending state", () => {
		render(
			<InitiateRecoveryCTA recovery={makeRecovery({ state: "pending" })} />,
		);
		expect(
			screen.getByText(/submitting recovery request/i),
		).toBeInTheDocument();
		expect(screen.queryByRole("button")).not.toBeInTheDocument();
	});

	it("shows success message and recovery request ID in success state", () => {
		render(
			<InitiateRecoveryCTA
				recovery={makeRecovery({
					state: "success",
					recoveryRequestId: "REC-ABCD-1234",
				})}
			/>,
		);
		expect(screen.getByText(/recovery initiated/i)).toBeInTheDocument();
		expect(screen.getByTestId("recovery-request-id")).toHaveTextContent(
			"REC-ABCD-1234",
		);
		expect(
			screen.getByRole("button", { name: /dismiss/i }),
		).toBeInTheDocument();
		expect(
			screen.getByRole("button", { name: /copy recovery request id/i }),
		).toBeInTheDocument();
	});

	it("does not show recovery request ID when it is null", () => {
		render(
			<InitiateRecoveryCTA recovery={makeRecovery({ state: "success" })} />,
		);
		expect(
			screen.queryByTestId("recovery-request-id"),
		).not.toBeInTheDocument();
	});

	it("copies recovery request ID when copy button is clicked", async () => {
		const writeText = vi.fn().mockResolvedValue(undefined);
		Object.defineProperty(navigator, "clipboard", {
			value: { writeText },
			writable: true,
			configurable: true,
		});

		render(
			<InitiateRecoveryCTA
				recovery={makeRecovery({
					state: "success",
					recoveryRequestId: "REC-ABCD-1234",
				})}
			/>,
		);

		await userEvent.click(
			screen.getByRole("button", { name: /copy recovery request id/i }),
		);

		expect(writeText).toHaveBeenCalledWith("REC-ABCD-1234");
	});

	it("calls resetRecovery on dismiss in success state", async () => {
		const resetRecovery = vi.fn();
		render(
			<InitiateRecoveryCTA
				recovery={makeRecovery({ state: "success", resetRecovery })}
			/>,
		);
		await userEvent.click(screen.getByRole("button", { name: /dismiss/i }));
		expect(resetRecovery).toHaveBeenCalledOnce();
	});

	it("shows error message in error state", () => {
		render(
			<InitiateRecoveryCTA
				recovery={makeRecovery({
					state: "error",
					errorMessage: "Network failure",
				})}
			/>,
		);
		expect(screen.getByRole("alert")).toHaveTextContent("Network failure");
		// CTA button still visible so user can retry
		expect(
			screen.getByRole("button", { name: /initiate recovery/i }),
		).toBeInTheDocument();
	});

	it("has accessible live region for status updates", () => {
		render(
			<InitiateRecoveryCTA recovery={makeRecovery({ state: "pending" })} />,
		);
		expect(screen.getByRole("status")).toBeInTheDocument();
	});
});
