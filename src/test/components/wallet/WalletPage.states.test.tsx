/**
 * WalletPage.states.test.tsx
 *
 * Covers issues:
 *  #296 – empty state UI
 *  #297 – error state UI
 *  #298 – loading skeleton
 *  #299 – responsive layout (desktop table / mobile cards)
 *
 * Tests the /demo/dashboard/wallets page (the primary implementation) and the
 * WalletTable component which owns responsive rendering + empty state.
 */
import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AuthProvider } from "@/context/AuthContext";
import { NetworkProvider } from "@/context/NetworkContext";
import type { Wallet } from "@/types/wallet";

// ---------------------------------------------------------------------------
// Page-level tests (async loading / error / empty)
// ---------------------------------------------------------------------------

// The wallets page relies on dummyWallets — mock the module so we can control
// what "the backend" returns without touching the component itself.
vi.mock("@/mock-data/wallets", () => ({ dummyWallets: [] }));

import WalletsPage from "@/app/demo/dashboard/wallets/page";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { WalletTableSkeleton } from "@/components/ui/Skeleton";
import { WalletTable } from "@/components/wallet/WalletTable";

function renderPage() {
	return render(
		<AuthProvider>
			<NetworkProvider>
				<WalletsPage />
			</NetworkProvider>
		</AuthProvider>,
	);
}

// ---------------------------------------------------------------------------
// #298 – Loading skeleton
// ---------------------------------------------------------------------------
describe("#298 – Loading skeleton", () => {
	beforeEach(() => {
		vi.useFakeTimers();
	});
	afterEach(() => {
		vi.useRealTimers();
	});

	it("shows the skeleton immediately on mount", () => {
		renderPage();
		// WalletTableSkeleton renders multiple [data-testid="skeleton"] divs
		const skeletons = screen.getAllByTestId("skeleton");
		expect(skeletons.length).toBeGreaterThan(0);
	});

	it("does not show a table or empty state while loading", () => {
		renderPage();
		expect(screen.queryByRole("table")).not.toBeInTheDocument();
		expect(screen.queryByText(/no wallets/i)).not.toBeInTheDocument();
	});

	it("removes the skeleton after loading completes", async () => {
		renderPage();
		expect(screen.getAllByTestId("skeleton").length).toBeGreaterThan(0);
		act(() => {
			vi.advanceTimersByTime(1000);
		});
		await waitFor(() => {
			expect(screen.queryAllByTestId("skeleton")).toHaveLength(0);
		});
	});
});

// ---------------------------------------------------------------------------
// #296 – Empty state UI
// ---------------------------------------------------------------------------
describe("#296 – Empty state UI", () => {
	beforeEach(() => {
		vi.useFakeTimers();
	});
	afterEach(() => {
		vi.useRealTimers();
	});

	it("shows EmptyState when no wallets exist for the network", async () => {
		// dummyWallets is already mocked to [] above
		renderPage();
		act(() => {
			vi.advanceTimersByTime(1000);
		});
		await waitFor(() => {
			expect(screen.getByText(/no wallets found/i)).toBeInTheDocument();
		});
	});

	it("does not show a table when no wallets are present", async () => {
		renderPage();
		act(() => {
			vi.advanceTimersByTime(1000);
		});
		await waitFor(() => {
			expect(screen.queryByRole("table")).not.toBeInTheDocument();
		});
	});

	it("empty state is not visible during loading", () => {
		renderPage();
		expect(screen.queryByText(/no wallets found/i)).not.toBeInTheDocument();
	});

	// WalletTable-level empty state (component in isolation)
	describe("WalletTable component", () => {
		it("renders EmptyState when wallets array is empty", () => {
			render(<WalletTable wallets={[]} />);
			// EmptyState renders the title in an h3
			expect(
				screen.getByRole("heading", { name: /no wallets found/i }),
			).toBeInTheDocument();
		});

		it("empty state description mentions the network context", () => {
			render(<WalletTable wallets={[]} />);
			expect(
				screen.getByText(/no wallets found for this network/i),
			).toBeInTheDocument();
		});

		it("does not render a table when wallets array is empty", () => {
			render(<WalletTable wallets={[]} />);
			expect(screen.queryByRole("table")).not.toBeInTheDocument();
		});

		it("renders a table once wallets are provided", () => {
			const wallet: Wallet = {
				id: "w1",
				address: "GBZXN7PIRZGNMHGA7MUUUF4GWPY5AYPV6LY4UV2GL6VJGIQRXFDNMADI",
				network: "mainnet",
				status: "active",
				createdAt: new Date("2024-01-01"),
				balance: "100 XLM",
			};
			render(<WalletTable wallets={[wallet]} />);
			expect(screen.queryByText(/no wallets found/i)).not.toBeInTheDocument();
			expect(screen.getByRole("table")).toBeInTheDocument();
		});
	});
});

// ---------------------------------------------------------------------------
// #297 – Error state UI
// ---------------------------------------------------------------------------
describe("#297 – Error state UI", () => {
	it("ErrorState component renders the error message", () => {
		render(
			<ErrorState
				description="Failed to load wallets. Please try again."
				retry={{ onRetry: vi.fn() }}
			/>,
		);
		expect(screen.getByText(/failed to load wallets/i)).toBeInTheDocument();
	});

	it("ErrorState renders a retry button", () => {
		render(
			<ErrorState description="Network error" retry={{ onRetry: vi.fn() }} />,
		);
		expect(
			screen.getByRole("button", { name: /try again/i }),
		).toBeInTheDocument();
	});

	it("ErrorState retry button calls the handler", async () => {
		const user = userEvent.setup();
		const onRetry = vi.fn();
		render(<ErrorState description="Error" retry={{ onRetry }} />);
		await user.click(screen.getByRole("button", { name: /try again/i }));
		expect(onRetry).toHaveBeenCalledOnce();
	});

	it("ErrorState uses custom retry label when provided", () => {
		render(
			<ErrorState
				description="Error"
				retry={{ label: "Reload wallets", onRetry: vi.fn() }}
			/>,
		);
		expect(
			screen.getByRole("button", { name: /reload wallets/i }),
		).toBeInTheDocument();
	});

	it("ErrorState shows a default title when none is provided", () => {
		render(<ErrorState description="Something failed" />);
		expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();
	});

	it("ErrorState renders the error icon container", () => {
		const { container } = render(<ErrorState description="err" />);
		// The icon wrapper has a red background class
		const iconWrapper = container.querySelector(
			".bg-red-100, .bg-red-900\\/30",
		);
		expect(iconWrapper).toBeTruthy();
	});

	it("ErrorState is not shown during loading", () => {
		vi.useFakeTimers();
		renderPage();
		expect(screen.queryByText(/failed to load/i)).not.toBeInTheDocument();
		vi.useRealTimers();
	});
});

// ---------------------------------------------------------------------------
// #299 – Responsive layout
// ---------------------------------------------------------------------------
describe("#299 – Responsive layout", () => {
	const wallets: Wallet[] = [
		{
			id: "w1",
			address: "GBZXN7PIRZGNMHGA7MUUUF4GWPY5AYPV6LY4UV2GL6VJGIQRXFDNMADI",
			network: "mainnet",
			status: "active",
			createdAt: new Date("2024-01-01"),
			balance: "100 XLM",
		},
		{
			id: "w2",
			address: "GCFONE23AB7Y6C5YZOMKUKGETPIAJA752ZPMORQO5VKA6LHXHC7Y3YPE",
			network: "testnet",
			status: "pending",
			createdAt: new Date("2024-02-01"),
		},
	];

	it("renders the desktop table (hidden lg:block wrapper)", () => {
		const { container } = render(<WalletTable wallets={wallets} />);
		const desktopTable = container.querySelector(".hidden.lg\\:block");
		expect(desktopTable).toBeTruthy();
		expect(desktopTable!.querySelector("table")).toBeTruthy();
	});

	it("renders the mobile card view (lg:hidden wrapper)", () => {
		const { container } = render(<WalletTable wallets={wallets} />);
		const mobileView = container.querySelector(".lg\\:hidden");
		expect(mobileView).toBeTruthy();
	});

	it("desktop table has all six column headers", () => {
		render(<WalletTable wallets={wallets} />);
		const headers = screen.getAllByRole("columnheader");
		const headerTexts = headers.map((h) => h.textContent);
		expect(headerTexts).toContain("Address");
		expect(headerTexts).toContain("Network");
		expect(headerTexts).toContain("Status");
		expect(headerTexts).toContain("Balance");
		expect(headerTexts).toContain("Created");
		expect(headerTexts).toContain("Last Activity");
	});

	it("mobile card view renders a card link for each wallet", () => {
		const { container } = render(<WalletTable wallets={wallets} />);
		const mobileView = container.querySelector(".lg\\:hidden");
		expect(mobileView).toBeTruthy();
		// Each wallet card is a direct child <a> link of the mobile container
		const directLinks = Array.from(mobileView!.children).filter(
			(el) => el.tagName === "A",
		);
		expect(directLinks.length).toBe(wallets.length);
	});

	it("table header area uses flex layout with sm:flex-row for responsiveness", () => {
		const { container } = render(<WalletTable wallets={wallets} />);
		// The header bar should have sm:flex-row
		const headerBar = container.querySelector(".sm\\:flex-row");
		expect(headerBar).toBeTruthy();
	});

	it("Add Wallet button has full-width on mobile and auto on sm", () => {
		const { container } = render(
			<WalletTable wallets={wallets} onAddWallet={vi.fn()} />,
		);
		const btn = container.querySelector(".w-full.sm\\:w-auto");
		expect(btn).toBeTruthy();
	});

	it("skeleton has responsive column widths", () => {
		const { container } = render(<WalletTableSkeleton />);
		// Some skeleton cells are hidden on small screens
		const hiddenSm = container.querySelector(".hidden.sm\\:block");
		expect(hiddenSm).toBeTruthy();
	});

	it("wallet count in header is always visible", () => {
		render(<WalletTable wallets={wallets} />);
		expect(screen.getByText(/2 wallets/i)).toBeInTheDocument();
	});
});
