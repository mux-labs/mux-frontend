/**
 * Tests for #464: Show login error alerts for failed sign in.
 */
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockReplace = vi.fn();
const mockGet = vi.fn(() => null);

vi.mock("next/navigation", () => ({
	useRouter: () => ({ replace: mockReplace }),
	useSearchParams: () => ({ get: mockGet }),
}));

vi.mock("@/context/AuthContext", () => ({
	useAuth: () => ({
		isAuthenticated: false,
		isLoading: false,
		signIn: vi.fn(),
	}),
}));

// ---------------------------------------------------------------------------
// Import after mocks
// ---------------------------------------------------------------------------

// We test the exported page (which wraps content in Suspense internally)
import LoginPage from "../page";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function renderLogin() {
	return render(<LoginPage />);
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("Login error alert (#464)", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		// Default: fetch succeeds
		global.fetch = vi.fn().mockResolvedValue({
			ok: false,
			json: async () => ({ error: "Invalid credentials." }),
		});
	});

	it("shows an error alert when sign-in fails", async () => {
		renderLogin();

		fireEvent.change(screen.getByLabelText(/email address/i), {
			target: { value: "dev@example.com" },
		});
		fireEvent.change(screen.getByLabelText(/password/i), {
			target: { value: "wrongpassword" },
		});
		fireEvent.click(screen.getByTestId("login-submit"));

		await waitFor(() => {
			expect(screen.getByTestId("login-error")).toBeDefined();
		});
		expect(screen.getByTestId("login-error").textContent).toContain(
			"Invalid credentials.",
		);
	});

	it("dismisses the error alert when the dismiss button is clicked", async () => {
		renderLogin();

		fireEvent.change(screen.getByLabelText(/email address/i), {
			target: { value: "dev@example.com" },
		});
		fireEvent.change(screen.getByLabelText(/password/i), {
			target: { value: "wrongpassword" },
		});
		fireEvent.click(screen.getByTestId("login-submit"));

		await waitFor(() => {
			expect(screen.getByTestId("login-error")).toBeDefined();
		});

		fireEvent.click(screen.getByTestId("login-error-dismiss"));

		await waitFor(() => {
			expect(screen.queryByTestId("login-error")).toBeNull();
		});
	});

	it("clears the error alert when the user starts typing", async () => {
		renderLogin();

		fireEvent.change(screen.getByLabelText(/email address/i), {
			target: { value: "dev@example.com" },
		});
		fireEvent.change(screen.getByLabelText(/password/i), {
			target: { value: "wrongpassword" },
		});
		fireEvent.click(screen.getByTestId("login-submit"));

		await waitFor(() => {
			expect(screen.getByTestId("login-error")).toBeDefined();
		});

		// Typing in email field should clear the alert
		fireEvent.change(screen.getByLabelText(/email address/i), {
			target: { value: "other@example.com" },
		});

		await waitFor(() => {
			expect(screen.queryByTestId("login-error")).toBeNull();
		});
	});

	it("does not show error alert on initial render", () => {
		renderLogin();
		expect(screen.queryByTestId("login-error")).toBeNull();
	});
});
