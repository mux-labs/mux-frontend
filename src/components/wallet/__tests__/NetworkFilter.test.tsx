import { fireEvent, render, screen } from "@testing-library/react";
import { vi } from "vitest";
import { NetworkFilter } from "../NetworkFilter";

describe("NetworkFilter", () => {
	const mockOnNetworkChange = vi.fn();

	beforeEach(() => {
		mockOnNetworkChange.mockClear();
	});

	describe("Rendering", () => {
		it("should render all network filter buttons", () => {
			render(
				<NetworkFilter
					selectedNetwork="all"
					onNetworkChange={mockOnNetworkChange}
				/>,
			);

			expect(screen.getByText("All Networks")).toBeInTheDocument();
			expect(screen.getByText("Testnet")).toBeInTheDocument();
			expect(screen.getByText("Mainnet")).toBeInTheDocument();
		});

		it("should render with proper role and aria-label", () => {
			const { container } = render(
				<NetworkFilter
					selectedNetwork="all"
					onNetworkChange={mockOnNetworkChange}
				/>,
			);

			const group = container.querySelector('[role="group"]');
			expect(group).toHaveAttribute("aria-label", "Network filter");
		});

		it("should render buttons with proper aria-pressed attributes", () => {
			render(
				<NetworkFilter
					selectedNetwork="mainnet"
					onNetworkChange={mockOnNetworkChange}
				/>,
			);

			const mainnetButton = screen.getByLabelText("Filter by Mainnet");
			const testnetButton = screen.getByLabelText("Filter by Testnet");
			const allButton = screen.getByLabelText("Filter by All Networks");

			expect(mainnetButton).toHaveAttribute("aria-pressed", "true");
			expect(testnetButton).toHaveAttribute("aria-pressed", "false");
			expect(allButton).toHaveAttribute("aria-pressed", "false");
		});
	});

	describe("Button styling", () => {
		it("should apply default variant to unselected buttons", () => {
			render(
				<NetworkFilter
					selectedNetwork="all"
					onNetworkChange={mockOnNetworkChange}
				/>,
			);

			const testnetButton = screen.getByText("Testnet").closest("button");
			expect(testnetButton).toHaveClass("border");
		});

		it("should apply default variant to selected button", () => {
			render(
				<NetworkFilter
					selectedNetwork="mainnet"
					onNetworkChange={mockOnNetworkChange}
				/>,
			);

			const mainnetButton = screen.getByText("Mainnet").closest("button");
			expect(mainnetButton).toHaveClass("bg-primary");
		});

		it("should apply ring styling to selected button", () => {
			render(
				<NetworkFilter
					selectedNetwork="testnet"
					onNetworkChange={mockOnNetworkChange}
				/>,
			);

			const testnetButton = screen.getByText("Testnet").closest("button");
			expect(testnetButton).toHaveClass("ring-2");
		});
	});

	describe("Network selection", () => {
		it("should call onNetworkChange when All Networks is clicked", () => {
			render(
				<NetworkFilter
					selectedNetwork="mainnet"
					onNetworkChange={mockOnNetworkChange}
				/>,
			);

			const allButton = screen.getByText("All Networks");
			fireEvent.click(allButton);

			expect(mockOnNetworkChange).toHaveBeenCalledWith("all");
			expect(mockOnNetworkChange).toHaveBeenCalledTimes(1);
		});

		it("should call onNetworkChange when Testnet is clicked", () => {
			render(
				<NetworkFilter
					selectedNetwork="all"
					onNetworkChange={mockOnNetworkChange}
				/>,
			);

			const testnetButton = screen.getByText("Testnet");
			fireEvent.click(testnetButton);

			expect(mockOnNetworkChange).toHaveBeenCalledWith("testnet");
			expect(mockOnNetworkChange).toHaveBeenCalledTimes(1);
		});

		it("should call onNetworkChange when Mainnet is clicked", () => {
			render(
				<NetworkFilter
					selectedNetwork="all"
					onNetworkChange={mockOnNetworkChange}
				/>,
			);

			const mainnetButton = screen.getByText("Mainnet");
			fireEvent.click(mainnetButton);

			expect(mockOnNetworkChange).toHaveBeenCalledWith("mainnet");
			expect(mockOnNetworkChange).toHaveBeenCalledTimes(1);
		});

		it("should handle multiple network switches", () => {
			const { rerender } = render(
				<NetworkFilter
					selectedNetwork="all"
					onNetworkChange={mockOnNetworkChange}
				/>,
			);

			fireEvent.click(screen.getByText("Testnet"));
			expect(mockOnNetworkChange).toHaveBeenCalledWith("testnet");

			rerender(
				<NetworkFilter
					selectedNetwork="testnet"
					onNetworkChange={mockOnNetworkChange}
				/>,
			);

			fireEvent.click(screen.getByText("Mainnet"));
			expect(mockOnNetworkChange).toHaveBeenCalledWith("mainnet");

			expect(mockOnNetworkChange).toHaveBeenCalledTimes(2);
		});
	});

	describe("Disabled state", () => {
		it("should disable all buttons when disabled prop is true", () => {
			render(
				<NetworkFilter
					selectedNetwork="all"
					onNetworkChange={mockOnNetworkChange}
					disabled={true}
				/>,
			);

			const buttons = screen.getAllByRole("button");
			buttons.forEach((button) => {
				expect(button).toBeDisabled();
			});
		});

		it("should not call onNetworkChange when disabled and clicked", () => {
			render(
				<NetworkFilter
					selectedNetwork="all"
					onNetworkChange={mockOnNetworkChange}
					disabled={true}
				/>,
			);

			fireEvent.click(screen.getByText("Testnet"));

			expect(mockOnNetworkChange).not.toHaveBeenCalled();
		});

		it("should enable buttons when disabled prop is false", () => {
			render(
				<NetworkFilter
					selectedNetwork="all"
					onNetworkChange={mockOnNetworkChange}
					disabled={false}
				/>,
			);

			const buttons = screen.getAllByRole("button");
			buttons.forEach((button) => {
				expect(button).not.toBeDisabled();
			});
		});
	});

	describe("Custom className", () => {
		it("should apply custom className to container", () => {
			const { container } = render(
				<NetworkFilter
					selectedNetwork="all"
					onNetworkChange={mockOnNetworkChange}
					className="custom-class"
				/>,
			);

			const group = container.querySelector('[role="group"]');
			expect(group).toHaveClass("custom-class");
		});

		it("should merge custom className with default classes", () => {
			const { container } = render(
				<NetworkFilter
					selectedNetwork="all"
					onNetworkChange={mockOnNetworkChange}
					className="mt-4"
				/>,
			);

			const group = container.querySelector('[role="group"]');
			expect(group).toHaveClass("flex");
			expect(group).toHaveClass("gap-2");
			expect(group).toHaveClass("mt-4");
		});
	});

	describe("Accessibility", () => {
		it("should have proper button titles", () => {
			render(
				<NetworkFilter
					selectedNetwork="all"
					onNetworkChange={mockOnNetworkChange}
				/>,
			);

			expect(
				screen.getByTitle("Show wallets from all networks"),
			).toBeInTheDocument();
			expect(
				screen.getByTitle("Show testnet wallets only"),
			).toBeInTheDocument();
			expect(
				screen.getByTitle("Show mainnet wallets only"),
			).toBeInTheDocument();
		});

		it("should have proper aria-labels for each button", () => {
			render(
				<NetworkFilter
					selectedNetwork="all"
					onNetworkChange={mockOnNetworkChange}
				/>,
			);

			expect(
				screen.getByLabelText("Filter by All Networks"),
			).toBeInTheDocument();
			expect(screen.getByLabelText("Filter by Testnet")).toBeInTheDocument();
			expect(screen.getByLabelText("Filter by Mainnet")).toBeInTheDocument();
		});

		it("should be keyboard navigable", () => {
			render(
				<NetworkFilter
					selectedNetwork="all"
					onNetworkChange={mockOnNetworkChange}
				/>,
			);

			const testnetButton = screen.getByText("Testnet");
			testnetButton.focus();
			expect(testnetButton).toHaveFocus();

			fireEvent.keyDown(testnetButton, { key: "Enter", code: "Enter" });
			expect(mockOnNetworkChange).toHaveBeenCalled();
		});
	});

	describe("Edge cases", () => {
		it("should handle clicking already selected network", () => {
			render(
				<NetworkFilter
					selectedNetwork="mainnet"
					onNetworkChange={mockOnNetworkChange}
				/>,
			);

			fireEvent.click(screen.getByText("Mainnet"));

			expect(mockOnNetworkChange).toHaveBeenCalledWith("mainnet");
		});

		it("should handle rapid clicks", () => {
			render(
				<NetworkFilter
					selectedNetwork="all"
					onNetworkChange={mockOnNetworkChange}
				/>,
			);

			const testnetButton = screen.getByText("Testnet");
			const mainnetButton = screen.getByText("Mainnet");

			fireEvent.click(testnetButton);
			fireEvent.click(mainnetButton);
			fireEvent.click(testnetButton);

			expect(mockOnNetworkChange).toHaveBeenCalledTimes(3);
			expect(mockOnNetworkChange).toHaveBeenNthCalledWith(1, "testnet");
			expect(mockOnNetworkChange).toHaveBeenNthCalledWith(2, "mainnet");
			expect(mockOnNetworkChange).toHaveBeenNthCalledWith(3, "testnet");
		});

		it("should update selected button when selectedNetwork prop changes", () => {
			const { rerender } = render(
				<NetworkFilter
					selectedNetwork="all"
					onNetworkChange={mockOnNetworkChange}
				/>,
			);

			let allButton = screen.getByLabelText("Filter by All Networks");
			expect(allButton).toHaveAttribute("aria-pressed", "true");

			rerender(
				<NetworkFilter
					selectedNetwork="mainnet"
					onNetworkChange={mockOnNetworkChange}
				/>,
			);

			allButton = screen.getByLabelText("Filter by All Networks");
			const mainnetButton = screen.getByLabelText("Filter by Mainnet");

			expect(allButton).toHaveAttribute("aria-pressed", "false");
			expect(mainnetButton).toHaveAttribute("aria-pressed", "true");
		});
	});

	describe("Integration scenarios", () => {
		it("should handle network switching workflow", () => {
			const { rerender } = render(
				<NetworkFilter
					selectedNetwork="all"
					onNetworkChange={mockOnNetworkChange}
				/>,
			);

			// User clicks testnet
			fireEvent.click(screen.getByText("Testnet"));
			expect(mockOnNetworkChange).toHaveBeenCalledWith("testnet");

			// Component updates with new selection
			rerender(
				<NetworkFilter
					selectedNetwork="testnet"
					onNetworkChange={mockOnNetworkChange}
				/>,
			);

			const testnetButton = screen.getByLabelText("Filter by Testnet");
			expect(testnetButton).toHaveAttribute("aria-pressed", "true");

			// User clicks mainnet
			fireEvent.click(screen.getByText("Mainnet"));
			expect(mockOnNetworkChange).toHaveBeenCalledWith("mainnet");

			// Component updates with new selection
			rerender(
				<NetworkFilter
					selectedNetwork="mainnet"
					onNetworkChange={mockOnNetworkChange}
				/>,
			);

			const mainnetButton = screen.getByLabelText("Filter by Mainnet");
			expect(mainnetButton).toHaveAttribute("aria-pressed", "true");

			// User clicks all
			fireEvent.click(screen.getByText("All Networks"));
			expect(mockOnNetworkChange).toHaveBeenCalledWith("all");

			// Component updates with new selection
			rerender(
				<NetworkFilter
					selectedNetwork="all"
					onNetworkChange={mockOnNetworkChange}
				/>,
			);

			const allButton = screen.getByLabelText("Filter by All Networks");
			expect(allButton).toHaveAttribute("aria-pressed", "true");
		});
	});
});
