import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import SettingsPage from "./page";

vi.mock("@/context/AuthContext", () => ({
	useAuth: () => ({
		user: { name: "Mux Developer", email: "dev@example.com", role: "developer" },
		isLoading: false,
	}),
}));

describe("SettingsPage", () => {
	beforeEach(() => localStorage.clear());

	it("renders and persists profile preferences", () => {
		render(<SettingsPage />);
		const input = screen.getByLabelText("Display name");
		fireEvent.change(input, { target: { value: "Stellar Builder" } });
		fireEvent.click(screen.getByRole("button", { name: "Save preferences" }));
		expect(screen.getByText("Saved")).toBeInTheDocument();
		expect(localStorage.getItem("mux_profile_preferences")).toContain("Stellar Builder");
	});
});
