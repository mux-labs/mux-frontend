import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
	SpendingLimitsCard,
	SpendingLimitsCardSkeleton,
	SpendingLimitsEmptyState,
	SpendingLimitsErrorState,
} from "./SpendingLimitsCard";

// ---------------------------------------------------------------------------
// Core card rendering
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Global fetch mock: return the default API response
// ---------------------------------------------------------------------------

const DEFAULT_API_RESPONSE = {
	limits: { dailyLimit: 5000, transactionLimit: 1000 },
	todayUsage: 750,
};

function mockFetchSuccess(body = DEFAULT_API_RESPONSE) {
	vi.stubGlobal(
		"fetch",
		vi.fn().mockResolvedValue({
			ok: true,
			json: () => Promise.resolve(body),
		}),
	);
}

function mockFetchFailure() {
	vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("Network error")));
}

beforeEach(() => {
	mockFetchSuccess();
	vi.stubGlobal("localStorage", {
		getItem: vi.fn().mockReturnValue(null),
		setItem: vi.fn(),
	});
});

afterEach(() => {
	vi.unstubAllGlobals();
	vi.restoreAllMocks();
});

// ---------------------------------------------------------------------------
// Basic rendering
// ---------------------------------------------------------------------------

describe("SpendingLimitsCard", () => {
	it("renders the card title and description", async () => {
		render(<SpendingLimitsCard />);
		await waitFor(() => {
			expect(
				screen.getByRole("heading", { name: /spending limits/i }),
			).toBeInTheDocument();
		});
		expect(screen.getByText(/control your api expenditure/i)).toBeInTheDocument();
	});

	it("renders the Active badge", () => {
		render(<SpendingLimitsCard />);
		expect(screen.getByText("Active")).toBeInTheDocument();
	});

	it("renders daily usage section with default values", () => {
		render(<SpendingLimitsCard />);
		expect(screen.getByText("$750")).toBeInTheDocument();
		expect(screen.getByText("/ $5000")).toBeInTheDocument();
		expect(screen.getByText("15.0%")).toBeInTheDocument();
	});

	it("renders both input fields with default values", () => {
		render(<SpendingLimitsCard />);
		expect(
			screen.getByRole("spinbutton", { name: /daily spending limit/i }),
		).toHaveValue(5000);
		expect(
			screen.getByRole("spinbutton", { name: /per-transaction limit/i }),
		).toHaveValue(1000);
	});

	it("renders the Save Settings button", () => {
		render(<SpendingLimitsCard />);
		expect(
			screen.getByRole("button", { name: /save settings/i }),
		).toBeInTheDocument();
	});

	it("renders the policy note", () => {
		render(<SpendingLimitsCard />);
		expect(
			screen.getByText(/spending limits are enforced in real-time/i),
		).toBeInTheDocument();
	});

	it("updates daily limit and recalculates usage percentage", async () => {
		const user = userEvent.setup();
		render(<SpendingLimitsCard />);

		const dailyInput = screen.getByRole("spinbutton", { name: /daily spending limit/i });
		await user.clear(dailyInput);
		await user.type(dailyInput, "1500");

		// 750 / 1500 = 50%
		expect(screen.getByText("50.0%")).toBeInTheDocument();
	});

	it("caps usage percentage at 100%", async () => {
		const user = userEvent.setup();
		render(<SpendingLimitsCard />);

		const dailyInput = screen.getByRole("spinbutton", { name: /daily spending limit/i });
		await user.clear(dailyInput);
		await user.type(dailyInput, "100");

		expect(screen.getByText("100.0%")).toBeInTheDocument();
	});

	it("renders helper text under each input", () => {
		render(<SpendingLimitsCard />);
		expect(
			screen.getByText(/maximum amount you can spend per day/i),
		).toBeInTheDocument();
		expect(
			screen.getByText(/maximum cap for a single transaction/i),
		).toBeInTheDocument();
	});

	it("inputs are associated with labels (accessibility)", () => {
		render(<SpendingLimitsCard />);
		expect(screen.getByLabelText(/daily spending limit/i)).toBeInTheDocument();
		expect(screen.getByLabelText(/per-transaction limit/i)).toBeInTheDocument();
	});
});

// ---------------------------------------------------------------------------
// #266 – Empty state
// ---------------------------------------------------------------------------

describe("SpendingLimitsEmptyState", () => {
	it("renders the empty state heading and description", () => {
		render(<SpendingLimitsEmptyState onConfigure={vi.fn()} />);
		expect(screen.getByText(/no spending limits set/i)).toBeInTheDocument();
		expect(
			screen.getByText(/configure daily and per-transaction limits/i),
		).toBeInTheDocument();
	});

	it("renders the Configure Limits button", () => {
		render(<SpendingLimitsEmptyState onConfigure={vi.fn()} />);
		expect(
			screen.getByRole("button", { name: /configure limits/i }),
		).toBeInTheDocument();
	});

	it("calls onConfigure when the button is clicked", async () => {
		const user = userEvent.setup();
		const onConfigure = vi.fn();
		render(<SpendingLimitsEmptyState onConfigure={onConfigure} />);
		await user.click(screen.getByRole("button", { name: /configure limits/i }));
		expect(onConfigure).toHaveBeenCalledTimes(1);
	});

	it("has accessible role and label", () => {
		render(<SpendingLimitsEmptyState onConfigure={vi.fn()} />);
		expect(
			screen.getByRole("status", { name: /no spending limits configured/i }),
		).toBeInTheDocument();
	});
});

describe("SpendingLimitsCard empty prop", () => {
	it("shows empty state when empty=true", () => {
		render(<SpendingLimitsCard empty />);
		expect(screen.getByText(/no spending limits set/i)).toBeInTheDocument();
		// The main card heading (h2) should not be present — only the empty state h3 is
		expect(screen.queryByRole("heading", { name: /^spending limits$/i })).not.toBeInTheDocument();
	});

	it("transitions from empty to card when Configure Limits is clicked", async () => {
		const user = userEvent.setup();
		render(<SpendingLimitsCard empty />);
		await user.click(screen.getByRole("button", { name: /configure limits/i }));
		expect(
			screen.getByRole("heading", { name: /spending limits/i }),
		).toBeInTheDocument();
	});

	it("shows card content when empty=false (default)", () => {
		render(<SpendingLimitsCard />);
		expect(
			screen.getByRole("heading", { name: /spending limits/i }),
		).toBeInTheDocument();
		expect(screen.queryByText(/no spending limits set/i)).not.toBeInTheDocument();
	});
});

// ---------------------------------------------------------------------------
// #267 – Error state
// ---------------------------------------------------------------------------

describe("SpendingLimitsErrorState", () => {
	it("renders the default error heading and message", () => {
		render(<SpendingLimitsErrorState onRetry={vi.fn()} />);
		expect(screen.getByText(/failed to load/i)).toBeInTheDocument();
		expect(
			screen.getByText(/unable to load spending limits/i),
		).toBeInTheDocument();
	});

	it("renders a custom error message", () => {
		render(
			<SpendingLimitsErrorState message="Network error" onRetry={vi.fn()} />,
		);
		expect(screen.getByText("Network error")).toBeInTheDocument();
	});

	it("renders the Try Again button", () => {
		render(<SpendingLimitsErrorState onRetry={vi.fn()} />);
		expect(
			screen.getByRole("button", { name: /try again/i }),
		).toBeInTheDocument();
	});

	it("calls onRetry when Try Again is clicked", async () => {
		const user = userEvent.setup();
		const onRetry = vi.fn();
		render(<SpendingLimitsErrorState onRetry={onRetry} />);
		await user.click(screen.getByRole("button", { name: /try again/i }));
		expect(onRetry).toHaveBeenCalledTimes(1);
	});

	it("has accessible role=alert and label", () => {
		render(<SpendingLimitsErrorState onRetry={vi.fn()} />);
		expect(
			screen.getByRole("alert", { name: /error loading spending limits/i }),
		).toBeInTheDocument();
	});
});

describe("SpendingLimitsCard fetchError prop", () => {
	it("shows error state when fetchError is provided", () => {
		render(<SpendingLimitsCard fetchError="Service unavailable" />);
		expect(screen.getByText(/failed to load/i)).toBeInTheDocument();
		expect(screen.getByText("Service unavailable")).toBeInTheDocument();
	});

	it("does not show the card content when fetchError is set", () => {
		render(<SpendingLimitsCard fetchError="oops" />);
		expect(
			screen.queryByRole("heading", { name: /spending limits/i }),
		).not.toBeInTheDocument();
	});

	it("shows card content when fetchError is null", () => {
		render(<SpendingLimitsCard fetchError={null} />);
		expect(
			screen.getByRole("heading", { name: /spending limits/i }),
		).toBeInTheDocument();
	});
});

// ---------------------------------------------------------------------------
// #268 – Loading skeleton
// ---------------------------------------------------------------------------

describe("SpendingLimitsCardSkeleton", () => {
	it("renders animate-pulse skeleton elements", () => {
		const { container } = render(<SpendingLimitsCardSkeleton />);
		const skeletons = container.querySelectorAll(".animate-pulse");
		expect(skeletons.length).toBeGreaterThan(0);
	});

	it("has accessible status role and label", () => {
		render(<SpendingLimitsCardSkeleton />);
		expect(
			screen.getByRole("status", { name: /loading spending limits/i }),
		).toBeInTheDocument();
	});

	it("is aria-busy=true", () => {
		render(<SpendingLimitsCardSkeleton />);
		const el = screen.getByRole("status", { name: /loading spending limits/i });
		expect(el).toHaveAttribute("aria-busy", "true");
	});
});

describe("SpendingLimitsCard loading prop", () => {
	it("renders skeleton when loading=true", () => {
		const { container } = render(<SpendingLimitsCard loading />);
		const skeletons = container.querySelectorAll(".animate-pulse");
		expect(skeletons.length).toBeGreaterThan(0);
	});

	it("does not render card content when loading=true", () => {
		render(<SpendingLimitsCard loading />);
		expect(
			screen.queryByRole("heading", { name: /spending limits/i }),
		).not.toBeInTheDocument();
		expect(
			screen.queryByRole("spinbutton", { name: /daily spending limit/i }),
		).not.toBeInTheDocument();
		expect(
			screen.queryByRole("button", { name: /save settings/i }),
		).not.toBeInTheDocument();
	});

	it("renders card content when loading=false", () => {
		render(<SpendingLimitsCard loading={false} />);
		expect(
			screen.getByRole("heading", { name: /spending limits/i }),
		).toBeInTheDocument();
	});
});

// ---------------------------------------------------------------------------
// #269 – Responsive layout
// ---------------------------------------------------------------------------

describe("SpendingLimitsCard responsive layout", () => {
	it("inputs grid has responsive classes (md:grid-cols-2)", () => {
		const { container } = render(<SpendingLimitsCard />);
		const grid = container.querySelector(".grid.grid-cols-1.gap-6.md\\:grid-cols-2");
		expect(grid).toBeInTheDocument();
	});

	it("footer has responsive flex classes (sm:flex-row)", () => {
		const { container } = render(<SpendingLimitsCard />);
		const footer = container.querySelector(
			".flex.flex-col.items-stretch.gap-3.bg-zinc-50",
		);
		expect(footer).toBeInTheDocument();
		expect(footer).toHaveClass("sm:flex-row");
	});

	it("skeleton inputs grid is also responsive (md:grid-cols-2)", () => {
		const { container } = render(<SpendingLimitsCardSkeleton />);
		const grid = container.querySelector(".grid.grid-cols-1.gap-6.md\\:grid-cols-2");
		expect(grid).toBeInTheDocument();
	});

	it("Save Settings button has full-width on mobile, auto on sm+", () => {
		const { container } = render(<SpendingLimitsCard />);
		const btn = container.querySelector(".w-full.rounded-full.px-6.sm\\:ml-auto.sm\\:w-auto");
		expect(btn).toBeInTheDocument();
	});
});

// ---------------------------------------------------------------------------
// Keyboard navigation
// ---------------------------------------------------------------------------

describe("SpendingLimitsCard keyboard navigation", () => {
	beforeEach(() => {
		vi.stubGlobal("localStorage", {
			getItem: vi.fn().mockReturnValue(null),
			setItem: vi.fn(),
		});

		await user.clear(dailyInput);
		await user.type(dailyInput, "8000");

		await waitFor(() => {
			expect(consoleSpy).toHaveBeenCalledWith(
				"[Analytics] spending_limits_daily_changed",
				expect.any(Object),
			);
		});

		consoleSpy.mockRestore();
	});

	it("fires spending_limits_transaction_changed when tx input changes", async () => {
		const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});
		const user = userEvent.setup();

		render(<SpendingLimitsCard />);
		const txInput = await screen.findByRole("spinbutton", {
			name: /per-transaction limit/i,
		});

		await user.clear(txInput);
		await user.type(txInput, "2000");

		await waitFor(() => {
			expect(consoleSpy).toHaveBeenCalledWith(
				"[Analytics] spending_limits_transaction_changed",
				expect.any(Object),
			);
		});

		consoleSpy.mockRestore();
	});
});

// ---------------------------------------------------------------------------
// Keyboard navigation
// ---------------------------------------------------------------------------

	it("pressing Enter in daily limit input triggers save", async () => {
		const user = userEvent.setup();
		render(<SpendingLimitsCard />);

		const dailyInput = screen.getByRole("spinbutton", { name: /daily spending limit/i });
		await user.click(dailyInput);
		await user.keyboard("{Enter}");

		expect(localStorage.setItem).toHaveBeenCalled();
	});

	it("pressing Enter in tx limit input triggers save", async () => {
		const user = userEvent.setup();
		render(<SpendingLimitsCard />);

		const txInput = screen.getByRole("spinbutton", { name: /per-transaction limit/i });
		await user.click(txInput);
		await user.keyboard("{Enter}");

		expect(localStorage.setItem).toHaveBeenCalled();
	});

	it("pressing Escape blurs the input", async () => {
		const user = userEvent.setup();
		render(<SpendingLimitsCard />);

		const dailyInput = screen.getByRole("spinbutton", { name: /daily spending limit/i });
		await user.click(dailyInput);
		expect(dailyInput).toHaveFocus();

		await user.keyboard("{Escape}");
		expect(dailyInput).not.toHaveFocus();
	});
});

// ---------------------------------------------------------------------------
// Toast feedback
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Toast feedback
// ---------------------------------------------------------------------------

describe("SpendingLimitsCard toast feedback", () => {
	it("shows success toast after saving valid settings", async () => {
		const user = userEvent.setup();
		render(<SpendingLimitsCard />);

		await screen.findByRole("button", { name: /save settings/i });
		await user.click(screen.getByRole("button", { name: /save settings/i }));

		expect(screen.getByRole("status")).toBeInTheDocument();
		expect(screen.getByText("Success")).toBeInTheDocument();
		expect(screen.getByText(/spending limits saved/i)).toBeInTheDocument();
	});

	it("shows error toast when localStorage throws", async () => {
		vi.mocked(localStorage.setItem).mockImplementation(() => {
			throw new Error("QuotaExceededError");
		});

		const user = userEvent.setup();
		render(<SpendingLimitsCard />);

		await screen.findByRole("button", { name: /save settings/i });
		await user.click(screen.getByRole("button", { name: /save settings/i }));

		expect(screen.getByRole("status")).toBeInTheDocument();
		expect(screen.getByText("Error")).toBeInTheDocument();
		// "Failed to save" appears in both the inline error and the toast
		expect(screen.getAllByText(/failed to save/i).length).toBeGreaterThan(0);
	});

	it("toast is not visible before saving", async () => {
		render(<SpendingLimitsCard />);
		await screen.findByRole("button", { name: /save settings/i });
		expect(screen.queryByRole("status")).not.toBeInTheDocument();
	});
});

// ---------------------------------------------------------------------------
// API fallback to localStorage
// ---------------------------------------------------------------------------

describe("SpendingLimitsCard — API unavailable fallback", () => {
	it("loads limits from localStorage when API is unavailable", async () => {
		mockFetchFailure();
		vi.mocked(localStorage.getItem).mockReturnValue(
			JSON.stringify({ dailyLimit: 2000, transactionLimit: 300 }),
		);

		render(<SpendingLimitsCard />);

		await waitFor(() => {
			const dailyInput = screen.getByRole("spinbutton", {
				name: /daily spending limit/i,
			});
			expect(dailyInput).toHaveValue(2000);
		});
		await waitFor(() => {
			const txInput = screen.getByRole("spinbutton", {
				name: /per-transaction limit/i,
			});
			expect(txInput).toHaveValue(300);
		});
	});

	it("uses default values when API unavailable and no localStorage", async () => {
		mockFetchFailure();
		vi.mocked(localStorage.getItem).mockReturnValue(null);

		render(<SpendingLimitsCard />);

		// Defaults are 5000 / 1000 from useState initialization
		await waitFor(() => {
			const dailyInput = screen.getByRole("spinbutton", {
				name: /daily spending limit/i,
			});
			expect(dailyInput).toHaveValue(5000);
		});
	});
});
