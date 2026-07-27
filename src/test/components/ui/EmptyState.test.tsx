import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { EmptyState } from "@/components/ui/EmptyState";

describe("EmptyState", () => {
	it("renders the title", () => {
		render(
			<EmptyState
				title="No wallets found"
				description="Add your first wallet."
			/>,
		);
		expect(screen.getByText("No wallets found")).toBeInTheDocument();
	});

	it("renders the description", () => {
		render(
			<EmptyState
				title="No wallets found"
				description="Add your first wallet to start tracking."
			/>,
		);
		expect(
			screen.getByText("Add your first wallet to start tracking."),
		).toBeInTheDocument();
	});

	it("renders the action button when action prop is provided", () => {
		render(
			<EmptyState
				title="No wallets"
				description="Empty."
				action={{ label: "Add Wallet", onClick: vi.fn() }}
			/>,
		);
		expect(
			screen.getByRole("button", { name: "Add Wallet" }),
		).toBeInTheDocument();
	});

	it("does NOT render a button when action prop is omitted", () => {
		render(<EmptyState title="No wallets" description="Empty." />);
		expect(screen.queryByRole("button")).not.toBeInTheDocument();
	});

	it("calls action.onClick when the button is clicked", async () => {
		const user = userEvent.setup();
		const onClick = vi.fn();
		render(
			<EmptyState
				title="No wallets"
				description="Empty."
				action={{ label: "Add Wallet", onClick }}
			/>,
		);
		await user.click(screen.getByRole("button", { name: "Add Wallet" }));
		expect(onClick).toHaveBeenCalledTimes(1);
	});

	it("renders a custom icon when provided", () => {
		render(
			<EmptyState
				title="No wallets"
				description="Empty."
				icon={<span data-testid="custom-icon">🪙</span>}
			/>,
		);
		expect(screen.getByTestId("custom-icon")).toBeInTheDocument();
	});

	it("renders the default SVG icon when no icon prop is provided", () => {
		const { container } = render(
			<EmptyState title="No wallets" description="Empty." />,
		);
		expect(container.querySelector("svg")).toBeInTheDocument();
	});

	it("does not render the default icon when a custom icon is given", () => {
		const { container } = render(
			<EmptyState
				title="No wallets"
				description="Empty."
				icon={<span data-testid="custom-icon">🪙</span>}
			/>,
		);
		expect(container.querySelectorAll("svg")).toHaveLength(0);
	});

	it("renders long titles and descriptions without truncating the text content", () => {
		const longTitle =
			"No wallets match your current search and filter combination";
		const longDescription =
			"Try broadening your search terms, clearing the network filter, or removing the status filter to see more results.";
		render(<EmptyState title={longTitle} description={longDescription} />);
		expect(screen.getByText(longTitle)).toBeInTheDocument();
		expect(screen.getByText(longDescription)).toBeInTheDocument();
	});

	it("only calls onClick once per click, not on every render", async () => {
		const user = userEvent.setup();
		const onClick = vi.fn();
		const { rerender } = render(
			<EmptyState
				title="No wallets"
				description="Empty."
				action={{ label: "Add Wallet", onClick }}
			/>,
		);
		rerender(
			<EmptyState
				title="No wallets"
				description="Empty."
				action={{ label: "Add Wallet", onClick }}
			/>,
		);
		await user.click(screen.getByRole("button", { name: "Add Wallet" }));
		expect(onClick).toHaveBeenCalledTimes(1);
	});

	it("renders inside a dark-mode wrapper without losing its content", () => {
		render(
			<div className="dark bg-zinc-950">
				<EmptyState title="No wallets found" description="Empty." />
			</div>,
		);
		expect(screen.getByText("No wallets found")).toBeInTheDocument();
	});
});
