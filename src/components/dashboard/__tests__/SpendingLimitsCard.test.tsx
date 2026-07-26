import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SpendingLimitsCard } from "../SpendingLimitsCard";

const defaultGetResponse = {
	limits: { dailyLimit: 5000, transactionLimit: 1000 },
	todayUsage: 750,
};

const savedResponse = {
	limits: { dailyLimit: 8000, transactionLimit: 2000 },
	todayUsage: 900,
};

function mockFetch(options?: {
	getFails?: boolean;
	getFailCount?: number;
	getPayload?: unknown;
	putFails?: boolean;
	putDelay?: boolean;
}) {
	let getAttempts = 0;
	const fetchMock = vi.fn((url: string, init?: RequestInit) => {
		if (init?.method === "PUT") {
			if (options?.putFails) {
				return Promise.resolve({
					ok: false,
					status: 400,
					json: async () => ({ error: "Validation failed" }),
				});
			}

			const delay = options?.putDelay ? 100 : 0;
			return new Promise((resolve) => {
				setTimeout(
					() =>
						resolve({
							ok: true,
							status: 200,
							json: async () => savedResponse,
						}),
					delay,
				);
			});
		}

		getAttempts += 1;
		if (
			options?.getFails ||
			(typeof options?.getFailCount === "number" &&
				getAttempts <= options.getFailCount)
		) {
			return Promise.reject(new Error("Network error"));
		}

		return Promise.resolve({
			ok: true,
			status: 200,
			json: async () => options?.getPayload ?? defaultGetResponse,
		});
	});

	vi.stubGlobal("fetch", fetchMock);
	return fetchMock;
}

describe("SpendingLimitsCard", () => {
	beforeEach(() => {
		window.localStorage.clear();
		mockFetch();
	});

	afterEach(() => {
		vi.unstubAllGlobals();
		vi.restoreAllMocks();
		window.localStorage.clear();
	});

	it("renders the skeleton when loading is true", () => {
		const { container } = render(<SpendingLimitsCard loading />);
		expect(container.querySelectorAll(".animate-pulse").length).toBeGreaterThan(
			0,
		);
	});

	it("fetches limits from the spending-limits API on mount", async () => {
		const fetchMock = mockFetch();
		render(<SpendingLimitsCard />);

		await waitFor(() => {
			expect(fetchMock).toHaveBeenCalledWith("/api/spending-limits", {
				cache: "no-store",
			});
		});
	});

	it("renders the current limits and usage from the API", async () => {
		render(<SpendingLimitsCard />);

		await waitFor(() => {
			expect(screen.getByDisplayValue("5000")).toBeInTheDocument();
		});

		expect(screen.getByDisplayValue("1000")).toBeInTheDocument();
		expect(screen.getByText("$750")).toBeInTheDocument();
		expect(screen.getByText("15.0%")).toBeInTheDocument();
	});

	it("falls back to cached values when the API is disconnected", async () => {
		window.localStorage.setItem(
			"spending-limits",
			JSON.stringify({ dailyLimit: 9999, transactionLimit: 500 }),
		);
		mockFetch({ getFails: true });

		render(<SpendingLimitsCard />);

		await waitFor(() => {
			expect(screen.getByDisplayValue("9999")).toBeInTheDocument();
		});
		expect(screen.getByDisplayValue("500")).toBeInTheDocument();
		expect(screen.getByText(/showing cached values/i)).toBeInTheDocument();
	});

	it("ignores invalid cached data and falls back to defaults", async () => {
		window.localStorage.setItem("spending-limits", "{invalid json");
		mockFetch({ getFails: true });

		render(<SpendingLimitsCard />);

		await waitFor(() => {
			expect(screen.getByDisplayValue("5000")).toBeInTheDocument();
		});
		expect(screen.getByDisplayValue("1000")).toBeInTheDocument();
		expect(screen.getByText(/using default limits/i)).toBeInTheDocument();
	});

	it("saves limits via PUT and persists the cache", async () => {
		const fetchMock = mockFetch();
		const user = userEvent.setup();

		render(<SpendingLimitsCard />);
		await waitFor(() => {
			expect(screen.getByDisplayValue("5000")).toBeInTheDocument();
		});

		await user.clear(screen.getByLabelText(/daily spending limit/i));
		await user.type(screen.getByLabelText(/daily spending limit/i), "8000");
		await user.clear(screen.getByLabelText(/per-transaction limit/i));
		await user.type(screen.getByLabelText(/per-transaction limit/i), "2000");

		await user.click(screen.getByRole("button", { name: /save settings/i }));

		await waitFor(() => {
			expect(fetchMock).toHaveBeenCalledWith("/api/spending-limits", {
				method: "PUT",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					dailyLimit: 8000,
					transactionLimit: 2000,
				}),
			});
		});

		const stored = window.localStorage.getItem("spending-limits");
		expect(stored).not.toBeNull();
		expect(JSON.parse(stored ?? "null")).toEqual({
			dailyLimit: 8000,
			transactionLimit: 2000,
		});
		expect(screen.getByText(/spending limits saved/i)).toBeInTheDocument();
	});

	it("shows validation feedback when a limit is invalid", async () => {
		const user = userEvent.setup();
		render(<SpendingLimitsCard />);

		await waitFor(() => {
			expect(screen.getByDisplayValue("5000")).toBeInTheDocument();
		});

		await user.clear(screen.getByLabelText(/daily spending limit/i));
		await user.click(screen.getByRole("button", { name: /save settings/i }));

		expect(screen.getByText(/this field is required/i)).toBeInTheDocument();
		expect(
			screen.getByText(/fix the highlighted fields before saving/i),
		).toBeInTheDocument();
	});

	it("surfaces PUT failures without losing the cached values", async () => {
		mockFetch({ putFails: true });
		const user = userEvent.setup();

		render(<SpendingLimitsCard />);
		await waitFor(() => {
			expect(screen.getByDisplayValue("5000")).toBeInTheDocument();
		});

		await user.click(screen.getByRole("button", { name: /save settings/i }));

		await waitFor(() => {
			expect(screen.getByRole("alert")).toHaveTextContent(/validation failed/i);
		});
		expect(
			JSON.parse(window.localStorage.getItem("spending-limits") ?? "null"),
		).toEqual({
			dailyLimit: 5000,
			transactionLimit: 1000,
		});
	});

	it("renders dark-mode and mobile layout classes", () => {
		const { container } = render(<SpendingLimitsCard />);
		const card = container.firstElementChild as HTMLElement;

		expect(card.className).toContain("dark:bg-zinc-950");
		expect(
			screen.getByRole("button", { name: /save settings/i }).className,
		).toContain("w-full");
		expect(
			screen.getByRole("button", { name: /save settings/i }).className,
		).toContain("sm:w-auto");
	});

	it("allows retrying a failed load", async () => {
		const fetchMock = mockFetch({ getFailCount: 1 });
		const user = userEvent.setup();

		render(<SpendingLimitsCard />);
		await waitFor(() => {
			expect(screen.getByText(/using default limits/i)).toBeInTheDocument();
		});

		const retryButton = screen.getByRole("button", { name: /retry/i });
		await user.click(retryButton);

		await waitFor(() => {
			expect(screen.getByDisplayValue("5000")).toBeInTheDocument();
		});
		expect(fetchMock).toHaveBeenCalledTimes(2);
	});

	it("saves when Enter is pressed in an input", async () => {
		const fetchMock = mockFetch({ putDelay: true });
		const user = userEvent.setup();
		render(<SpendingLimitsCard />);

		await waitFor(() => {
			expect(screen.getByDisplayValue("5000")).toBeInTheDocument();
		});

		const dailyInput = screen.getByLabelText(/daily spending limit/i);
		await user.click(dailyInput);
		await user.keyboard("{Enter}");

		await waitFor(() => {
			expect(fetchMock).toHaveBeenCalledWith("/api/spending-limits", {
				method: "PUT",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					dailyLimit: 5000,
					transactionLimit: 1000,
				}),
			});
		});
	});
});
