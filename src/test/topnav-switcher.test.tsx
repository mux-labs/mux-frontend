import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { TopNav } from "@/components/layouts/TopNav";
import { NetworkProvider } from "@/context/NetworkContext";

vi.mock("next/navigation", () => ({
	usePathname: () => "/dashboard/wallets",
}));

// TopNav calls useAuth — provide a minimal stub so the component renders
vi.mock("@/context/AuthContext", () => ({
	useAuth: () => ({ user: null, isLoading: false }),
}));

function renderTopNav(onMenuClick = vi.fn()) {
	return render(
		<NetworkProvider>
			<TopNav onMenuClick={onMenuClick} />
		</NetworkProvider>,
	);
}

// ---------------------------------------------------------------------------
// Network switcher
// ---------------------------------------------------------------------------

describe("TopNav — network switcher", () => {
	beforeEach(() => {
		document.title = "";
		// Ensure we start in a clean network state each test
		localStorage.removeItem("mux_network");
	});

	it("renders Testnet and Mainnet switch buttons", () => {
		renderTopNav();
		expect(
			screen.getByRole("button", { name: /switch to testnet/i }),
		).toBeInTheDocument();
		expect(
			screen.getByRole("button", { name: /switch to mainnet/i }),
		).toBeInTheDocument();
	});

	it("defaults to Mainnet active state", () => {
		renderTopNav();
		const mainnetBtn = screen.getByRole("button", {
			name: /switch to mainnet/i,
		});
		// Active button has amber/blue highlight class
		expect(mainnetBtn).toHaveClass("bg-blue-100");
	});

	it("switches to testnet when Testnet button is clicked", () => {
		renderTopNav();
		fireEvent.click(screen.getByRole("button", { name: /switch to testnet/i }));
		const testnetBtn = screen.getByRole("button", {
			name: /switch to testnet/i,
		});
		expect(testnetBtn).toHaveClass("bg-amber-100");
	});

	it("switches back to mainnet when Mainnet button is clicked", () => {
		renderTopNav();
		fireEvent.click(screen.getByRole("button", { name: /switch to testnet/i }));
		fireEvent.click(screen.getByRole("button", { name: /switch to mainnet/i }));
		const mainnetBtn = screen.getByRole("button", {
			name: /switch to mainnet/i,
		});
		expect(mainnetBtn).toHaveClass("bg-blue-100");
	});

	it("updates the network badge in the page title on network switch", () => {
		renderTopNav();
		// Mainnet badge shown by default
		const badges = screen.getAllByText("Mainnet");
		expect(badges.length).toBeGreaterThanOrEqual(1);

		fireEvent.click(screen.getByRole("button", { name: /switch to testnet/i }));
		const testnetBadges = screen.getAllByText("Testnet");
		expect(testnetBadges.length).toBeGreaterThanOrEqual(2); // switcher + h1 badge
	});

	it("updates document.title to reflect active network", () => {
		document.title = "";
		renderTopNav();
		expect(document.title).toBe("Wallets · Mainnet — Mux");

		fireEvent.click(screen.getByRole("button", { name: /switch to testnet/i }));
		expect(document.title).toBe("Wallets · Testnet — Mux");

		fireEvent.click(screen.getByRole("button", { name: /switch to mainnet/i }));
		expect(document.title).toBe("Wallets · Mainnet — Mux");
	});

	it("announces optimistic network switching immediately", () => {
		renderTopNav();
		fireEvent.click(screen.getByRole("button", { name: /switch to testnet/i }));
		expect(screen.getByText("Switching to Testnet")).toBeInTheDocument();
		expect(
			screen.getByRole("button", { name: /switch to testnet/i }),
		).toHaveAttribute("aria-pressed", "true");
	});
});

// ---------------------------------------------------------------------------
// Dark mode toggle
// ---------------------------------------------------------------------------

describe("TopNav — dark mode toggle", () => {
	beforeEach(() => {
		// Start each test in light mode
		document.documentElement.classList.remove("dark");
		localStorage.removeItem("mux_dark_mode");
	});

	it("renders the dark mode toggle button", () => {
		renderTopNav();
		expect(
			screen.getByRole("button", { name: /switch to dark mode/i }),
		).toBeInTheDocument();
	});

	it("toggles to dark mode on click", () => {
		renderTopNav();
		const toggle = screen.getByRole("button", { name: /switch to dark mode/i });
		fireEvent.click(toggle);
		expect(document.documentElement.classList.contains("dark")).toBe(true);
	});

	it("shows 'switch to light mode' label after enabling dark mode", () => {
		renderTopNav();
		fireEvent.click(
			screen.getByRole("button", { name: /switch to dark mode/i }),
		);
		expect(
			screen.getByRole("button", { name: /switch to light mode/i }),
		).toBeInTheDocument();
	});

	it("toggles back to light mode on second click", () => {
		renderTopNav();
		const toggle = screen.getByRole("button", { name: /switch to dark mode/i });
		fireEvent.click(toggle); // → dark
		fireEvent.click(
			screen.getByRole("button", { name: /switch to light mode/i }),
		); // → light
		expect(document.documentElement.classList.contains("dark")).toBe(false);
	});

	it("persists dark mode preference to localStorage", () => {
		renderTopNav();
		fireEvent.click(
			screen.getByRole("button", { name: /switch to dark mode/i }),
		);
		expect(localStorage.getItem("mux_dark_mode")).toBe("true");
	});

	it("persists light mode preference to localStorage", () => {
		renderTopNav();
		fireEvent.click(
			screen.getByRole("button", { name: /switch to dark mode/i }),
		);
		fireEvent.click(
			screen.getByRole("button", { name: /switch to light mode/i }),
		);
		expect(localStorage.getItem("mux_dark_mode")).toBe("false");
	});
});

// ---------------------------------------------------------------------------
// Menu button
// ---------------------------------------------------------------------------

describe("TopNav — menu button", () => {
	it("calls onMenuClick when the mobile menu button is clicked", () => {
		const onMenuClick = vi.fn();
		renderTopNav(onMenuClick);
		fireEvent.click(screen.getByRole("button", { name: /open sidebar/i }));
		expect(onMenuClick).toHaveBeenCalledTimes(1);
	});
});
