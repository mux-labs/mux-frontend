import { render, screen } from "@testing-library/react";
import type { WalletStatus } from "@/types/wallet";
import { StatusIndicator } from "../StatusIndicator";

describe("StatusIndicator", () => {
	describe("Rendering", () => {
		it("should render active status badge", () => {
			render(<StatusIndicator status="active" />);
			expect(screen.getByText("Active")).toBeInTheDocument();
		});

		it("should render pending status badge", () => {
			render(<StatusIndicator status="pending" />);
			expect(screen.getByText("Pending")).toBeInTheDocument();
		});

		it("should render inactive status badge", () => {
			render(<StatusIndicator status="inactive" />);
			expect(screen.getByText("Inactive")).toBeInTheDocument();
		});

		it("should render status dot indicator", () => {
			const { container } = render(<StatusIndicator status="active" />);
			const dot = container.querySelector(".rounded-full");
			expect(dot).toBeInTheDocument();
		});
	});

	describe("Styling by status", () => {
		it("should apply active status styles", () => {
			const { container } = render(<StatusIndicator status="active" />);
			const badge = container.querySelector("span");
			expect(badge).toHaveClass("bg-green-50");
			expect(badge).toHaveClass("text-green-700");
			expect(badge).toHaveClass("border-green-200");
		});

		it("should apply pending status styles", () => {
			const { container } = render(<StatusIndicator status="pending" />);
			const badge = container.querySelector("span");
			expect(badge).toHaveClass("bg-yellow-50");
			expect(badge).toHaveClass("text-yellow-700");
			expect(badge).toHaveClass("border-yellow-200");
		});

		it("should apply inactive status styles", () => {
			const { container } = render(<StatusIndicator status="inactive" />);
			const badge = container.querySelector("span");
			expect(badge).toHaveClass("bg-zinc-100");
			expect(badge).toHaveClass("text-zinc-600");
			expect(badge).toHaveClass("border-zinc-200");
		});

		it("should apply dark mode styles for active", () => {
			const { container } = render(<StatusIndicator status="active" />);
			const badge = container.querySelector("span");
			expect(badge).toHaveClass("dark:bg-green-900/20");
			expect(badge).toHaveClass("dark:text-green-400");
			expect(badge).toHaveClass("dark:border-green-800");
		});

		it("should apply dark mode styles for pending", () => {
			const { container } = render(<StatusIndicator status="pending" />);
			const badge = container.querySelector("span");
			expect(badge).toHaveClass("dark:bg-yellow-900/20");
			expect(badge).toHaveClass("dark:text-yellow-400");
			expect(badge).toHaveClass("dark:border-yellow-800");
		});

		it("should apply dark mode styles for inactive", () => {
			const { container } = render(<StatusIndicator status="inactive" />);
			const badge = container.querySelector("span");
			expect(badge).toHaveClass("dark:bg-zinc-800");
			expect(badge).toHaveClass("dark:text-zinc-400");
			expect(badge).toHaveClass("dark:border-zinc-700");
		});
	});

	describe("Dot indicator styling", () => {
		it("should apply green dot for active status", () => {
			const { container } = render(<StatusIndicator status="active" />);
			const dot = container.querySelector(".bg-green-500");
			expect(dot).toBeInTheDocument();
		});

		it("should apply yellow dot for pending status", () => {
			const { container } = render(<StatusIndicator status="pending" />);
			const dot = container.querySelector(".bg-yellow-500");
			expect(dot).toBeInTheDocument();
		});

		it("should apply pulse animation for pending status", () => {
			const { container } = render(<StatusIndicator status="pending" />);
			const dot = container.querySelector(".animate-pulse");
			expect(dot).toBeInTheDocument();
		});

		it("should apply zinc dot for inactive status", () => {
			const { container } = render(<StatusIndicator status="inactive" />);
			const dot = container.querySelector(".bg-zinc-400");
			expect(dot).toBeInTheDocument();
		});

		it("should have correct dot dimensions", () => {
			const { container } = render(<StatusIndicator status="active" />);
			const dot = container.querySelector(".rounded-full");
			expect(dot).toHaveClass("h-2");
			expect(dot).toHaveClass("w-2");
		});
	});

	describe("Custom className", () => {
		it("should merge custom className with default styles", () => {
			const { container } = render(
				<StatusIndicator status="active" className="custom-class" />,
			);
			const badge = container.querySelector("span");
			expect(badge).toHaveClass("custom-class");
			expect(badge).toHaveClass("bg-green-50");
		});

		it("should allow overriding styles with custom className", () => {
			const { container } = render(
				<StatusIndicator status="active" className="text-red-500" />,
			);
			const badge = container.querySelector("span");
			expect(badge).toHaveClass("text-red-500");
		});
	});

	describe("Props validation", () => {
		it("should accept all valid status types", () => {
			const statuses: WalletStatus[] = ["active", "pending", "inactive"];

			statuses.forEach((status) => {
				const { container } = render(<StatusIndicator status={status} />);
				const badge = container.querySelector("span");
				expect(badge).toBeInTheDocument();
			});
		});

		it("should handle optional className prop", () => {
			const { container: container1 } = render(
				<StatusIndicator status="active" />,
			);
			const { container: container2 } = render(
				<StatusIndicator status="active" className="extra" />,
			);

			expect(container1.querySelector("span")).toBeInTheDocument();
			expect(container2.querySelector("span")).toBeInTheDocument();
		});
	});

	describe("Accessibility", () => {
		it("should have proper semantic structure", () => {
			const { container } = render(<StatusIndicator status="active" />);
			const badge = container.querySelector("span");
			expect(badge).toHaveAttribute("data-slot", "badge");
		});

		it("should have readable status text", () => {
			render(<StatusIndicator status="pending" />);
			expect(screen.getByText("Pending")).toBeVisible();
		});

		it("should maintain text contrast", () => {
			const { container } = render(<StatusIndicator status="active" />);
			const badge = container.querySelector("span");
			expect(badge).toHaveClass("text-green-700");
			expect(badge).toHaveClass("bg-green-50");
		});
	});

	describe("Edge cases", () => {
		it("should handle rapid status changes", () => {
			const { rerender } = render(<StatusIndicator status="active" />);
			expect(screen.getByText("Active")).toBeInTheDocument();

			rerender(<StatusIndicator status="pending" />);
			expect(screen.getByText("Pending")).toBeInTheDocument();

			rerender(<StatusIndicator status="inactive" />);
			expect(screen.getByText("Inactive")).toBeInTheDocument();

			rerender(<StatusIndicator status="active" />);
			expect(screen.getByText("Active")).toBeInTheDocument();
		});

		it("should handle status switching with style updates", () => {
			const { rerender, container } = render(
				<StatusIndicator status="active" />,
			);
			let badge = container.querySelector("span");
			expect(badge).toHaveClass("bg-green-50");

			rerender(<StatusIndicator status="pending" />);
			badge = container.querySelector("span");
			expect(badge).toHaveClass("bg-yellow-50");

			rerender(<StatusIndicator status="inactive" />);
			badge = container.querySelector("span");
			expect(badge).toHaveClass("bg-zinc-100");
		});

		it("should handle className changes", () => {
			const { rerender, container } = render(
				<StatusIndicator status="active" className="class1" />,
			);
			let badge = container.querySelector("span");
			expect(badge).toHaveClass("class1");

			rerender(<StatusIndicator status="active" className="class2" />);
			badge = container.querySelector("span");
			expect(badge).toHaveClass("class2");
		});
	});

	describe("Integration with Badge component", () => {
		it("should use Badge component with outline variant", () => {
			const { container } = render(<StatusIndicator status="active" />);
			const badge = container.querySelector("span");
			expect(badge).toHaveClass("border");
		});

		it("should inherit Badge base styles", () => {
			const { container } = render(<StatusIndicator status="pending" />);
			const badge = container.querySelector("span");
			expect(badge).toHaveClass("inline-flex");
			expect(badge).toHaveClass("items-center");
			expect(badge).toHaveClass("rounded-full");
		});

		it("should display dot and text together", () => {
			const { container } = render(<StatusIndicator status="active" />);
			const badge = container.querySelector("span");
			const dot = badge?.querySelector(".rounded-full");
			const text = screen.getByText("Active");

			expect(dot).toBeInTheDocument();
			expect(text).toBeInTheDocument();
		});
	});

	describe("Invalid / unknown status values", () => {
		it("defaults to 'Inactive' label for unrecognised status", () => {
			render(<StatusIndicator status={"broken" as never} />);
			expect(screen.getByText("Inactive")).toBeInTheDocument();
		});

		it("defaults to inactive styles for unrecognised status", () => {
			const { container } = render(<StatusIndicator status={"" as never} />);
			const badge = container.querySelector("span");
			expect(badge).toHaveClass("bg-zinc-100");
			expect(badge).toHaveClass("text-zinc-600");
		});

		it("does not show pulse animation for unknown status", () => {
			const { container } = render(
				<StatusIndicator status={"broken" as never} />,
			);
			const dot = container.querySelector(".animate-pulse");
			expect(dot).not.toBeInTheDocument();
		});
	});
});
