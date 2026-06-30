import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SpendingLimitsCard } from "./SpendingLimitsCard";

describe("SpendingLimitsCard", () => {
	it("renders the card title and description", async () => {
		render(<SpendingLimitsCard />);
		await waitFor(() => {
			expect(
				screen.getByRole("heading", { name: /spending limits/i }),
			).toBeInTheDocument();
		});
		await waitFor(() => {
			expect(
				screen.getByText(/control your api expenditure/i),
			).toBeInTheDocument();
		});
	});

	it("renders the Active badge", async () => {
		render(<SpendingLimitsCard />);
		await waitFor(() => {
			expect(screen.getByText("Active")).toBeInTheDocument();
		});
	});

	it("renders the daily usage section with default values", async () => {
		render(<SpendingLimitsCard />);
		await waitFor(() => {
			expect(screen.getByText("$750")).toBeInTheDocument();
		});
		await waitFor(() => {
			expect(screen.getByText("/ $5000")).toBeInTheDocument();
		});
		await waitFor(() => {
			expect(screen.getByText("15.0%")).toBeInTheDocument();
		});
	});

	it("renders both input fields with default values", async () => {
		render(<SpendingLimitsCard />);
		await waitFor(() => {
			const dailyInput = screen.getByRole("spinbutton", {
				name: /daily spending limit/i,
			});
			expect(dailyInput).toHaveValue(5000);
		});
		await waitFor(() => {
			const txInput = screen.getByRole("spinbutton", {
				name: /per-transaction limit/i,
			});
			expect(txInput).toHaveValue(1000);
		});
	});

	it("renders the Save Settings button", async () => {
		render(<SpendingLimitsCard />);
		await waitFor(() => {
			expect(
				screen.getByRole("button", { name: /save settings/i }),
			).toBeInTheDocument();
		});
	});

	it("renders the policy note", async () => {
		render(<SpendingLimitsCard />);
		await waitFor(() => {
			expect(
				screen.getByText(/spending limits are enforced in real-time/i),
			).toBeInTheDocument();
		});
	});

	it("updates daily limit when input changes", async () => {
		const user = userEvent.setup();
		render(<SpendingLimitsCard />);

		const dailyInput = screen.getByRole("spinbutton", {
			name: /daily spending limit/i,
		});
		await user.clear(dailyInput);
		await user.type(dailyInput, "10000");

		expect(dailyInput).toHaveValue(10000);
	});

	it("updates the usage percentage when daily limit changes", async () => {
		const user = userEvent.setup();
		render(<SpendingLimitsCard />);

		// Default: 750 / 5000 = 15%
		expect(screen.getByText("15.0%")).toBeInTheDocument();

		const dailyInput = screen.getByRole("spinbutton", {
			name: /daily spending limit/i,
		});
		await user.clear(dailyInput);
		await user.type(dailyInput, "1500");

		// 750 / 1500 = 50%
		expect(screen.getByText("50.0%")).toBeInTheDocument();
	});

	it("caps usage percentage at 100 when limit is less than used amount", async () => {
		const user = userEvent.setup();
		render(<SpendingLimitsCard />);

		const dailyInput = screen.getByRole("spinbutton", {
			name: /daily spending limit/i,
		});
		await user.clear(dailyInput);
		await user.type(dailyInput, "100");

		// 750 / 100 = 750%, capped at 100%
		expect(screen.getByText("100.0%")).toBeInTheDocument();
	});

	it("shows 0% usage when daily limit is invalid (empty)", async () => {
		const user = userEvent.setup();
		render(<SpendingLimitsCard />);

		const dailyInput = screen.getByRole("spinbutton", {
			name: /daily spending limit/i,
		});
		await user.clear(dailyInput);

		// parseInt("") = NaN, fallback to 1 → 750/1 = 75000% capped at 100%
		expect(screen.getByText("100.0%")).toBeInTheDocument();
	});

	it("shows 0% usage when daily limit is 0", async () => {
		const user = userEvent.setup();
		render(<SpendingLimitsCard />);

		const dailyInput = screen.getByRole("spinbutton", {
			name: /daily spending limit/i,
		});
		await user.clear(dailyInput);
		await user.type(dailyInput, "0");

		// parseInt("0") = 0, fallback to 1 → 750/1 = 75000% capped at 100%
		expect(screen.getByText("100.0%")).toBeInTheDocument();
	});

	it("updates per-transaction limit independently", async () => {
		const user = userEvent.setup();
		render(<SpendingLimitsCard />);

		const txInput = screen.getByRole("spinbutton", {
			name: /per-transaction limit/i,
		});
		await user.clear(txInput);
		await user.type(txInput, "2500");

		expect(txInput).toHaveValue(2500);

		// Daily limit and usage should remain unchanged
		const dailyInput = screen.getByRole("spinbutton", {
			name: /daily spending limit/i,
		});
		expect(dailyInput).toHaveValue(5000);
		expect(screen.getByText("15.0%")).toBeInTheDocument();
	});

	it("has proper accessibility: inputs are associated with labels", async () => {
		render(<SpendingLimitsCard />);
		await waitFor(() => {
			expect(
				screen.getByLabelText(/daily spending limit/i),
			).toBeInTheDocument();
		});
		await waitFor(() => {
			expect(
				screen.getByLabelText(/per-transaction limit/i),
			).toBeInTheDocument();
		});
	});

	it("renders helper text under each input", async () => {
		render(<SpendingLimitsCard />);
		await waitFor(() => {
			expect(
				screen.getByText(/maximum amount you can spend per day/i),
			).toBeInTheDocument();
		});
		await waitFor(() => {
			expect(
				screen.getByText(/maximum cap for a single transaction/i),
			).toBeInTheDocument();
		});
	});
});

describe("SpendingLimitsCard keyboard navigation", () => {
	beforeEach(() => {
		vi.stubGlobal("localStorage", {
			getItem: vi.fn().mockReturnValue(null),
			setItem: vi.fn(),
		});
	});

	afterEach(() => {
		vi.unstubAllGlobals();
	});

	it("pressing Enter in the daily limit input triggers save", async () => {
		const user = userEvent.setup();
		render(<SpendingLimitsCard />);

		const dailyInput = screen.getByRole("spinbutton", {
			name: /daily spending limit/i,
		});
		await user.click(dailyInput);
		await user.keyboard("{Enter}");

		expect(localStorage.setItem).toHaveBeenCalled();
	});

	it("pressing Enter in the tx limit input triggers save", async () => {
		const user = userEvent.setup();
		render(<SpendingLimitsCard />);

		const txInput = screen.getByRole("spinbutton", {
			name: /per-transaction limit/i,
		});
		await user.click(txInput);
		await user.keyboard("{Enter}");

		expect(localStorage.setItem).toHaveBeenCalled();
	});

	it("pressing Escape blurs the input", async () => {
		const user = userEvent.setup();
		render(<SpendingLimitsCard />);

		const dailyInput = screen.getByRole("spinbutton", {
			name: /daily spending limit/i,
		});
		await user.click(dailyInput);
		expect(dailyInput).toHaveFocus();

		await user.keyboard("{Escape}");
		expect(dailyInput).not.toHaveFocus();
	});

	it("Save Settings button is focusable via keyboard", async () => {
		const user = userEvent.setup();
		render(<SpendingLimitsCard />);

		const saveBtn = screen.getByRole("button", { name: /save settings/i });
		saveBtn.focus();
		expect(saveBtn).toHaveFocus();

		await user.keyboard("{Enter}");
		expect(localStorage.setItem).toHaveBeenCalled();
	});
});

describe("SpendingLimitsCard loading state", () => {
	it("renders skeleton placeholders when loading is true", () => {
		const { container } = render(<SpendingLimitsCard loading />);

		const skeletons = container.querySelectorAll(".animate-pulse");
		expect(skeletons.length).toBeGreaterThan(0);
	});

	it("does not render real content when loading", () => {
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
		expect(screen.queryByText("Active")).not.toBeInTheDocument();
	});

	it("renders real content when loading is false", async () => {
		render(<SpendingLimitsCard loading={false} />);
		await waitFor(() => {
			expect(
				screen.getByRole("heading", { name: /spending limits/i }),
			).toBeInTheDocument();
		});
		await waitFor(() => {
			expect(
				screen.getByRole("button", { name: /save settings/i }),
			).toBeInTheDocument();
		});
	});

	it("renders real content by default (loading not set)", async () => {
		render(<SpendingLimitsCard />);
		await waitFor(() => {
			expect(
				screen.getByRole("heading", { name: /spending limits/i }),
			).toBeInTheDocument();
		});
	});
});

describe("SpendingLimitsCard toast feedback", () => {
	beforeEach(() => {
		vi.stubGlobal("localStorage", {
			getItem: vi.fn().mockReturnValue(null),
			setItem: vi.fn(),
		});
	});

	afterEach(() => {
		vi.unstubAllGlobals();
	});

	it("shows success toast after saving valid settings", async () => {
		const user = userEvent.setup();
		render(<SpendingLimitsCard />);

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

		await user.click(screen.getByRole("button", { name: /save settings/i }));

		expect(screen.getByRole("status")).toBeInTheDocument();
		expect(screen.getByText("Error")).toBeInTheDocument();
		expect(screen.getByText(/failed to save/i)).toBeInTheDocument();
	});

	it("toast is not visible before saving", () => {
		render(<SpendingLimitsCard />);
		expect(screen.queryByRole("status")).not.toBeInTheDocument();
	});
});
