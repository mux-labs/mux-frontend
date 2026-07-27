import "@testing-library/jest-dom";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { TransactionForm } from "@/components/transactions/TransactionForm";

describe("TransactionForm", () => {
	const mockOnSubmit = jest.fn();

	beforeEach(() => {
		mockOnSubmit.mockClear();
	});

	it("renders all form fields and submit button", () => {
		render(<TransactionForm onSubmit={mockOnSubmit} />);
		expect(screen.getByLabelText("Amount")).toBeInTheDocument();
		expect(screen.getByLabelText("Recipient Address")).toBeInTheDocument();
		expect(screen.getByLabelText("Memo (optional)")).toBeInTheDocument();
		expect(
			screen.getByRole("button", { name: /send transaction/i }),
		).toBeInTheDocument();
	});

	it("renders in submitting state with loading indicator", () => {
		render(<TransactionForm onSubmit={mockOnSubmit} isSubmitting={true} />);
		expect(screen.getByText("Submitting...")).toBeInTheDocument();
		expect(screen.getByRole("button")).toBeDisabled();
	});

	it("shows validation errors on submit with empty fields", () => {
		render(<TransactionForm onSubmit={mockOnSubmit} />);
		fireEvent.click(screen.getByRole("button", { name: /send transaction/i }));
		expect(screen.getAllByText("Amount is required")).toHaveLength(2);
		expect(screen.getAllByText("Address is required")).toHaveLength(2);
		expect(mockOnSubmit).not.toHaveBeenCalled();
	});

	it("shows amount validation error on blur", () => {
		render(<TransactionForm onSubmit={mockOnSubmit} />);
		const amountInput = screen.getByLabelText("Amount");
		fireEvent.change(amountInput, { target: { value: "-5" } });
		fireEvent.blur(amountInput);
		expect(screen.getAllByText("Amount must be greater than 0")).toHaveLength(
			2,
		);
	});

	it("shows address validation error on blur", () => {
		render(<TransactionForm onSubmit={mockOnSubmit} />);
		const addressInput = screen.getByLabelText("Recipient Address");
		fireEvent.change(addressInput, { target: { value: "short" } });
		fireEvent.blur(addressInput);
		expect(screen.getAllByText(/Invalid address format/)).toHaveLength(2);
	});

	it("calls onSubmit with form data when validation passes", async () => {
		render(<TransactionForm onSubmit={mockOnSubmit} />);
		const amountInput = screen.getByLabelText("Amount");
		const addressInput = screen.getByLabelText("Recipient Address");
		const memoInput = screen.getByLabelText("Memo (optional)");

		fireEvent.change(amountInput, { target: { value: "100" } });
		fireEvent.change(addressInput, { target: { value: "a".repeat(40) } });
		fireEvent.change(memoInput, { target: { value: "Test payment" } });
		fireEvent.click(screen.getByRole("button", { name: /send transaction/i }));

		await waitFor(() =>
			expect(mockOnSubmit).toHaveBeenCalledWith({
				amount: "100",
				address: "a".repeat(40),
				memo: "Test payment",
			}),
		);
	});

	it("calls onSubmit with empty memo when not provided", async () => {
		render(<TransactionForm onSubmit={mockOnSubmit} />);
		const amountInput = screen.getByLabelText("Amount");
		const addressInput = screen.getByLabelText("Recipient Address");

		fireEvent.change(amountInput, { target: { value: "50" } });
		fireEvent.change(addressInput, { target: { value: "a".repeat(35) } });
		fireEvent.click(screen.getByRole("button", { name: /send transaction/i }));

		await waitFor(() =>
			expect(mockOnSubmit).toHaveBeenCalledWith({
				amount: "50",
				address: "a".repeat(35),
				memo: "",
			}),
		);
	});

	it("prevents double submit while the submit handler is pending", () => {
		const pendingSubmit = jest.fn(() => new Promise<void>(() => {}));
		render(<TransactionForm onSubmit={pendingSubmit} />);
		fireEvent.change(screen.getByLabelText("Amount"), {
			target: { value: "100" },
		});
		fireEvent.change(screen.getByLabelText("Recipient Address"), {
			target: { value: "a".repeat(40) },
		});

		const submitButton = screen.getByRole("button", {
			name: /send transaction/i,
		});
		fireEvent.click(submitButton);
		fireEvent.click(submitButton);

		expect(pendingSubmit).toHaveBeenCalledTimes(1);
		expect(submitButton).toBeDisabled();
		expect(submitButton).toHaveAttribute("aria-busy", "true");
	});

	it("applies custom className", () => {
		const { container } = render(
			<TransactionForm onSubmit={mockOnSubmit} className="custom-class" />,
		);
		const form = container.querySelector("form");
		expect(form?.className).toContain("custom-class");
	});

	it("disables inputs when submitting", () => {
		render(<TransactionForm onSubmit={mockOnSubmit} isSubmitting={true} />);
		expect(screen.getByLabelText("Amount")).toBeDisabled();
		expect(screen.getByLabelText("Recipient Address")).toBeDisabled();
		expect(screen.getByLabelText("Memo (optional)")).toBeDisabled();
	});

	it("has accessible form label", () => {
		render(<TransactionForm onSubmit={mockOnSubmit} />);
		expect(screen.getByLabelText("Transaction form")).toBeInTheDocument();
	});
});
