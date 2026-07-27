import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { Sidebar } from "../Sidebar";

const prefetchRoute = vi.fn();

vi.mock("next/navigation", async () => {
	const actual = await vi.importActual<typeof import("next/navigation")>(
		"next/navigation",
	);
	return {
		...actual,
		usePathname: () => "/dashboard",
		useRouter: () => ({ prefetch: prefetchRoute }),
	};
});

const prefetchWallets = vi.fn(() => Promise.resolve([]));
vi.mock("@/lib/walletsPrefetchCache", () => ({
	prefetchWallets: () => prefetchWallets(),
}));

describe("Sidebar navigation", () => {
	beforeEach(() => {
		prefetchRoute.mockClear();
		prefetchWallets.mockClear();
	});

	it("includes API Keys and Spending Limits links and excludes Orders", () => {
		render(<Sidebar isOpen={true} onClose={() => {}} />);

		expect(screen.getByRole("link", { name: /API Keys/i })).toHaveAttribute(
			"href",
			"/dashboard/api-keys",
		);
		expect(
			screen.getByRole("link", { name: /Spending Limits/i }),
		).toHaveAttribute("href", "/dashboard/spending-limits");
		expect(screen.queryByRole("link", { name: /Orders/i })).toBeNull();
	});

	it("prefetches the wallets route and data on hover", () => {
		render(<Sidebar isOpen={true} onClose={() => {}} />);

		const walletsLink = screen.getByRole("link", { name: /Wallets/i });
		fireEvent.mouseEnter(walletsLink);

		expect(prefetchRoute).toHaveBeenCalledWith("/dashboard/wallets");
		expect(prefetchWallets).toHaveBeenCalledTimes(1);
	});

	it("does not prefetch wallet data when hovering unrelated links", () => {
		render(<Sidebar isOpen={true} onClose={() => {}} />);

		const settingsLink = screen.getByRole("link", { name: /Settings/i });
		fireEvent.mouseEnter(settingsLink);

		expect(prefetchRoute).toHaveBeenCalledWith("/dashboard/settings");
		expect(prefetchWallets).not.toHaveBeenCalled();
	});

	it("does not issue a duplicate route prefetch on repeated hovers", () => {
		render(<Sidebar isOpen={true} onClose={() => {}} />);

		const walletsLink = screen.getByRole("link", { name: /Wallets/i });
		fireEvent.mouseEnter(walletsLink);
		fireEvent.mouseEnter(walletsLink);

		expect(prefetchRoute).toHaveBeenCalledTimes(1);
	});
});
