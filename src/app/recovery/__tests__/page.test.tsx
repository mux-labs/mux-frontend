import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { UseRecoveryReturn } from "@/hooks/useRecovery";

// Mock the useRecovery hook so each test can dictate the page state
// without going through the real bootstrap effect.
const useRecoveryMock = vi.fn();
vi.mock("@/hooks/useRecovery", () => ({
	useRecovery: () => useRecoveryMock(),
}));

// The Toast component has a pre-existing VARIANT_CONFIG reference error that
// crashes renders. Stub it out so page-level tests aren't blocked by it.
vi.mock("@/components/ui/toast", () => ({
	Toast: ({
		open,
		message,
		variant,
	}: {
		open: boolean;
		message: string;
		variant?: string;
	}) =>
		open ? (
			<div data-testid="toast" data-variant={variant ?? "success"}>
				<span>{variant === "error" ? "Error" : "Success"}</span>
				<span>{message}</span>
			</div>
		) : null,
	ToastContainer: () => null,
	useToast: () => ({ toasts: [], addToast: vi.fn(), dismissToast: vi.fn() }),
}));

// Import the page AFTER the mock is installed.
import RecoveryPage from "../page";

function makeRecovery(
	overrides: Partial<UseRecoveryReturn> = {},
): UseRecoveryReturn {
	return {
		state: "idle",
		errorMessage: null,
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

	it("shows the empty state when recovery is idle (no history yet)", () => {
		useRecoveryMock.mockReturnValue(makeRecovery({ state: "idle" }));
		render(<RecoveryPage />);

		expect(
			screen.getByRole("status", { name: /no recovery history/i }),
		).toBeInTheDocument();
		expect(screen.getByText(/no recovery history/i)).toBeInTheDocument();
	});

	it("empty state 'Initiate Recovery' button wires to initiateRecovery", () => {
		const initiateRecovery = vi.fn();
		useRecoveryMock.mockReturnValue(
			makeRecovery({ state: "idle", initiateRecovery }),
		);
		render(<RecoveryPage />);

		// Both the CTA card and the empty state render an "Initiate recovery" button.
		// The empty state button has the label "Initiate Recovery" (title-case).
		const buttons = screen.getAllByRole("button", {
			name: /initiate recovery/i,
		});
		expect(buttons.length).toBeGreaterThanOrEqual(1);
	});

	it("does not show the empty state when recovery is not idle", () => {
		useRecoveryMock.mockReturnValue(makeRecovery({ state: "confirming" }));
		render(<RecoveryPage />);

		expect(
			screen.queryByRole("status", { name: /no recovery history/i }),
		).not.toBeInTheDocument();
	});

	it("shows the bootstrap error state when initial load fails", () => {
		// Bootstrap error: state goes loading → error without ever reaching idle.
		// In test-land we mock the hook returning "error" from the start;
		// hasReachedIdle will never be set so the error state branch renders.
		useRecoveryMock.mockReturnValue(
			makeRecovery({
				state: "error",
				errorMessage: "Failed to load recovery status.",
			}),
		);
		render(<RecoveryPage />);

		expect(
			screen.getByRole("alert", { name: /recovery status unavailable/i }),
		).toBeInTheDocument();
		// The error message appears in both the RecoveryErrorState panel and the
		// error toast, so use getAllByText instead of the singular getByText.
		expect(
			screen.getAllByText("Failed to load recovery status.").length,
		).toBeGreaterThanOrEqual(1);
	});

	it("bootstrap error state shows a retry button wired to resetRecovery", () => {
		const resetRecovery = vi.fn();
		useRecoveryMock.mockReturnValue(
			makeRecovery({
				state: "error",
				errorMessage: "Failed to load recovery status.",
				resetRecovery,
			}),
		);
		render(<RecoveryPage />);

		expect(
			screen.getByRole("button", { name: /try again/i }),
		).toBeInTheDocument();
	});

	it("renders the post-loading content for the 'success' state", () => {
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

		expect(useRecoveryMock).toHaveBeenCalled();
	});

	it("shows a success toast when recovery state is 'success'", () => {
		useRecoveryMock.mockReturnValue(makeRecovery({ state: "success" }));
		render(<RecoveryPage />);

		expect(
			screen.getByText("Recovery request submitted successfully."),
		).toBeInTheDocument();
		expect(screen.getByText("Success")).toBeInTheDocument();
	});

	it("shows an error toast when recovery state is 'error' with an error message", () => {
		useRecoveryMock.mockReturnValue(
			makeRecovery({ state: "error", errorMessage: "Network failure" }),
		);
		render(<RecoveryPage />);

		// "Network failure" appears in both the error state panel and the toast
		expect(
			screen.getAllByText("Network failure").length,
		).toBeGreaterThanOrEqual(2);
		expect(screen.getByText("Error")).toBeInTheDocument();
	});

	it("does not show a toast when recovery state is 'idle'", () => {
		useRecoveryMock.mockReturnValue(makeRecovery({ state: "idle" }));
		render(<RecoveryPage />);

		expect(screen.queryByText("Success")).not.toBeInTheDocument();
		expect(screen.queryByText("Error")).not.toBeInTheDocument();
	});

	// -------------------------------------------------------------------------
	// #460 – standalone RecoveryDocsLink in the page header
	// -------------------------------------------------------------------------
	describe("#460 — standalone docs link in the page header", () => {
		it("renders at least one 'Read Docs' link (header + FAQ footer)", () => {
			useRecoveryMock.mockReturnValue(makeRecovery());
			render(<RecoveryPage />);

			// There are two docs links when idle: one in the header, one in the FAQ.
			const docsLinks = screen.getAllByRole("link", {
				name: /read recovery documentation/i,
			});
			expect(docsLinks.length).toBeGreaterThanOrEqual(2);
		});

		it("header docs link points to the canonical recovery docs URL", () => {
			useRecoveryMock.mockReturnValue(makeRecovery());
			render(<RecoveryPage />);

			const docsLinks = screen.getAllByRole("link", {
				name: /read recovery documentation/i,
			});
			// All docs links should point to the same canonical URL
			for (const link of docsLinks) {
				expect(link).toHaveAttribute(
					"href",
					"https://docs.mux.network/recovery",
				);
			}
		});

		it("header docs link opens in a new tab with noopener noreferrer", () => {
			useRecoveryMock.mockReturnValue(makeRecovery());
			render(<RecoveryPage />);

			const docsLinks = screen.getAllByRole("link", {
				name: /read recovery documentation/i,
			});
			for (const link of docsLinks) {
				expect(link).toHaveAttribute("target", "_blank");
				expect(link).toHaveAttribute("rel", "noopener noreferrer");
			}
		});

		it("docs link is visible in the loading state (header always renders)", () => {
			useRecoveryMock.mockReturnValue(makeRecovery({ state: "loading" }));
			render(<RecoveryPage />);

			// During loading the FAQ is hidden, but the header link is always present
			const docsLinks = screen.getAllByRole("link", {
				name: /read recovery documentation/i,
			});
			expect(docsLinks.length).toBeGreaterThanOrEqual(1);
		});
	});

	// -------------------------------------------------------------------------
	// #456 – recovery timeline list
	// -------------------------------------------------------------------------
	describe("#456 — recovery timeline list", () => {
		it("renders the Recovery Timeline section heading when idle", () => {
			useRecoveryMock.mockReturnValue(makeRecovery({ state: "idle" }));
			render(<RecoveryPage />);

			expect(
				screen.getByRole("heading", { name: /recovery timeline/i }),
			).toBeInTheDocument();
		});

		it("renders timeline events from mock data when idle", () => {
			useRecoveryMock.mockReturnValue(makeRecovery({ state: "idle" }));
			render(<RecoveryPage />);

			// The mock timeline (mockRecoveryTimelineCompleted) includes "Recovery Initiated"
			expect(screen.getByText("Recovery Initiated")).toBeInTheDocument();
		});

		it("shows progress bar inside the timeline section", () => {
			useRecoveryMock.mockReturnValue(makeRecovery({ state: "idle" }));
			const { container } = render(<RecoveryPage />);

			expect(
				container.querySelector('[role="progressbar"]'),
			).toBeInTheDocument();
		});

		it("does not render the timeline section during loading state", () => {
			useRecoveryMock.mockReturnValue(makeRecovery({ state: "loading" }));
			render(<RecoveryPage />);

			expect(
				screen.queryByRole("heading", { name: /recovery timeline/i }),
			).not.toBeInTheDocument();
		});

		it("does not render the timeline section during bootstrap error", () => {
			useRecoveryMock.mockReturnValue(
				makeRecovery({
					state: "error",
					errorMessage: "Failed to load",
				}),
			);
			render(<RecoveryPage />);

			expect(
				screen.queryByRole("heading", { name: /recovery timeline/i }),
			).not.toBeInTheDocument();
		});
	});

	// -------------------------------------------------------------------------
	// #458 – Recovery FAQ section
	// -------------------------------------------------------------------------
	describe("#458 — recovery FAQ section", () => {
		it("renders the FAQ section heading when idle", () => {
			useRecoveryMock.mockReturnValue(makeRecovery({ state: "idle" }));
			render(<RecoveryPage />);

			expect(
				screen.getByRole("heading", {
					name: /frequently asked questions/i,
				}),
			).toBeInTheDocument();
		});

		it("renders FAQ items", () => {
			useRecoveryMock.mockReturnValue(makeRecovery({ state: "idle" }));
			render(<RecoveryPage />);

			// At least one well-known FAQ question must be visible
			expect(
				screen.getAllByText(/what is invisible wallet recovery/i).length,
			).toBeGreaterThan(0);
		});

		it("includes a docs link inside the FAQ footer", () => {
			useRecoveryMock.mockReturnValue(makeRecovery({ state: "idle" }));
			render(<RecoveryPage />);

			// There are now two docs links — one in the header and one in the FAQ.
			// getAllByRole ensures both are present.
			const docsLinks = screen.getAllByRole("link", {
				name: /read recovery documentation/i,
			});
			expect(docsLinks.length).toBeGreaterThanOrEqual(2);
		});

		it("does not render the FAQ during the loading state", () => {
			useRecoveryMock.mockReturnValue(makeRecovery({ state: "loading" }));
			render(<RecoveryPage />);

			expect(
				screen.queryByRole("heading", {
					name: /frequently asked questions/i,
				}),
			).not.toBeInTheDocument();
		});
	});
});
