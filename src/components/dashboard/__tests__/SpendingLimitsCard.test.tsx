import { fireEvent, render, screen, waitFor } from "@testing-library/react";
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
		expect(
			container.querySelectorAll(".motion-reduce\\:animate-none").length,
		).toBeGreaterThan(0);
	});

	it("fetches limits from the spending-limits API on mount", async () => {
		const fetchMock = mockFetch();
		render(<SpendingLimitsCard />);

		await waitFor(() => {
			// The fetch must include cache: no-store (plus any auth headers).
			expect(fetchMock).toHaveBeenCalledWith(
				"/api/spending-limits",
				expect.objectContaining({ cache: "no-store" }),
			);
		});
	});

	it("passes an Authorization header when a session token is stored (#710)", async () => {
		// Seed a session token in the mock storage that SpendingLimitsCard reads.
		window.sessionStorage.setItem(
			"mux-auth-session",
			JSON.stringify({ accessToken: "test-bearer-token", expiresAt: Date.now() + 30000 }),
		);
		const fetchMock = mockFetch();
		render(<SpendingLimitsCard />);

		await waitFor(() => {
			expect(fetchMock).toHaveBeenCalledWith(
				"/api/spending-limits",
				expect.objectContaining({
					headers: expect.objectContaining({
						Authorization: "Bearer test-bearer-token",
					}),
				}),
			);
		});

		window.sessionStorage.removeItem("mux-auth-session");
	});

	it("renders the current limits and usage from the API", async () => {
		render(<SpendingLimitsCard />);

		// todayUsage starts at 0 (no fabricated placeholder) and only reflects
		// a real figure once the API responds.
		await waitFor(() => {
			expect(screen.getByText("$750")).toBeInTheDocument();
		});

		expect(screen.getByDisplayValue("5000")).toBeInTheDocument();
		expect(screen.getByDisplayValue("1000")).toBeInTheDocument();
		expect(screen.getByText("15.0%")).toBeInTheDocument();
	});

	it("shows default limits and an error when the API is unavailable (no per-browser cache)", async () => {
		// A stale value left in localStorage by an older build must be ignored,
		// not surfaced as account state (#649).
		window.localStorage.setItem(
			"spending-limits",
			JSON.stringify({ dailyLimit: 9999, transactionLimit: 500 }),
		);
		mockFetch({ getFails: true });

		render(<SpendingLimitsCard />);

		await waitFor(() => {
			expect(screen.getByText(/using default limits/i)).toBeInTheDocument();
		});
		expect(screen.queryByDisplayValue("9999")).not.toBeInTheDocument();
		expect(screen.getByDisplayValue("5000")).toBeInTheDocument();
		expect(screen.getByDisplayValue("1000")).toBeInTheDocument();
	});

	it("does not read or write spending limits to localStorage (#649)", async () => {
		const getItem = vi.spyOn(Storage.prototype, "getItem");
		const setItem = vi.spyOn(Storage.prototype, "setItem");
		const user = userEvent.setup();

		render(<SpendingLimitsCard />);
		await waitFor(() => {
			expect(screen.getByDisplayValue("5000")).toBeInTheDocument();
		});

		await user.click(screen.getByRole("button", { name: /save settings/i }));
		await waitFor(() => {
			expect(screen.getByText(/spending limits saved/i)).toBeInTheDocument();
		});

		expect(setItem.mock.calls.some(([key]) => key === "spending-limits")).toBe(
			false,
		);
		expect(getItem.mock.calls.some(([key]) => key === "spending-limits")).toBe(
			false,
		);
	});

	it("saves limits via PUT", async () => {
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
			expect(fetchMock).toHaveBeenCalledWith("/api/spending-limits", expect.objectContaining({
				method: "PUT",
				headers: expect.objectContaining({ "Content-Type": "application/json" }),
				body: JSON.stringify({
					dailyLimit: 8000,
					transactionLimit: 2000,
				}),
			}));
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

	it("surfaces PUT failures and keeps the entered values", async () => {
		mockFetch({ putFails: true });
		const user = userEvent.setup();

		render(<SpendingLimitsCard />);
		await waitFor(() => {
			expect(screen.getByDisplayValue("5000")).toBeInTheDocument();
		});

		await user.clear(screen.getByLabelText(/daily spending limit/i));
		await user.type(screen.getByLabelText(/daily spending limit/i), "8000");
		await user.click(screen.getByRole("button", { name: /save settings/i }));

		await waitFor(() => {
			expect(screen.getByRole("alert")).toHaveTextContent(/validation failed/i);
		});
		// The entered value stays in the form; nothing is persisted per-browser.
		expect(screen.getByDisplayValue("8000")).toBeInTheDocument();
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

	it("shows a validation error when the daily limit exceeds the maximum", async () => {
		const user = userEvent.setup();
		render(<SpendingLimitsCard />);

		await waitFor(() => {
			expect(screen.getByDisplayValue("5000")).toBeInTheDocument();
		});

		await user.clear(screen.getByLabelText(/daily spending limit/i));
		await user.type(screen.getByLabelText(/daily spending limit/i), "5000000");
		await user.click(screen.getByRole("button", { name: /save settings/i }));

		expect(screen.getByText(/maximum is \$1,000,000/i)).toBeInTheDocument();
	});

	it("shows a validation error when the transaction limit is below the minimum", async () => {
		const user = userEvent.setup();
		render(<SpendingLimitsCard />);

		await waitFor(() => {
			expect(screen.getByDisplayValue("1000")).toBeInTheDocument();
		});

		const txInput = screen.getByLabelText(/per-transaction limit/i);
		await user.clear(txInput);
		fireEvent.change(txInput, { target: { value: "0" } });
		await user.click(screen.getByRole("button", { name: /save settings/i }));

		expect(screen.getByText(/minimum is \$1\./i)).toBeInTheDocument();
	});

	it("blurs the input on Escape without saving", async () => {
		const fetchMock = mockFetch();
		const user = userEvent.setup();
		render(<SpendingLimitsCard />);

		await waitFor(() => {
			expect(screen.getByDisplayValue("5000")).toBeInTheDocument();
		});

		const dailyInput = screen.getByLabelText(/daily spending limit/i);
		await user.click(dailyInput);
		expect(dailyInput).toHaveFocus();

		fetchMock.mockClear();
		await user.keyboard("{Escape}");

		expect(dailyInput).not.toHaveFocus();
		expect(fetchMock).not.toHaveBeenCalledWith(
			"/api/spending-limits",
			expect.objectContaining({ method: "PUT" }),
		);
	});

	it("disables the save button while a save is in flight", async () => {
		mockFetch({ putDelay: true });
		const user = userEvent.setup();
		render(<SpendingLimitsCard />);

		await waitFor(() => {
			expect(screen.getByDisplayValue("5000")).toBeInTheDocument();
		});

		const saveButton = screen.getByRole("button", { name: /save settings/i });
		await user.click(saveButton);

		expect(screen.getByRole("button", { name: /saving/i })).toBeDisabled();

		await waitFor(() => {
			expect(
				screen.getByRole("button", { name: /save settings/i }),
			).not.toBeDisabled();
		});
	});

	describe("CopyLimitButton", () => {
		it("copies the daily limit value to the clipboard", async () => {
			const writeTextSpy = vi
				.spyOn(navigator.clipboard, "writeText")
				.mockResolvedValue(undefined);
			const user = userEvent.setup();
			render(<SpendingLimitsCard />);

			await waitFor(() => {
				expect(screen.getByDisplayValue("5000")).toBeInTheDocument();
			});

			await user.click(
				screen.getByRole("button", { name: /copy daily limit/i }),
			);

			expect(writeTextSpy).toHaveBeenCalledWith("5000");
			await waitFor(() => {
				expect(screen.getByTitle("Copied!")).toBeInTheDocument();
			});
		});

		it("copies the per-transaction limit value to the clipboard", async () => {
			const writeTextSpy = vi
				.spyOn(navigator.clipboard, "writeText")
				.mockResolvedValue(undefined);
			const user = userEvent.setup();
			render(<SpendingLimitsCard />);

			await waitFor(() => {
				expect(screen.getByDisplayValue("1000")).toBeInTheDocument();
			});

			await user.click(
				screen.getByRole("button", { name: /copy transaction limit/i }),
			);

			expect(writeTextSpy).toHaveBeenCalledWith("1000");
		});

		it("shows an error state when the clipboard write fails", async () => {
			vi.spyOn(navigator.clipboard, "writeText").mockRejectedValueOnce(
				new Error("Clipboard denied"),
			);
			const user = userEvent.setup();
			render(<SpendingLimitsCard />);

			await waitFor(() => {
				expect(screen.getByDisplayValue("5000")).toBeInTheDocument();
			});

			await user.click(
				screen.getByRole("button", { name: /copy daily limit/i }),
			);

			await waitFor(() => {
				expect(screen.getByTitle("Clipboard denied")).toBeInTheDocument();
			});
		});
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
			expect(fetchMock).toHaveBeenCalledWith("/api/spending-limits", expect.objectContaining({
				method: "PUT",
				headers: expect.objectContaining({ "Content-Type": "application/json" }),
				body: JSON.stringify({
					dailyLimit: 5000,
					transactionLimit: 1000,
				}),
			}));
		});
	});
});
