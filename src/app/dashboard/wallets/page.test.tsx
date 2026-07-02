import { render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

describe("WalletsPage (/dashboard/wallets)", () => {
	let consoleSpy: ReturnType<typeof vi.spyOn>;

	beforeEach(() => {
		consoleSpy = vi.spyOn(console, "debug").mockImplementation(() => {});
	});

	afterEach(() => {
		consoleSpy.mockRestore();
		vi.resetModules();
		vi.doUnmock("@/mock-data/wallets");
	});

	async function renderPage() {
		const { default: WalletsPage } = await import(
			"@/app/dashboard/wallets/page"
		);
		render(<WalletsPage />);
	}

	describe("analytics tracking", () => {
		it("fires a page_view event for the wallets page on mount", async () => {
			await renderPage();
			expect(consoleSpy).toHaveBeenCalledWith(
				"[analytics]",
				"page_view",
				{ page: "wallets" },
			);
		});
	});

	describe("page header", () => {
		it("renders the heading and description", async () => {
			await renderPage();
			expect(
				screen.getByRole("heading", { name: /wallet monitoring/i }),
			).toBeInTheDocument();
			expect(
				screen.getByText(/track and manage your stellar wallets/i),
			).toBeInTheDocument();
		});
	});

	describe("with wallets data", () => {
		it("renders the WalletTable", async () => {
			await renderPage();
			expect(screen.getByRole("table")).toBeInTheDocument();
		});

		it("does not render the EmptyState", async () => {
			await renderPage();
			expect(
				screen.queryByText(/you haven't added any wallets/i),
			).not.toBeInTheDocument();
		});
	});

	describe("empty state", () => {
		it("renders the EmptyState when there are no wallets", async () => {
			vi.resetModules();
			vi.doMock("@/mock-data/wallets", () => ({ dummyWallets: [] }));
			await renderPage();
			expect(screen.getByText(/no wallets found/i)).toBeInTheDocument();
			expect(
				screen.getByRole("button", { name: /add wallet/i }),
			).toBeInTheDocument();
			expect(screen.queryByRole("table")).not.toBeInTheDocument();
		});
	});
});
