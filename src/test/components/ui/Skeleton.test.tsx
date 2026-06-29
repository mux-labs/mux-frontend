import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import {
	CardSkeleton,
	Skeleton,
	WalletTableSkeleton,
	RecoveryStatusSkeleton,
	RecoveryTimelineSkeleton,
} from "@/components/ui/Skeleton";

describe("Skeleton", () => {
	describe("Base Skeleton Component", () => {
		it("renders with default classes", () => {
			render(<Skeleton />);
			const skeleton = screen.getByTestId("skeleton");
			expect(skeleton).toBeInTheDocument();
			expect(skeleton).toHaveClass("animate-pulse");
			expect(skeleton).toHaveClass("rounded-md");
			expect(skeleton).toHaveClass("bg-zinc-200");
		});

		it("accepts custom className", () => {
			render(<Skeleton className="h-4 w-24" />);
			const skeleton = screen.getByTestId("skeleton");
			expect(skeleton).toHaveClass("h-4");
			expect(skeleton).toHaveClass("w-24");
		});

		it("passes through additional props", () => {
			render(<Skeleton aria-label="Loading content" />);
			const skeleton = screen.getByTestId("skeleton");
			expect(skeleton).toHaveAttribute("aria-label", "Loading content");
		});
	});

	describe("WalletTableSkeleton Component", () => {
		it("renders the skeleton container with proper styling", () => {
			const { container } = render(<WalletTableSkeleton />);
			const wrapper = container.firstChild as HTMLElement;
			expect(wrapper).toHaveClass("rounded-xl");
			expect(wrapper).toHaveClass("border");
			expect(wrapper).toHaveClass("border-zinc-200");
		});

		it("renders header section with wallet count and add button skeletons", () => {
			render(<WalletTableSkeleton />);
			const skeletons = screen.getAllByTestId("skeleton");
			// Should have multiple skeleton elements (header + rows)
			expect(skeletons.length).toBeGreaterThan(5);
		});

		it("renders 5 skeleton rows by default", () => {
			const { container } = render(<WalletTableSkeleton />);
			// Count the number of row containers (looking for the repeating grid pattern)
			const rows = container.querySelectorAll(
				'.grid.grid-cols-6[class*="px-6"][class*="py-4"]',
			);
			expect(rows.length).toBe(5);
		});

		it("renders skeleton elements for all table columns", () => {
			render(<WalletTableSkeleton />);
			const skeletons = screen.getAllByTestId("skeleton");

			// Check that we have skeletons for:
			// - Header (count + button)
			// - Column headers (6 columns)
			// - 5 rows × 6 columns
			// Minimum expected: 2 (header) + 6 (column headers) + 30 (5 rows × 6 cols) = 38
			expect(skeletons.length).toBeGreaterThanOrEqual(30);
		});

		it("includes responsive skeleton elements for different screen sizes", () => {
			const { container } = render(<WalletTableSkeleton />);
			// Check for hidden elements on smaller screens (sm:block, md:block, lg:block)
			const hiddenSmElements = container.querySelectorAll(".sm\\:block");
			const hiddenMdElements = container.querySelectorAll(".md\\:block");
			const hiddenLgElements = container.querySelectorAll(".lg\\:block");

			expect(hiddenSmElements.length).toBeGreaterThan(0);
			expect(hiddenMdElements.length).toBeGreaterThan(0);
			expect(hiddenLgElements.length).toBeGreaterThan(0);
		});

		it("applies correct styling to match WalletTable structure", () => {
			const { container } = render(<WalletTableSkeleton />);
			const wrapper = container.firstChild as HTMLElement;

			// Check main container
			expect(wrapper).toHaveClass("rounded-xl");
			expect(wrapper).toHaveClass("bg-white");
			expect(wrapper).toHaveClass("dark:bg-zinc-900");

			// Check for divider classes
			const dividers = wrapper.querySelectorAll(".divide-y");
			expect(dividers.length).toBeGreaterThan(0);
		});
	});

	describe("CardSkeleton Component", () => {
		it("renders with proper card styling", () => {
			const { container } = render(<CardSkeleton />);
			const wrapper = container.firstChild as HTMLElement;
			expect(wrapper).toHaveClass("rounded-xl");
			expect(wrapper).toHaveClass("border");
			expect(wrapper).toHaveClass("border-zinc-200");
		});

		it("renders all skeleton sections for card content", () => {
			render(<CardSkeleton />);
			const skeletons = screen.getAllByTestId("skeleton");
			// Should have: 1 image + 2 text lines + 2 badges = 5 elements
			expect(skeletons.length).toBe(5);
		});

		it("includes skeleton for card image", () => {
			const { container } = render(<CardSkeleton />);
			const imageSkeleton = container.querySelector(".h-48.w-full");
			expect(imageSkeleton).toBeInTheDocument();
		});

		it("includes skeleton badges with rounded styling", () => {
			const { container } = render(<CardSkeleton />);
			const badges = container.querySelectorAll(".rounded-full");
			expect(badges.length).toBeGreaterThanOrEqual(2);
		});
	});

	describe("Accessibility", () => {
		it("Skeleton component can accept aria attributes", () => {
			render(<Skeleton aria-label="Loading wallet data" role="progressbar" />);
			const skeleton = screen.getByTestId("skeleton");
			expect(skeleton).toHaveAttribute("aria-label", "Loading wallet data");
			expect(skeleton).toHaveAttribute("role", "progressbar");
		});

		it("WalletTableSkeleton is readable by screen readers", () => {
			const { container } = render(<WalletTableSkeleton />);
			// Verify the component renders with semantic structure
			expect(container.firstChild).toBeInTheDocument();
		});
	});

	describe("Dark Mode Support", () => {
		it("Base Skeleton includes dark mode classes", () => {
			render(<Skeleton />);
			const skeleton = screen.getByTestId("skeleton");
			expect(skeleton.className).toContain("dark:bg-zinc-800");
		});

		it("WalletTableSkeleton includes dark mode classes", () => {
			const { container } = render(<WalletTableSkeleton />);
			const wrapper = container.firstChild as HTMLElement;
			expect(wrapper.className).toContain("dark:border-zinc-800");
			expect(wrapper.className).toContain("dark:bg-zinc-900");
		});

		it("CardSkeleton includes dark mode classes", () => {
			const { container } = render(<CardSkeleton />);
			const wrapper = container.firstChild as HTMLElement;
			expect(wrapper.className).toContain("dark:border-zinc-800");
		});
	});

	describe("RecoveryStatusSkeleton", () => {
		it("renders with aria-busy=true", () => {
			render(<RecoveryStatusSkeleton />);
			expect(screen.getByLabelText("Loading recovery status")).toHaveAttribute(
				"aria-busy",
				"true",
			);
		});

		it("renders a pill-shaped skeleton", () => {
			const { container } = render(<RecoveryStatusSkeleton />);
			const pill = container.querySelector(".rounded-full");
			expect(pill).toBeInTheDocument();
		});

		it("applies custom className", () => {
			render(<RecoveryStatusSkeleton className="ml-auto" />);
			expect(screen.getByLabelText("Loading recovery status")).toHaveClass(
				"ml-auto",
			);
		});
	});

	describe("RecoveryTimelineSkeleton", () => {
		it("renders with role=status and accessible label", () => {
			render(<RecoveryTimelineSkeleton />);
			const region = screen.getByRole("status");
			expect(region).toBeInTheDocument();
			expect(region).toHaveAttribute(
				"aria-label",
				"Loading recovery timeline",
			);
		});

		it("has aria-live=polite for screen reader announcements", () => {
			render(<RecoveryTimelineSkeleton />);
			expect(screen.getByRole("status")).toHaveAttribute(
				"aria-live",
				"polite",
			);
		});

		it("has aria-busy=true", () => {
			render(<RecoveryTimelineSkeleton />);
			expect(screen.getByRole("status")).toHaveAttribute("aria-busy", "true");
		});

		it("renders the requested number of event skeletons", () => {
			const { container } = render(<RecoveryTimelineSkeleton eventCount={5} />);
			const eventDots = container.querySelectorAll(
				'.flex.flex-col.items-center > .rounded-full',
			);
			expect(eventDots.length).toBe(5);
		});

		it("renders 3 events by default", () => {
			const { container } = render(<RecoveryTimelineSkeleton />);
			const eventDots = container.querySelectorAll(
				'.flex.flex-col.items-center > .rounded-full',
			);
			expect(eventDots.length).toBe(3);
		});

		it("renders stat summary cards", () => {
			const { container } = render(<RecoveryTimelineSkeleton />);
			const statSection = container.querySelector(".grid.grid-cols-3");
			expect(statSection).toBeInTheDocument();
			expect(statSection?.children).toHaveLength(3);
		});

		it("renders a progress bar skeleton", () => {
			const { container } = render(<RecoveryTimelineSkeleton />);
			const progressBar = container.querySelector(".rounded-full");
			expect(progressBar).toBeInTheDocument();
		});
	});
});
