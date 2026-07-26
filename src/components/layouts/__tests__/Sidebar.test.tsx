import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { Sidebar } from "../Sidebar";

vi.mock("next/navigation", () => ({
	usePathname: () => "/dashboard",
}));

vi.mock("@/context/AuthContext", () => ({
	useAuth: () => ({
		user: { name: "Jane Doe", email: "jane@example.com", role: "admin" },
		isLoading: false,
		isAuthenticated: true,
		signIn: vi.fn(),
		signOut: vi.fn(),
	}),
}));

describe("Sidebar navigation", () => {
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
});
