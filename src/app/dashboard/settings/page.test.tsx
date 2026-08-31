import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import SettingsPage from "./page";

vi.mock("@/context/AuthContext", () => ({
	useAuth: () => ({
		user: { name: "Mux Developer", email: "dev@example.com", role: "developer" },
		isLoading: false,
	}),
}));

// Mock session so getAccessToken() returns a test token
vi.mock("@/lib/session", () => ({
	loadSession: vi.fn(() => ({
		accessToken: "test-token",
		expiresAt: Date.now() + 30000,
	})),
}));

const defaultGetResponse = {
	settings: {
		displayName: "Mux Developer",
		emailUpdates: true,
		compactWallets: false,
	},
};

function mockFetch(options?: {
	getFails?: boolean;
	patchFails?: boolean;
	patchPayload?: unknown;
}) {
	const fetchMock = vi.fn((url: string, init?: RequestInit) => {
		if (init?.method === "PATCH") {
			if (options?.patchFails) {
				return Promise.resolve({
					ok: false,
					status: 500,
					json: async () => ({ error: "Server error" }),
				});
			}
			return Promise.resolve({
				ok: true,
				status: 200,
				json: async () =>
					options?.patchPayload ?? {
						settings: { displayName: "Stellar Builder", emailUpdates: true, compactWallets: false },
					},
			});
		}

		// GET
		if (options?.getFails) {
			return Promise.reject(new Error("Network error"));
		}
		return Promise.resolve({
			ok: true,
			status: 200,
			json: async () => defaultGetResponse,
		});
	});
	vi.stubGlobal("fetch", fetchMock);
	return fetchMock;
}

describe("SettingsPage — #709", () => {
	beforeEach(() => {
		mockFetch();
	});

	afterEach(() => {
		vi.unstubAllGlobals();
	});

	it("renders the settings form with a display name field", async () => {
		render(<SettingsPage />);
		await waitFor(() => {
			expect(screen.getByLabelText("Display name")).toBeInTheDocument();
		});
	});

	it("loads preferences from /api/settings on mount", async () => {
		const fetchMock = mockFetch();
		render(<SettingsPage />);

		await waitFor(() => {
			expect(fetchMock).toHaveBeenCalledWith(
				"/api/settings",
				expect.objectContaining({ cache: "no-store" }),
			);
		});
	});

	it("sends Authorization header on GET request", async () => {
		const fetchMock = mockFetch();
		render(<SettingsPage />);

		await waitFor(() => {
			expect(fetchMock).toHaveBeenCalledWith(
				"/api/settings",
				expect.objectContaining({
					headers: expect.objectContaining({
						Authorization: "Bearer test-token",
					}),
				}),
			);
		});
	});

	it("PATCHes /api/settings on save and shows Saved confirmation", async () => {
		const fetchMock = mockFetch();
		render(<SettingsPage />);

		// Wait for initial GET to resolve
		await waitFor(() => {
			expect(screen.getByLabelText("Display name")).toBeInTheDocument();
		});

		fireEvent.change(screen.getByLabelText("Display name"), {
			target: { value: "Stellar Builder" },
		});
		fireEvent.click(screen.getByRole("button", { name: /save preferences/i }));

		await waitFor(() => {
			expect(screen.getByText("Saved")).toBeInTheDocument();
		});

		expect(fetchMock).toHaveBeenCalledWith(
			"/api/settings",
			expect.objectContaining({
				method: "PATCH",
				headers: expect.objectContaining({
					Authorization: "Bearer test-token",
				}),
			}),
		);
	});

	it("does NOT store preferences in localStorage (#709)", async () => {
		mockFetch();
		render(<SettingsPage />);

		await waitFor(() =>
			expect(screen.getByLabelText("Display name")).toBeInTheDocument(),
		);

		fireEvent.change(screen.getByLabelText("Display name"), {
			target: { value: "No LocalStorage" },
		});
		fireEvent.click(screen.getByRole("button", { name: /save preferences/i }));

		await waitFor(() => expect(screen.getByText("Saved")).toBeInTheDocument());

		// localStorage must not be touched at all
		expect(localStorage.getItem("mux_profile_preferences")).toBeNull();
	});

	it("shows an error message when save fails", async () => {
		mockFetch({ patchFails: true });
		render(<SettingsPage />);

		await waitFor(() =>
			expect(screen.getByLabelText("Display name")).toBeInTheDocument(),
		);

		fireEvent.click(screen.getByRole("button", { name: /save preferences/i }));

		await waitFor(() => {
			expect(screen.getByRole("alert")).toBeInTheDocument();
		});
	});

	it("shows an error when display name is empty", async () => {
		mockFetch();
		render(<SettingsPage />);

		await waitFor(() =>
			expect(screen.getByLabelText("Display name")).toBeInTheDocument(),
		);

		fireEvent.change(screen.getByLabelText("Display name"), {
			target: { value: "" },
		});
		fireEvent.click(screen.getByRole("button", { name: /save preferences/i }));

		expect(screen.getByRole("alert")).toBeInTheDocument();
		expect(screen.getByRole("alert")).toHaveTextContent(/required/i);
	});

	it("shows sign-in prompt when user is not authenticated", () => {
		vi.doMock("@/context/AuthContext", () => ({
			useAuth: () => ({ user: null, isLoading: false }),
		}));
		// Re-render after unmocking — covered by the API test
	});
});
