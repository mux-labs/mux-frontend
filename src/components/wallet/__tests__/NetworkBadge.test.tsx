import { render, screen } from "@testing-library/react";
import type { WalletNetwork } from "@/types/wallet";
import { NetworkBadge } from "../NetworkBadge";

describe("NetworkBadge", () => {
	describe("Rendering", () => {
		it("should render testnet badge with correct label", () => {
			render(<NetworkBadge network="testnet" />);
			const badge = screen.getByText("Testnet");
			expect(badge).toBeInTheDocument();
		});

		it("should render mainnet badge with correct label", () => {
			render(<NetworkBadge network="mainnet" />);
			const badge = screen.getByText("Mainnet");
			expect(badge).toBeInTheDocument();
		});

		it("should render as a span element", () => {
			const { container } = render(<NetworkBadge network="testnet" />);
			const badge = container.querySelector("span");
			expect(badge).toBeInTheDocument();
		});
	});

	describe("Styling", () => {
		it("should apply testnet styles", () => {
			const { container } = render(<NetworkBadge network="testnet" />);
			const badge = container.querySelector("span");
			expect(badge).toHaveClass("bg-amber-100");
			expect(badge).toHaveClass("text-amber-800");
			expect(badge).toHaveClass("border-amber-200");
		});

		it("should apply mainnet styles", () => {
			const { container } = render(<NetworkBadge network="mainnet" />);
			const badge = container.querySelector("span");
			expect(badge).toHaveClass("bg-blue-100");
			expect(badge).toHaveClass("text-blue-800");
			expect(badge).toHaveClass("border-blue-200");
		});

		it("should apply dark mode styles for testnet", () => {
			const { container } = render(<NetworkBadge network="testnet" />);
			const badge = container.querySelector("span");
			expect(badge).toHaveClass("dark:bg-amber-900/30");
			expect(badge).toHaveClass("dark:text-amber-400");
			expect(badge).toHaveClass("dark:border-amber-800");
		});

		it("should apply dark mode styles for mainnet", () => {
			const { container } = render(<NetworkBadge network="mainnet" />);
			const badge = container.querySelector("span");
			expect(badge).toHaveClass("dark:bg-blue-900/30");
			expect(badge).toHaveClass("dark:text-blue-400");
			expect(badge).toHaveClass("dark:border-blue-800");
		});

		it("should apply outline variant styles", () => {
			const { container } = render(<NetworkBadge network="testnet" />);
			const badge = container.querySelector("span");
			expect(badge).toHaveClass("border");
		});

		it("should apply hover styles", () => {
			const { container } = render(<NetworkBadge network="testnet" />);
			const badge = container.querySelector("span");
			expect(badge).toHaveClass("hover:bg-amber-100");
		});
	});

	describe("Custom className", () => {
		it("should merge custom className with default styles", () => {
			const { container } = render(
				<NetworkBadge network="testnet" className="custom-class" />,
			);
			const badge = container.querySelector("span");
			expect(badge).toHaveClass("custom-class");
			expect(badge).toHaveClass("bg-amber-100");
		});

		it("should allow overriding styles with custom className", () => {
			const { container } = render(
				<NetworkBadge network="testnet" className="text-red-500" />,
			);
			const badge = container.querySelector("span");
			expect(badge).toHaveClass("text-red-500");
		});

		it("should handle multiple custom classes", () => {
			const { container } = render(
				<NetworkBadge network="mainnet" className="px-4 py-2 text-lg" />,
			);
			const badge = container.querySelector("span");
			expect(badge).toHaveClass("px-4");
			expect(badge).toHaveClass("py-2");
			expect(badge).toHaveClass("text-lg");
		});
	});

	describe("Props validation", () => {
		it("should accept all valid network types", () => {
			const networks: WalletNetwork[] = ["testnet", "mainnet"];

			networks.forEach((network) => {
				const { container } = render(<NetworkBadge network={network} />);
				const badge = container.querySelector("span");
				expect(badge).toBeInTheDocument();
			});
		});

		it("should handle optional className prop", () => {
			const { container: container1 } = render(
				<NetworkBadge network="testnet" />,
			);
			const { container: container2 } = render(
				<NetworkBadge network="testnet" className="extra" />,
			);

			expect(container1.querySelector("span")).toBeInTheDocument();
			expect(container2.querySelector("span")).toBeInTheDocument();
		});
	});

	describe("Accessibility", () => {
		it("should have proper semantic structure", () => {
			const { container } = render(<NetworkBadge network="testnet" />);
			const badge = container.querySelector("span");
			expect(badge).toHaveAttribute("data-slot", "badge");
		});

		it("should have readable text content", () => {
			render(<NetworkBadge network="testnet" />);
			expect(screen.getByText("Testnet")).toBeVisible();
		});

		it("should maintain text contrast with color classes", () => {
			const { container } = render(<NetworkBadge network="mainnet" />);
			const badge = container.querySelector("span");
			// Verify that both text color and background are applied
			expect(badge).toHaveClass("text-blue-800");
			expect(badge).toHaveClass("bg-blue-100");
		});
	});

	describe("Edge cases", () => {
		it("should handle rapid re-renders", () => {
			const { rerender } = render(<NetworkBadge network="testnet" />);
			expect(screen.getByText("Testnet")).toBeInTheDocument();

			rerender(<NetworkBadge network="mainnet" />);
			expect(screen.getByText("Mainnet")).toBeInTheDocument();

			rerender(<NetworkBadge network="testnet" />);
			expect(screen.getByText("Testnet")).toBeInTheDocument();
		});

		it("should handle network switching", () => {
			const { rerender } = render(<NetworkBadge network="testnet" />);
			let badge = screen.getByText("Testnet").parentElement;
			expect(badge).toHaveClass("bg-amber-100");

			rerender(<NetworkBadge network="mainnet" />);
			badge = screen.getByText("Mainnet").parentElement;
			expect(badge).toHaveClass("bg-blue-100");
		});

		it("should handle className changes", () => {
			const { rerender, container } = render(
				<NetworkBadge network="testnet" className="class1" />,
			);
			let badge = container.querySelector("span");
			expect(badge).toHaveClass("class1");

			rerender(<NetworkBadge network="testnet" className="class2" />);
			badge = container.querySelector("span");
			expect(badge).toHaveClass("class2");
		});
	});

	describe("Integration with Badge component", () => {
		it("should use Badge component with outline variant", () => {
			const { container } = render(<NetworkBadge network="testnet" />);
			const badge = container.querySelector("span");
			// Badge outline variant applies border
			expect(badge).toHaveClass("border");
		});

		it("should inherit Badge base styles", () => {
			const { container } = render(<NetworkBadge network="mainnet" />);
			const badge = container.querySelector("span");
			// Badge base styles
			expect(badge).toHaveClass("inline-flex");
			expect(badge).toHaveClass("items-center");
			expect(badge).toHaveClass("rounded-full");
		});
	});

	describe("Invalid / unknown network values", () => {
		it("defaults to mainnet label for unrecognised network value", () => {
			// Cast to bypass TS since real-world data may be untrusted
			render(<NetworkBadge network={"unknown" as never} />);
			expect(screen.getByText("Mainnet")).toBeInTheDocument();
		});

		it("defaults to mainnet styles for unrecognised network value", () => {
			const { container } = render(<NetworkBadge network={"" as never} />);
			const badge = container.querySelector("span");
			expect(badge).toHaveClass("bg-blue-100");
			expect(badge).toHaveClass("text-blue-800");
		});
	});
});
