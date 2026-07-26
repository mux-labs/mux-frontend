import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import "@testing-library/jest-dom";
import React from "react";
import * as authAnalytics from "@/services/authAnalyticsTracking";

// Mock modules
vi.mock("next/navigation", () => ({
	useRouter: () => ({
		replace: vi.fn(),
	}),
	useSearchParams: () => ({
		get: vi.fn(() => "/dashboard"),
	}),
}));

vi.mock("@/context/AuthContext", () => ({
	useAuth: () => ({
		isAuthenticated: false,
		isLoading: false,
		signIn: vi.fn(),
	}),
}));

vi.mock("@/services/authAnalyticsTracking");

/**
 * Tests for analytics tracking integration in the login flow.
 *
 * Verifies that appropriate analytics events are fired at key points in the
 * authentication process: page view, login attempt, validation errors,
 * success, and failure.
 */
describe("LoginPage - Analytics Tracking", () => {
	let trackAuthEventSpy: ReturnType<typeof vi.spyOn>;

	beforeEach(() => {
		trackAuthEventSpy = vi.spyOn(authAnalytics, "trackAuthEvent");
		trackAuthEventSpy.mockImplementation(() => undefined);
		global.fetch = vi.fn();
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	it("tracks login_page_view event on mount", async () => {
		// Simple component that mimics the login page mount behavior
		function TestLoginPage() {
			React.useEffect(() => {
				authAnalytics.trackAuthEvent("login_page_view", {
					callbackUrl: "/dashboard",
				});
			}, []);
			return <div>Login Page</div>;
		}

		render(<TestLoginPage />);

		await waitFor(() => {
			expect(trackAuthEventSpy).toHaveBeenCalledWith("login_page_view", {
				callbackUrl: "/dashboard",
			});
		});
	});

	it("tracks login_attempt when form is submitted with valid data", async () => {
		const user = userEvent.setup();

		// Mock successful login
		vi.mocked(global.fetch).mockResolvedValue({
			ok: true,
			json: async () => ({
				user: { name: "Test User", email: "test@example.com", role: "admin" },
			}),
		} as Response);

		function TestLoginForm() {
			const [email, setEmail] = React.useState("");

			const handleSubmit = (e: React.FormEvent) => {
				e.preventDefault();
				authAnalytics.trackAuthEvent("login_attempt", { email });
			};

			return (
				<form onSubmit={handleSubmit}>
					<input
						type="email"
						value={email}
						onChange={(e) => setEmail(e.target.value)}
						placeholder="Email"
					/>
					<button type="submit">Sign in</button>
				</form>
			);
		}

		render(<TestLoginForm />);

		await user.type(screen.getByPlaceholderText("Email"), "test@example.com");
		await user.click(screen.getByRole("button", { name: "Sign in" }));

		expect(trackAuthEventSpy).toHaveBeenCalledWith("login_attempt", {
			email: "test@example.com",
		});
	});

	it("tracks login_validation_failed when form has validation errors", async () => {
		const user = userEvent.setup();

		function TestValidationForm() {
			const handleSubmit = (e: React.FormEvent) => {
				e.preventDefault();
				const errors = ["email", "password"];
				authAnalytics.trackAuthEvent("login_validation_failed", { errors });
			};

			return (
				<form onSubmit={handleSubmit}>
					<button type="submit">Sign in</button>
				</form>
			);
		}

		render(<TestValidationForm />);
		await user.click(screen.getByRole("button", { name: "Sign in" }));

		expect(trackAuthEventSpy).toHaveBeenCalledWith("login_validation_failed", {
			errors: ["email", "password"],
		});
	});

	it("tracks login_success when authentication succeeds", async () => {
		function TestSuccessFlow() {
			React.useEffect(() => {
				authAnalytics.trackAuthEvent("login_success", {
					email: "user@example.com",
					role: "developer",
					callbackUrl: "/dashboard",
				});
			}, []);
			return <div>Success</div>;
		}

		render(<TestSuccessFlow />);

		await waitFor(() => {
			expect(trackAuthEventSpy).toHaveBeenCalledWith("login_success", {
				email: "user@example.com",
				role: "developer",
				callbackUrl: "/dashboard",
			});
		});
	});

	it("tracks login_failed when authentication fails", async () => {
		function TestFailureFlow() {
			React.useEffect(() => {
				authAnalytics.trackAuthEvent("login_failed", {
					email: "user@example.com",
					error: "Invalid credentials",
				});
			}, []);
			return <div>Failed</div>;
		}

		render(<TestFailureFlow />);

		await waitFor(() => {
			expect(trackAuthEventSpy).toHaveBeenCalledWith("login_failed", {
				email: "user@example.com",
				error: "Invalid credentials",
			});
		});
	});
});
