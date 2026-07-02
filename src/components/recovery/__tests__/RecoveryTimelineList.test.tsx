import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
	mockRecoveryEvents,
	mockRecoveryTimelineCompleted,
	mockRecoveryTimelineFailed,
	mockRecoveryTimelineInProgress,
} from "@/mock-data/recovery";
import { RecoveryTimelineList } from "../RecoveryTimelineList";

describe("RecoveryTimelineList", () => {
	const mockOnEventClick = jest.fn();

	beforeEach(() => {
		mockOnEventClick.mockClear();
	});

	describe("Rendering", () => {
		it("should render all events", () => {
			render(
				<RecoveryTimelineList
					events={mockRecoveryEvents}
					onEventClick={mockOnEventClick}
				/>,
			);

			mockRecoveryEvents.forEach((event) => {
				expect(screen.getByText(event.title)).toBeInTheDocument();
			});
		});

		it("should render progress indicator", () => {
			render(
				<RecoveryTimelineList
					events={mockRecoveryEvents}
					onEventClick={mockOnEventClick}
				/>,
			);

			expect(screen.getByText("Recovery Progress")).toBeInTheDocument();
		});

		it("should render progress bar", () => {
			const { container } = render(
				<RecoveryTimelineList
					events={mockRecoveryEvents}
					onEventClick={mockOnEventClick}
				/>,
			);

			const progressBar = container.querySelector('[role="progressbar"]');
			expect(progressBar).toBeInTheDocument();
		});

		it("should render statistics section", () => {
			render(
				<RecoveryTimelineList
					events={mockRecoveryEvents}
					onEventClick={mockOnEventClick}
				/>,
			);

			expect(screen.getByText("Completed")).toBeInTheDocument();
			expect(screen.getByText("In Progress")).toBeInTheDocument();
			expect(screen.getByText("Failed")).toBeInTheDocument();
		});

		it("should render with proper ARIA attributes", () => {
			const { container } = render(
				<RecoveryTimelineList
					events={mockRecoveryEvents}
					onEventClick={mockOnEventClick}
				/>,
			);

			const list = container.querySelector('[role="list"]');
			expect(list).toHaveAttribute("aria-label", "Recovery timeline events");
		});
	});

	describe("Empty state", () => {
		it("should render empty state when no events", () => {
			render(
				<RecoveryTimelineList events={[]} onEventClick={mockOnEventClick} />,
			);

			expect(
				screen.getByText("No recovery events to display"),
			).toBeInTheDocument();
		});

		it("should render custom empty message", () => {
			render(
				<RecoveryTimelineList
					events={[]}
					onEventClick={mockOnEventClick}
					emptyMessage="Custom empty message"
				/>,
			);

			expect(screen.getByText("Custom empty message")).toBeInTheDocument();
		});

		it("should render empty state with proper role", () => {
			const { container } = render(
				<RecoveryTimelineList events={[]} onEventClick={mockOnEventClick} />,
			);

			const emptyState = container.querySelector('[role="status"]');
			expect(emptyState).toBeInTheDocument();
		});
	});

	describe("Progress calculation", () => {
		it("should show 100% progress for completed timeline", () => {
			render(
				<RecoveryTimelineList
					events={mockRecoveryTimelineCompleted.events}
					onEventClick={mockOnEventClick}
				/>,
			);

			expect(screen.getByText("5 of 5 completed")).toBeInTheDocument();
		});

		it("should show partial progress for in-progress timeline", () => {
			render(
				<RecoveryTimelineList
					events={mockRecoveryTimelineInProgress.events}
					onEventClick={mockOnEventClick}
				/>,
			);

			const text = screen.getByText(/of 3 completed/);
			expect(text).toBeInTheDocument();
		});

		it("should update progress bar width", () => {
			const { container } = render(
				<RecoveryTimelineList
					events={mockRecoveryTimelineCompleted.events}
					onEventClick={mockOnEventClick}
				/>,
			);

			const progressBar = container.querySelector('[role="progressbar"]');
			expect(progressBar).toHaveStyle({ width: "100%" });
		});
	});

	describe("Statistics display", () => {
		it("should display correct completed count", () => {
			render(
				<RecoveryTimelineList
					events={mockRecoveryTimelineCompleted.events}
					onEventClick={mockOnEventClick}
				/>,
			);

			const completedStats = screen.getAllByText("5");
			expect(completedStats.length).toBeGreaterThan(0);
		});

		it("should display correct failed count", () => {
			render(
				<RecoveryTimelineList
					events={mockRecoveryTimelineFailed.events}
					onEventClick={mockOnEventClick}
				/>,
			);

			const failedStats = screen.getByText("1");
			expect(failedStats).toBeInTheDocument();
		});

		it("should display statistics for in-progress timeline", () => {
			render(
				<RecoveryTimelineList
					events={mockRecoveryTimelineInProgress.events}
					onEventClick={mockOnEventClick}
				/>,
			);

			expect(screen.getByText("Completed")).toBeInTheDocument();
			expect(screen.getByText("In Progress")).toBeInTheDocument();
			expect(screen.getByText("Failed")).toBeInTheDocument();
		});
	});

	describe("Event interaction", () => {
		it("should call onEventClick when event is clicked", () => {
			render(
				<RecoveryTimelineList
					events={mockRecoveryEvents}
					onEventClick={mockOnEventClick}
				/>,
			);

			const firstEventTitle = screen.getByText(mockRecoveryEvents[0].title);
			fireEvent.click(firstEventTitle.closest("button") || firstEventTitle);

			expect(mockOnEventClick).toHaveBeenCalled();
		});

		it("should pass correct event to callback", () => {
			render(
				<RecoveryTimelineList
					events={mockRecoveryEvents}
					onEventClick={mockOnEventClick}
				/>,
			);

			const firstEventTitle = screen.getByText(mockRecoveryEvents[0].title);
			const button = firstEventTitle.closest("button");

			if (button) {
				fireEvent.click(button);
				expect(mockOnEventClick).toHaveBeenCalledWith(mockRecoveryEvents[0]);
			}
		});

		it("should handle multiple event clicks", () => {
			render(
				<RecoveryTimelineList
					events={mockRecoveryEvents}
					onEventClick={mockOnEventClick}
				/>,
			);

			const buttons = screen.getAllByRole("button");
			fireEvent.click(buttons[0]);
			fireEvent.click(buttons[1]);

			expect(mockOnEventClick).toHaveBeenCalledTimes(2);
		});
	});

	describe("Progress bar styling", () => {
		it("should use green color for completed timeline", () => {
			const { container } = render(
				<RecoveryTimelineList
					events={mockRecoveryTimelineCompleted.events}
					onEventClick={mockOnEventClick}
				/>,
			);

			const progressBar = container.querySelector('[role="progressbar"]');
			expect(progressBar).toHaveClass("bg-green-500");
		});

		it("should use yellow color for in-progress timeline", () => {
			const { container } = render(
				<RecoveryTimelineList
					events={mockRecoveryTimelineInProgress.events}
					onEventClick={mockOnEventClick}
				/>,
			);

			const progressBar = container.querySelector('[role="progressbar"]');
			expect(progressBar).toHaveClass("bg-yellow-500");
		});

		it("should use red color for failed timeline", () => {
			const { container } = render(
				<RecoveryTimelineList
					events={mockRecoveryTimelineFailed.events}
					onEventClick={mockOnEventClick}
				/>,
			);

			const progressBar = container.querySelector('[role="progressbar"]');
			expect(progressBar).toHaveClass("bg-red-500");
		});
	});

	describe("Custom className", () => {
		it("should apply custom className", () => {
			const { container } = render(
				<RecoveryTimelineList
					events={mockRecoveryEvents}
					onEventClick={mockOnEventClick}
					className="custom-class"
				/>,
			);

			const wrapper = container.firstChild;
			expect(wrapper).toHaveClass("custom-class");
		});

		it("should merge custom className with default classes", () => {
			const { container } = render(
				<RecoveryTimelineList
					events={mockRecoveryEvents}
					onEventClick={mockOnEventClick}
					className="mt-4"
				/>,
			);

			const wrapper = container.firstChild;
			expect(wrapper).toHaveClass("space-y-6");
			expect(wrapper).toHaveClass("mt-4");
		});
	});

	describe("Accessibility", () => {
		it("should have proper list role", () => {
			const { container } = render(
				<RecoveryTimelineList
					events={mockRecoveryEvents}
					onEventClick={mockOnEventClick}
				/>,
			);

			const list = container.querySelector('[role="list"]');
			expect(list).toBeInTheDocument();
		});

		it("should have proper progress bar attributes", () => {
			const { container } = render(
				<RecoveryTimelineList
					events={mockRecoveryTimelineCompleted.events}
					onEventClick={mockOnEventClick}
				/>,
			);

			const progressBar = container.querySelector('[role="progressbar"]');
			expect(progressBar).toHaveAttribute("aria-valuenow", "100");
			expect(progressBar).toHaveAttribute("aria-valuemin", "0");
			expect(progressBar).toHaveAttribute("aria-valuemax", "100");
		});

		it("should have proper list items", () => {
			const { container } = render(
				<RecoveryTimelineList
					events={mockRecoveryEvents}
					onEventClick={mockOnEventClick}
				/>,
			);

			const listItems = container.querySelectorAll('[role="listitem"]');
			expect(listItems.length).toBe(mockRecoveryEvents.length);
		});
	});

	describe("Edge cases", () => {
		it("should handle single event", () => {
			render(
				<RecoveryTimelineList
					events={[mockRecoveryEvents[0]]}
					onEventClick={mockOnEventClick}
				/>,
			);

			expect(screen.getByText(mockRecoveryEvents[0].title)).toBeInTheDocument();
		});

		it("should handle events without optional fields", () => {
			const minimalEvent = {
				id: "event-1",
				type: "initiated" as const,
				status: "completed" as const,
				title: "Test Event",
				description: "Test Description",
				timestamp: new Date(),
			};

			render(
				<RecoveryTimelineList
					events={[minimalEvent]}
					onEventClick={mockOnEventClick}
				/>,
			);

			expect(screen.getByText("Test Event")).toBeInTheDocument();
		});

		it("should handle rapid re-renders", () => {
			const { rerender } = render(
				<RecoveryTimelineList
					events={mockRecoveryTimelineCompleted.events}
					onEventClick={mockOnEventClick}
				/>,
			);

			rerender(
				<RecoveryTimelineList
					events={mockRecoveryTimelineInProgress.events}
					onEventClick={mockOnEventClick}
				/>,
			);

			rerender(
				<RecoveryTimelineList
					events={mockRecoveryTimelineCompleted.events}
					onEventClick={mockOnEventClick}
				/>,
			);

			expect(screen.getByText("Recovery Progress")).toBeInTheDocument();
		});
	});

	describe("Keyboard navigation", () => {
	it("should navigate down with ArrowDown", async () => {
		const user = userEvent.setup();
		render(
			<RecoveryTimelineList
				events={mockRecoveryEvents}
				onEventClick={mockOnEventClick}
			/>,
		);

		const buttons = screen.getAllByRole("button");
		buttons[0].focus();
		await user.keyboard("{ArrowDown}");
		expect(buttons[1]).toHaveFocus();
	});

	it("should navigate up with ArrowUp", async () => {
		const user = userEvent.setup();
		render(
			<RecoveryTimelineList
				events={mockRecoveryEvents}
				onEventClick={mockOnEventClick}
			/>,
		);

		const buttons = screen.getAllByRole("button");
		buttons[1].focus();
		await user.keyboard("{ArrowUp}");
		expect(buttons[0]).toHaveFocus();
	});

	it("should navigate to first event with Home", async () => {
		const user = userEvent.setup();
		render(
			<RecoveryTimelineList
				events={mockRecoveryEvents}
				onEventClick={mockOnEventClick}
			/>,
		);

		const buttons = screen.getAllByRole("button");
		const lastIndex = buttons.length - 1;
		buttons[lastIndex].focus();
		await user.keyboard("{Home}");
		expect(buttons[0]).toHaveFocus();
	});

	it("should navigate to last event with End", async () => {
		const user = userEvent.setup();
		render(
			<RecoveryTimelineList
				events={mockRecoveryEvents}
				onEventClick={mockOnEventClick}
			/>,
		);

		const buttons = screen.getAllByRole("button");
		const lastIndex = buttons.length - 1;
		buttons[0].focus();
		await user.keyboard("{End}");
		expect(buttons[lastIndex]).toHaveFocus();
	});

	it("should trigger onEventClick on Enter", async () => {
		const user = userEvent.setup();
		render(
			<RecoveryTimelineList
				events={mockRecoveryEvents}
				onEventClick={mockOnEventClick}
			/>,
		);

		const buttons = screen.getAllByRole("button");
		buttons[0].focus();
		await user.keyboard("{Enter}");
		expect(mockOnEventClick).toHaveBeenCalledWith(mockRecoveryEvents[0]);
	});

	it("should trigger onEventClick on Space", async () => {
		const user = userEvent.setup();
		render(
			<RecoveryTimelineList
				events={mockRecoveryEvents}
				onEventClick={mockOnEventClick}
			/>,
		);

		const buttons = screen.getAllByRole("button");
		buttons[0].focus();
		await user.keyboard(" ");
		expect(mockOnEventClick).toHaveBeenCalledWith(mockRecoveryEvents[0]);
	});

	it("should not navigate past the first event with ArrowUp", async () => {
		const user = userEvent.setup();
		render(
			<RecoveryTimelineList
				events={mockRecoveryEvents}
				onEventClick={mockOnEventClick}
			/>,
		);

		const buttons = screen.getAllByRole("button");
		buttons[0].focus();
		await user.keyboard("{ArrowUp}");
		expect(buttons[0]).toHaveFocus();
	});

	it("should not navigate past the last event with ArrowDown", async () => {
		const user = userEvent.setup();
		render(
			<RecoveryTimelineList
				events={mockRecoveryEvents}
				onEventClick={mockOnEventClick}
			/>,
		);

		const buttons = screen.getAllByRole("button");
		const lastIndex = buttons.length - 1;
		buttons[lastIndex].focus();
		await user.keyboard("{ArrowDown}");
		expect(buttons[lastIndex]).toHaveFocus();
	});

	it("should apply focus ring on focused event button", () => {
		const { container } = render(
			<RecoveryTimelineList
				events={mockRecoveryEvents}
				onEventClick={mockOnEventClick}
			/>,
		);

		const buttons = container.querySelectorAll("button");
		buttons[0].focus();
		expect(buttons[0]).toHaveClass("ring-2");
	});

	it("should handle single event keyboard navigation", async () => {
		const user = userEvent.setup();
		render(
			<RecoveryTimelineList
				events={[mockRecoveryEvents[0]]}
				onEventClick={mockOnEventClick}
			/>,
		);

		const buttons = screen.getAllByRole("button");
		buttons[0].focus();
		await user.keyboard("{ArrowDown}");
		expect(buttons[0]).toHaveFocus();
		await user.keyboard("{ArrowUp}");
		expect(buttons[0]).toHaveFocus();
	});

	it("should have accessible data-testid on event buttons", () => {
		render(
			<RecoveryTimelineList
				events={mockRecoveryEvents}
				onEventClick={mockOnEventClick}
			/>,
		);

		mockRecoveryEvents.forEach((_, index) => {
			expect(
				screen.getByTestId(`recovery-event-${index}`),
			).toBeInTheDocument();
		});
	});
});

describe("Integration scenarios", () => {
		it("should display complete recovery workflow", () => {
			render(
				<RecoveryTimelineList
					events={mockRecoveryTimelineCompleted.events}
					onEventClick={mockOnEventClick}
				/>,
			);

			// Check all events are displayed
			mockRecoveryTimelineCompleted.events.forEach((event) => {
				expect(screen.getByText(event.title)).toBeInTheDocument();
			});

			// Check progress is 100%
			expect(screen.getByText("5 of 5 completed")).toBeInTheDocument();

			// Check statistics
			expect(screen.getByText("Completed")).toBeInTheDocument();
		});

		it("should display in-progress recovery workflow", () => {
			render(
				<RecoveryTimelineList
					events={mockRecoveryTimelineInProgress.events}
					onEventClick={mockOnEventClick}
				/>,
			);

			// Check events are displayed
			mockRecoveryTimelineInProgress.events.forEach((event) => {
				expect(screen.getByText(event.title)).toBeInTheDocument();
			});

			// Check progress is partial
			const progressText = screen.getByText(/of 3 completed/);
			expect(progressText).toBeInTheDocument();
		});

		it("should display failed recovery workflow", () => {
			render(
				<RecoveryTimelineList
					events={mockRecoveryTimelineFailed.events}
					onEventClick={mockOnEventClick}
				/>,
			);

			// Check events are displayed
			mockRecoveryTimelineFailed.events.forEach((event) => {
				expect(screen.getByText(event.title)).toBeInTheDocument();
			});

			// Check failed status is shown
			expect(screen.getByText("Failed")).toBeInTheDocument();
		});
	});
});
