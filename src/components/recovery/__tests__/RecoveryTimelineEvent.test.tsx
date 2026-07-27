import { fireEvent, render, screen } from "@testing-library/react";
import { vi } from "vitest";
import type { RecoveryTimelineEvent as RecoveryTimelineEventType } from "@/types/recovery";
import { RecoveryTimelineEvent } from "../RecoveryTimelineEvent";

describe("RecoveryTimelineEvent", () => {
	const mockEvent: RecoveryTimelineEventType = {
		id: "event-001",
		type: "initiated",
		status: "completed",
		title: "Recovery Initiated",
		description: "Wallet recovery process started",
		timestamp: new Date("2025-01-20T10:00:00Z"),
		details: "User initiated recovery from device loss",
	};

	const mockOnClick = vi.fn();

	beforeEach(() => {
		mockOnClick.mockClear();
	});

	describe("Rendering", () => {
		it("should render event title", () => {
			render(<RecoveryTimelineEvent event={mockEvent} onClick={mockOnClick} />);

			expect(screen.getByText("Recovery Initiated")).toBeInTheDocument();
		});

		it("should render event description", () => {
			render(<RecoveryTimelineEvent event={mockEvent} onClick={mockOnClick} />);

			expect(
				screen.getByText("Wallet recovery process started"),
			).toBeInTheDocument();
		});

		it("should render event timestamp", () => {
			render(<RecoveryTimelineEvent event={mockEvent} onClick={mockOnClick} />);

			const timestamp = screen.getByText(/10:00/);
			expect(timestamp).toBeInTheDocument();
		});

		it("should render event details when provided", () => {
			render(<RecoveryTimelineEvent event={mockEvent} onClick={mockOnClick} />);

			expect(
				screen.getByText("User initiated recovery from device loss"),
			).toBeInTheDocument();
		});

		it("should not render details when not provided", () => {
			const eventWithoutDetails = { ...mockEvent, details: undefined };

			render(
				<RecoveryTimelineEvent
					event={eventWithoutDetails}
					onClick={mockOnClick}
				/>,
			);

			expect(
				screen.queryByText("User initiated recovery from device loss"),
			).not.toBeInTheDocument();
		});

		it("should render error message when provided", () => {
			const eventWithError = {
				...mockEvent,
				status: "failed" as const,
				errorMessage: "Maximum verification attempts exceeded",
			};

			render(
				<RecoveryTimelineEvent event={eventWithError} onClick={mockOnClick} />,
			);

			expect(
				screen.getByText("Maximum verification attempts exceeded"),
			).toBeInTheDocument();
		});

		it("should render with proper ARIA attributes", () => {
			const { container } = render(
				<RecoveryTimelineEvent event={mockEvent} onClick={mockOnClick} />,
			);

			const listItem = container.querySelector('[role="listitem"]');
			expect(listItem).toHaveAttribute(
				"aria-label",
				"Recovery Initiated - completed",
			);
		});
	});

	describe("Status styling", () => {
		it("should apply completed status styles", () => {
			const { container } = render(
				<RecoveryTimelineEvent event={mockEvent} onClick={mockOnClick} />,
			);

			const statusButton = container.querySelector("button");
			expect(statusButton).toHaveClass("bg-green-50");
		});

		it("should apply in_progress status styles", () => {
			const inProgressEvent = {
				...mockEvent,
				status: "in_progress" as const,
			};

			const { container } = render(
				<RecoveryTimelineEvent event={inProgressEvent} onClick={mockOnClick} />,
			);

			const statusButton = container.querySelector("button");
			expect(statusButton).toHaveClass("bg-yellow-50");
		});

		it("should apply failed status styles", () => {
			const failedEvent = {
				...mockEvent,
				status: "failed" as const,
			};

			const { container } = render(
				<RecoveryTimelineEvent event={failedEvent} onClick={mockOnClick} />,
			);

			const statusButton = container.querySelector("button");
			expect(statusButton).toHaveClass("bg-red-50");
		});

		it("should apply pending status styles", () => {
			const pendingEvent = {
				...mockEvent,
				status: "pending" as const,
			};

			const { container } = render(
				<RecoveryTimelineEvent event={pendingEvent} onClick={mockOnClick} />,
			);

			const statusButton = container.querySelector("button");
			expect(statusButton).toHaveClass("bg-zinc-100");
		});
	});

	describe("Timeline line", () => {
		it("should render connecting line when not last event", () => {
			const { container } = render(
				<RecoveryTimelineEvent
					event={mockEvent}
					isLast={false}
					onClick={mockOnClick}
				/>,
			);

			const line = container.querySelector(".flex-1.my-2");
			expect(line).toBeInTheDocument();
		});

		it("should not render connecting line when last event", () => {
			const { container } = render(
				<RecoveryTimelineEvent
					event={mockEvent}
					isLast={true}
					onClick={mockOnClick}
				/>,
			);

			const line = container.querySelector(".flex-1.my-2");
			expect(line).not.toBeInTheDocument();
		});

		it("should apply correct line color for completed event", () => {
			const { container } = render(
				<RecoveryTimelineEvent
					event={mockEvent}
					isLast={false}
					onClick={mockOnClick}
				/>,
			);

			const line = container.querySelector(".flex-1.my-2");
			expect(line).toHaveClass("bg-green-300");
		});

		it("should apply correct line color for failed event", () => {
			const failedEvent = {
				...mockEvent,
				status: "failed" as const,
			};

			const { container } = render(
				<RecoveryTimelineEvent
					event={failedEvent}
					isLast={false}
					onClick={mockOnClick}
				/>,
			);

			const line = container.querySelector(".flex-1.my-2");
			expect(line).toHaveClass("bg-red-300");
		});
	});

	describe("Event interaction", () => {
		it("should call onClick when event button is clicked", () => {
			render(<RecoveryTimelineEvent event={mockEvent} onClick={mockOnClick} />);

			const button = screen.getByRole("button");
			fireEvent.click(button);

			expect(mockOnClick).toHaveBeenCalledTimes(1);
		});

		it("should not call onClick when onClick is not provided", () => {
			render(<RecoveryTimelineEvent event={mockEvent} />);

			const button = screen.getByRole("button");
			fireEvent.click(button);

			// Should not throw error
			expect(button).toBeInTheDocument();
		});

		it("should have proper button title", () => {
			render(<RecoveryTimelineEvent event={mockEvent} onClick={mockOnClick} />);

			const button = screen.getByRole("button");
			expect(button).toHaveAttribute("title", "Recovery Initiated");
		});
	});

	describe("Custom className", () => {
		it("should apply custom className", () => {
			const { container } = render(
				<RecoveryTimelineEvent
					event={mockEvent}
					onClick={mockOnClick}
					className="custom-class"
				/>,
			);

			const wrapper = container.firstChild;
			expect(wrapper).toHaveClass("custom-class");
		});

		it("should merge custom className with default classes", () => {
			const { container } = render(
				<RecoveryTimelineEvent
					event={mockEvent}
					onClick={mockOnClick}
					className="mt-4"
				/>,
			);

			const wrapper = container.firstChild;
			expect(wrapper).toHaveClass("flex");
			expect(wrapper).toHaveClass("gap-4");
			expect(wrapper).toHaveClass("mt-4");
		});
	});

	describe("Event types", () => {
		const eventTypes = [
			"initiated",
			"detection",
			"verification",
			"processing",
			"completion",
			"error",
		] as const;

		eventTypes.forEach((type) => {
			it(`should render ${type} event type`, () => {
				const event = {
					...mockEvent,
					type: type as any,
				};

				render(<RecoveryTimelineEvent event={event} onClick={mockOnClick} />);

				expect(screen.getByText("Recovery Initiated")).toBeInTheDocument();
			});
		});
	});

	describe("Accessibility", () => {
		it("should have proper button role", () => {
			render(<RecoveryTimelineEvent event={mockEvent} onClick={mockOnClick} />);

			const button = screen.getByRole("button");
			expect(button).toBeInTheDocument();
		});

		it("should have aria-pressed attribute", () => {
			render(<RecoveryTimelineEvent event={mockEvent} onClick={mockOnClick} />);

			const button = screen.getByRole("button");
			expect(button).toHaveAttribute("aria-pressed", "false");
		});

		it("should have proper list item role", () => {
			const { container } = render(
				<RecoveryTimelineEvent event={mockEvent} onClick={mockOnClick} />,
			);

			const listItem = container.querySelector('[role="listitem"]');
			expect(listItem).toBeInTheDocument();
		});
	});

	describe("Edge cases", () => {
		it("should handle very long title", () => {
			const longTitleEvent = {
				...mockEvent,
				title: "A".repeat(100),
			};

			render(
				<RecoveryTimelineEvent event={longTitleEvent} onClick={mockOnClick} />,
			);

			expect(screen.getByText("A".repeat(100))).toBeInTheDocument();
		});

		it("should handle very long description", () => {
			const longDescEvent = {
				...mockEvent,
				description: "B".repeat(200),
			};

			render(
				<RecoveryTimelineEvent event={longDescEvent} onClick={mockOnClick} />,
			);

			expect(screen.getByText("B".repeat(200))).toBeInTheDocument();
		});

		it("should handle event without optional fields", () => {
			const minimalEvent = {
				id: "event-1",
				type: "initiated" as const,
				status: "completed" as const,
				title: "Test",
				description: "Test Description",
				timestamp: new Date(),
			};

			render(
				<RecoveryTimelineEvent event={minimalEvent} onClick={mockOnClick} />,
			);

			expect(screen.getByText("Test")).toBeInTheDocument();
		});

		it("should handle rapid clicks", () => {
			render(<RecoveryTimelineEvent event={mockEvent} onClick={mockOnClick} />);

			const button = screen.getByRole("button");
			fireEvent.click(button);
			fireEvent.click(button);
			fireEvent.click(button);

			expect(mockOnClick).toHaveBeenCalledTimes(3);
		});
	});

	describe("Responsive layout (narrow mobile viewport)", () => {
		it("stacks title/description above the timestamp on mobile, side-by-side from sm breakpoint up", () => {
			const { container } = render(
				<RecoveryTimelineEvent event={mockEvent} onClick={mockOnClick} />,
			);

			const contentRow = container.querySelector(
				".flex.flex-col.sm\\:flex-row",
			);
			expect(contentRow).toBeInTheDocument();
			expect(contentRow).toHaveClass("sm:items-start");
			expect(contentRow).toHaveClass("sm:justify-between");
		});

		it("uses tighter gap and dot spacing on mobile than on larger screens", () => {
			const { container } = render(
				<RecoveryTimelineEvent event={mockEvent} onClick={mockOnClick} />,
			);

			const row = container.firstChild as HTMLElement;
			expect(row).toHaveClass("gap-2");
			expect(row).toHaveClass("sm:gap-4");
		});

		it("keeps the timestamp non-wrapping so it doesn't collapse the row on narrow screens", () => {
			render(<RecoveryTimelineEvent event={mockEvent} onClick={mockOnClick} />);

			const timestamp = screen.getByText(/10:00/);
			expect(timestamp).toHaveClass("whitespace-nowrap");
		});
	});

	describe("Dark mode", () => {
		it("should have dark mode classes", () => {
			const { container } = render(
				<RecoveryTimelineEvent event={mockEvent} onClick={mockOnClick} />,
			);

			const title = screen.getByText("Recovery Initiated");
			expect(title).toHaveClass("dark:text-zinc-50");
		});

		it("should apply dark mode to error message", () => {
			const eventWithError = {
				...mockEvent,
				status: "failed" as const,
				errorMessage: "Test error",
			};

			render(
				<RecoveryTimelineEvent event={eventWithError} onClick={mockOnClick} />,
			);

			const errorMessage = screen.getByText("Test error");
			expect(errorMessage).toHaveClass("dark:bg-red-900/20");
		});
	});
});
