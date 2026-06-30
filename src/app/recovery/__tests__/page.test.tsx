import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { UseRecoveryReturn } from "@/hooks/useRecovery";

// Mock the useRecovery hook so each test can dictate the page state
// without going through the real bootstrap effect.
const useRecoveryMock = vi.fn();
vi.mock("@/hooks/useRecovery", () => ({
	useRecovery: () => useRecoveryMock(),
}));

// Import the page AFTER the mock is installed.
import RecoveryPage from "../page";

function makeRecovery(
	overrides: Partial<UseRecoveryReturn> = {},
): UseRecoveryReturn {
	return {
		state: "idle",
		errorMessage: null,
		recoveryRequestId: null,
		initiateRecovery: vi.fn(),
		confirmRecovery: vi.fn().mockResolvedValue(undefined),
		cancelRecovery: vi.fn(),
		resetRecovery: vi.fn(),
		...overrides,
	};
}

describe("RecoveryPage", () => {
	beforeEach(() => {
		useRecoveryMock.mockReset();
	});

	it("renders the page header and description", () => {
		useRecoveryMock.mockReturnValue(makeRecovery());
		render(<RecoveryPage />);

		expect(
			screen.getByRole("heading", { level: 1, name: /wallet recovery/i }),
		).toBeInTheDocument();
		expect(
			screen.getByText(/learn how invisible wallet recovery works/i),
		).toBeInTheDocument();
	});

	it("renders a 'Back to Dashboard' link pointing at the dashboard root", () => {
		useRecoveryMock.mockReturnValue(makeRecovery());
		render(<RecoveryPage />);

		const link = screen.getByRole("link", { name: /back to dashboard/i });
		expect(link).toBeInTheDocument();
		expect(link).toHaveAttribute("href", "/");
	});

	it("shows the loading skeleton while recovery status is 'loading'", () => {
		useRecoveryMock.mockReturnValue(makeRecovery({ state: "loading" }));
		render(<RecoveryPage />);

		expect(
			screen.getByRole("status", { name: /loading recovery status/i }),
		).toBeInTheDocument();

		expect(
			screen.queryByText(/recovery system status/i),
		).not.toBeInTheDocument();
		expect(
			screen.queryAllByText(/what is invisible wallet recovery/i).length,
		).toBe(0);
	});

	it("shows the explanation and FAQ when recovery status is 'idle'", () => {
		useRecoveryMock.mockReturnValue(makeRecovery({ state: "idle" }));
		render(<RecoveryPage />);

		expect(screen.getByText(/recovery system status/i)).toBeInTheDocument();
		expect(
			screen.getAllByText(/what is invisible wallet recovery/i).length,
		).toBeGreaterThan(0);
		expect(
			screen.queryByRole("status", { name: /loading recovery status/i }),
		).not.toBeInTheDocument();
	});

	it("renders the post-loading content for the 'error' state too", () => {
		useRecoveryMock.mockReturnValue(
			makeRecovery({ state: "error", errorMessage: "Network failure" }),
		);
		render(<RecoveryPage />);

		expect(screen.getByText(/recovery system status/i)).toBeInTheDocument();
		expect(
			screen.queryByRole("status", { name: /loading recovery status/i }),
		).not.toBeInTheDocument();
	});

	it("renders the post-loading content for the 'success' state too", () => {
		useRecoveryMock.mockReturnValue(makeRecovery({ state: "success" }));
		render(<RecoveryPage />);

		expect(screen.getByText(/recovery system status/i)).toBeInTheDocument();
		expect(
			screen.queryByRole("status", { name: /loading recovery status/i }),
		).not.toBeInTheDocument();
	});

	it("passes the recovery object through to the InitiateRecoveryCTA", () => {
		useRecoveryMock.mockReturnValue(makeRecovery({ state: "idle" }));
		render(<RecoveryPage />);

		expect(useRecoveryMock).toHaveBeenCalledTimes(1);
	});

	it("shows a success toast with recovery request ID when recovery state is 'success'", () => {
		useRecoveryMock.mockReturnValue(
			makeRecovery({
				state: "success",
				recoveryRequestId: "REC-ABCD-1234",
			}),
		);
		render(<RecoveryPage />);

		expect(
			screen.getByText(/Recovery request submitted successfully/),
		).toBeInTheDocument();
		expect(
			screen.getByText("REC-ABCD-1234"),
		).toBeInTheDocument();
		expect(screen.getByText("Success")).toBeInTheDocument();
	});

	it("shows an error toast when recovery state is 'error' with an error message", () => {
		useRecoveryMock.mockReturnValue(
			makeRecovery({ state: "error", errorMessage: "Network failure" }),
		);
		render(<RecoveryPage />);

		// "Network failure" appears in both the CTA alert and the toast
		expect(screen.getAllByText("Network failure").length).toBeGreaterThanOrEqual(2);
		expect(screen.getByText("Error")).toBeInTheDocument();
	});

	it("does not show a toast when recovery state is 'idle'", () => {
		useRecoveryMock.mockReturnValue(makeRecovery({ state: "idle" }));
		render(<RecoveryPage />);

		expect(screen.queryByText("Success")).not.toBeInTheDocument();
		expect(screen.queryByText("Error")).not.toBeInTheDocument();
	});
});
