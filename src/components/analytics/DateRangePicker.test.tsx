import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { DateRangePicker } from "./DateRangePicker";

describe("DateRangePicker", () => {
	const today = new Date().toISOString().slice(0, 10);
	const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
	const lastWeek = new Date(Date.now() - 7 * 86400000)
		.toISOString()
		.slice(0, 10);
	const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10);

	const defaultProps = {
		value: { from: lastWeek, to: today },
		onChange: jest.fn(),
	};

	beforeEach(() => {
		jest.clearAllMocks();
	});

	describe("rendering", () => {
		it("should render date range button with correct label", () => {
			render(<DateRangePicker {...defaultProps} />);
			expect(
				screen.getByText(`${lastWeek} → ${today}`),
			).toBeInTheDocument();
		});

		it("should show dropdown when button is clicked", async () => {
			const user = userEvent.setup();
			render(<DateRangePicker {...defaultProps} />);

			const button = screen.getByRole("button", { name: /→/ });
			await user.click(button);

			expect(screen.getByText("Quick select")).toBeInTheDocument();
			expect(screen.getByText("Custom range")).toBeInTheDocument();
		});

		it("should render all preset options", async () => {
			const user = userEvent.setup();
			render(<DateRangePicker {...defaultProps} />);

			await user.click(screen.getByRole("button", { name: /→/ }));

			expect(screen.getByText("Last 7 days")).toBeInTheDocument();
			expect(screen.getByText("Last 14 days")).toBeInTheDocument();
			expect(screen.getByText("Last 30 days")).toBeInTheDocument();
			expect(screen.getByText("Last 90 days")).toBeInTheDocument();
		});

		it("should render date inputs in custom range section", async () => {
			const user = userEvent.setup();
			render(<DateRangePicker {...defaultProps} />);

			await user.click(screen.getByRole("button", { name: /→/ }));

			expect(screen.getByLabelText("From")).toBeInTheDocument();
			expect(screen.getByLabelText("To")).toBeInTheDocument();
		});
	});

	describe("preset selection", () => {
		it("should call onChange when preset is selected", async () => {
			const user = userEvent.setup();
			const onChange = jest.fn();
			render(<DateRangePicker {...defaultProps} onChange={onChange} />);

			await user.click(screen.getByRole("button", { name: /→/ }));
			await user.click(screen.getByText("Last 7 days"));

			expect(onChange).toHaveBeenCalledWith(
				expect.objectContaining({
					from: expect.any(String),
					to: expect.any(String),
				}),
			);
		});

		it("should close dropdown after preset selection", async () => {
			const user = userEvent.setup();
			render(<DateRangePicker {...defaultProps} />);

			await user.click(screen.getByRole("button", { name: /→/ }));
			await user.click(screen.getByText("Last 30 days"));

			await waitFor(() => {
				expect(screen.queryByText("Quick select")).not.toBeInTheDocument();
			});
		});

		it("should calculate correct date range for presets", async () => {
			const user = userEvent.setup();
			const onChange = jest.fn();
			render(<DateRangePicker {...defaultProps} onChange={onChange} />);

			await user.click(screen.getByRole("button", { name: /→/ }));
			await user.click(screen.getByText("Last 7 days"));

			const call = onChange.mock.calls[0][0];
			const fromDate = new Date(call.from);
			const toDate = new Date(call.to);
			const diffDays = Math.ceil(
				(toDate.getTime() - fromDate.getTime()) / (1000 * 60 * 60 * 24),
			);

			expect(diffDays).toBe(6); // 7 days inclusive = 6 day difference
		});
	});

	describe("custom date range", () => {
		it("should update from date input", async () => {
			const user = userEvent.setup();
			render(<DateRangePicker {...defaultProps} />);

			await user.click(screen.getByRole("button", { name: /→/ }));
			const fromInput = screen.getByLabelText("From");

			await user.clear(fromInput);
			await user.type(fromInput, yesterday);

			expect(fromInput).toHaveValue(yesterday);
		});

		it("should update to date input", async () => {
			const user = userEvent.setup();
			render(<DateRangePicker {...defaultProps} />);

			await user.click(screen.getByRole("button", { name: /→/ }));
			const toInput = screen.getByLabelText("To");

			await user.clear(toInput);
			await user.type(toInput, today);

			expect(toInput).toHaveValue(today);
		});

		it("should apply custom date range when valid", async () => {
			const user = userEvent.setup();
			const onChange = jest.fn();
			render(<DateRangePicker {...defaultProps} onChange={onChange} />);

			await user.click(screen.getByRole("button", { name: /→/ }));

			const fromInput = screen.getByLabelText("From");
			const toInput = screen.getByLabelText("To");

			await user.clear(fromInput);
			await user.type(fromInput, lastWeek);
			await user.clear(toInput);
			await user.type(toInput, yesterday);

			await user.click(screen.getByRole("button", { name: /apply/i }));

			expect(onChange).toHaveBeenCalledWith({
				from: lastWeek,
				to: yesterday,
			});
		});

		it("should close dropdown after applying custom range", async () => {
			const user = userEvent.setup();
			render(<DateRangePicker {...defaultProps} />);

			await user.click(screen.getByRole("button", { name: /→/ }));

			const applyButton = screen.getByRole("button", { name: /apply/i });
			await user.click(applyButton);

			await waitFor(() => {
				expect(screen.queryByText("Custom range")).not.toBeInTheDocument();
			});
		});
	});

	describe("validation", () => {
		it("should show error when from date is after to date", async () => {
			const user = userEvent.setup();
			render(<DateRangePicker {...defaultProps} showValidation={true} />);

			await user.click(screen.getByRole("button", { name: /→/ }));

			const fromInput = screen.getByLabelText("From");
			const toInput = screen.getByLabelText("To");

			await user.clear(fromInput);
			await user.type(fromInput, today);
			fireEvent.blur(fromInput);

			await user.clear(toInput);
			await user.type(toInput, lastWeek);
			fireEvent.blur(toInput);

			await waitFor(() => {
				expect(
					screen.getByText(/start date must be before or equal/i),
				).toBeInTheDocument();
			});
		});

		it("should show error when from date is empty", async () => {
			const user = userEvent.setup();
			render(<DateRangePicker {...defaultProps} showValidation={true} />);

			await user.click(screen.getByRole("button", { name: /→/ }));

			const fromInput = screen.getByLabelText("From");
			await user.clear(fromInput);
			fireEvent.blur(fromInput);

			await waitFor(() => {
				expect(
					screen.getByText(/start date is required/i),
				).toBeInTheDocument();
			});
		});

		it("should show error when to date is empty", async () => {
			const user = userEvent.setup();
			render(<DateRangePicker {...defaultProps} showValidation={true} />);

			await user.click(screen.getByRole("button", { name: /→/ }));

			const toInput = screen.getByLabelText("To");
			await user.clear(toInput);
			fireEvent.blur(toInput);

			await waitFor(() => {
				expect(screen.getByText(/end date is required/i)).toBeInTheDocument();
			});
		});

		it("should disable apply button when validation fails", async () => {
			const user = userEvent.setup();
			render(<DateRangePicker {...defaultProps} showValidation={true} />);

			await user.click(screen.getByRole("button", { name: /→/ }));

			const fromInput = screen.getByLabelText("From");
			await user.clear(fromInput);
			fireEvent.blur(fromInput);

			await waitFor(() => {
				const applyButton = screen.getByRole("button", { name: /apply/i });
				expect(applyButton).toBeDisabled();
			});
		});

		it("should show error indicator on main button when errors exist", async () => {
			const user = userEvent.setup();
			render(<DateRangePicker {...defaultProps} showValidation={true} />);

			await user.click(screen.getByRole("button", { name: /→/ }));

			const fromInput = screen.getByLabelText("From");
			await user.clear(fromInput);
			fireEvent.blur(fromInput);

			await waitFor(() => {
				const mainButton = screen.getByRole("button", { name: /→/ });
				expect(mainButton).toHaveAttribute("aria-invalid", "true");
			});
		});

		it("should validate future dates by default", async () => {
			const user = userEvent.setup();
			render(<DateRangePicker {...defaultProps} showValidation={true} />);

			await user.click(screen.getByRole("button", { name: /→/ }));

			const toInput = screen.getByLabelText("To");
			await user.clear(toInput);
			await user.type(toInput, tomorrow);
			fireEvent.blur(toInput);

			await waitFor(() => {
				expect(screen.getByText(/cannot be in the future/i)).toBeInTheDocument();
			});
		});

		it("should allow custom validation options", async () => {
			const user = userEvent.setup();
			render(
				<DateRangePicker
					{...defaultProps}
					showValidation={true}
					validationOptions={{ allowFuture: true }}
				/>,
			);

			await user.click(screen.getByRole("button", { name: /→/ }));

			const toInput = screen.getByLabelText("To");
			await user.clear(toInput);
			await user.type(toInput, tomorrow);
			fireEvent.blur(toInput);

			// Should not show future date error
			await waitFor(() => {
				expect(
					screen.queryByText(/cannot be in the future/i),
				).not.toBeInTheDocument();
			});
		});

		it("should call onValidationChange when validation state changes", async () => {
			const user = userEvent.setup();
			const onValidationChange = jest.fn();
			render(
				<DateRangePicker
					{...defaultProps}
					onValidationChange={onValidationChange}
				/>,
			);

			await user.click(screen.getByRole("button", { name: /→/ }));

			const fromInput = screen.getByLabelText("From");
			await user.clear(fromInput);

			await waitFor(() => {
				expect(onValidationChange).toHaveBeenCalledWith(
					expect.objectContaining({
						isValid: false,
						errors: expect.any(Array),
					}),
				);
			});
		});
	});

	describe("accessibility", () => {
		it("should have proper ARIA attributes on main button", () => {
			render(<DateRangePicker {...defaultProps} />);
			const button = screen.getByRole("button", { name: /→/ });

			expect(button).toHaveAttribute("aria-haspopup", "true");
			expect(button).toHaveAttribute("aria-expanded", "false");
		});

		it("should update aria-expanded when dropdown opens", async () => {
			const user = userEvent.setup();
			render(<DateRangePicker {...defaultProps} />);

			const button = screen.getByRole("button", { name: /→/ });
			await user.click(button);

			expect(button).toHaveAttribute("aria-expanded", "true");
		});

		it("should have aria-invalid on inputs with errors", async () => {
			const user = userEvent.setup();
			render(<DateRangePicker {...defaultProps} showValidation={true} />);

			await user.click(screen.getByRole("button", { name: /→/ }));

			const fromInput = screen.getByLabelText("From");
			await user.clear(fromInput);
			fireEvent.blur(fromInput);

			await waitFor(() => {
				expect(fromInput).toHaveAttribute("aria-invalid", "true");
			});
		});

		it("should associate error messages with inputs via aria-describedby", async () => {
			const user = userEvent.setup();
			render(<DateRangePicker {...defaultProps} showValidation={true} />);

			await user.click(screen.getByRole("button", { name: /→/ }));

			const fromInput = screen.getByLabelText("From");
			await user.clear(fromInput);
			fireEvent.blur(fromInput);

			await waitFor(() => {
				expect(fromInput).toHaveAttribute("aria-describedby", "from-error");
			});
		});

		it("should have role=alert on error messages", async () => {
			const user = userEvent.setup();
			render(<DateRangePicker {...defaultProps} showValidation={true} />);

			await user.click(screen.getByRole("button", { name: /→/ }));

			const fromInput = screen.getByLabelText("From");
			await user.clear(fromInput);
			fireEvent.blur(fromInput);

			await waitFor(() => {
				const errorMessage = screen.getByText(/start date is required/i);
				expect(errorMessage.closest("p")).toHaveAttribute("role", "alert");
			});
		});
	});

	describe("edge cases", () => {
		it("should close dropdown when clicking outside", async () => {
			const user = userEvent.setup();
			render(
				<div>
					<DateRangePicker {...defaultProps} />
					<button type="button">Outside</button>
				</div>,
			);

			await user.click(screen.getByRole("button", { name: /→/ }));
			expect(screen.getByText("Quick select")).toBeInTheDocument();

			await user.click(screen.getByText("Outside"));

			await waitFor(() => {
				expect(screen.queryByText("Quick select")).not.toBeInTheDocument();
			});
		});

		it("should sync inputs when value prop changes", () => {
			const { rerender } = render(<DateRangePicker {...defaultProps} />);

			rerender(
				<DateRangePicker {...defaultProps} value={{ from: yesterday, to: today }} />,
			);

			expect(
				screen.getByText(`${yesterday} → ${today}`),
			).toBeInTheDocument();
		});

		it("should handle maxDate prop", async () => {
			const user = userEvent.setup();
			render(<DateRangePicker {...defaultProps} maxDate={yesterday} />);

			await user.click(screen.getByRole("button", { name: /→/ }));
			const toInput = screen.getByLabelText("To") as HTMLInputElement;

			expect(toInput.max).toBe(yesterday);
		});

		it("should reset touched state after successful apply", async () => {
			const user = userEvent.setup();
			const onChange = jest.fn();
			render(
				<DateRangePicker
					{...defaultProps}
					onChange={onChange}
					showValidation={true}
				/>,
			);

			// Open and apply valid range
			await user.click(screen.getByRole("button", { name: /→/ }));
			await user.click(screen.getByRole("button", { name: /apply/i }));

			// Open again - should not show errors
			await user.click(screen.getByRole("button", { name: /→/ }));
			expect(
				screen.queryByText(/start date is required/i),
			).not.toBeInTheDocument();
		});

		it("should handle validation when showValidation is false", async () => {
			const user = userEvent.setup();
			render(<DateRangePicker {...defaultProps} showValidation={false} />);

			await user.click(screen.getByRole("button", { name: /→/ }));

			const fromInput = screen.getByLabelText("From");
			await user.clear(fromInput);
			fireEvent.blur(fromInput);

			// Should not show error messages
			await waitFor(() => {
				expect(
					screen.queryByText(/start date is required/i),
				).not.toBeInTheDocument();
			});
		});
	});
});
