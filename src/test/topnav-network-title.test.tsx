import { act, fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { TopNav } from "@/components/layouts/TopNav";
import { AuthProvider } from "@/context/AuthContext";
import { NetworkProvider } from "@/context/NetworkContext";

// next/navigation is used by TopNav; mock it
vi.mock("next/navigation", () => ({
	usePathname: () => "/demo/dashboard/wallets",
}));

function renderTopNav() {
	return render(
		<AuthProvider>
			<NetworkProvider>
				<TopNav onMenuClick={() => {}} />
			</NetworkProvider>
		</AuthProvider>,
	);
}

describe("TopNav network label in page title", () => {
	beforeEach(() => {
		document.title = "";
	});

	it("shows Mainnet badge in h1 by default", () => {
		renderTopNav();
		const badges = screen.getAllByText("Mainnet");
		expect(badges.length).toBeGreaterThanOrEqual(1);
	});

	it("sets document.title with Mainnet by default", () => {
		renderTopNav();
		expect(document.title).toBe("Wallets · Mainnet — Mux");
	});

	it("shows Testnet badge in h1 after switching", () => {
		renderTopNav();
		fireEvent.click(screen.getByRole("button", { name: /switch to testnet/i }));
		const badges = screen.getAllByText("Testnet");
		// one in the switcher button, one in the h1/breadcrumb
		expect(badges.length).toBeGreaterThanOrEqual(2);
	});

	it("updates document.title to Testnet after switching", () => {
		renderTopNav();
		act(() => {
			fireEvent.click(
				screen.getByRole("button", { name: /switch to testnet/i }),
			);
		});
		expect(document.title).toBe("Wallets · Testnet — Mux");
	});

	it("updates document.title back to Mainnet when switching back", () => {
		renderTopNav();
		act(() => {
			fireEvent.click(
				screen.getByRole("button", { name: /switch to testnet/i }),
			);
		});
		act(() => {
			fireEvent.click(
				screen.getByRole("button", { name: /switch to mainnet/i }),
			);
		});
		expect(document.title).toBe("Wallets · Mainnet — Mux");
	});
});
