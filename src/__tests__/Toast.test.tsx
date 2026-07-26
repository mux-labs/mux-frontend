import "@testing-library/jest-dom";
import {
	act,
	fireEvent,
	render,
	renderHook,
	screen,
} from "@testing-library/react";
import { ToastContainer, ToastItem, useToast } from "@/components/ui/toast";

describe("ToastItem", () => {
	beforeEach(() => {
		jest.useFakeTimers();
	});

	afterEach(() => {
		jest.useRealTimers();
	});

	it("renders the toast message", () => {
		render(
			<ToastItem
				toast={{ id: "1", type: "info", message: "Hello" }}
				onDismiss={jest.fn()}
			/>,
		);
		expect(screen.getByText("Hello")).toBeInTheDocument();
	});

	it("renders the description when provided", () => {
		render(
			<ToastItem
				toast={{
					id: "1",
					type: "success",
					message: "Done",
					description: "Operation completed",
				}}
				onDismiss={jest.fn()}
			/>,
		);
		expect(screen.getByText("Operation completed")).toBeInTheDocument();
	});

	it("calls onDismiss when dismiss button is clicked", () => {
		const onDismiss = jest.fn();
		render(
			<ToastItem
				toast={{ id: "1", type: "error", message: "Error!" }}
				onDismiss={onDismiss}
			/>,
		);
		fireEvent.click(screen.getByRole("button"));
		expect(onDismiss).toHaveBeenCalledWith("1");
	});

	it("auto-dismisses after the specified duration", () => {
		const onDismiss = jest.fn();
		render(
			<ToastItem
				toast={{
					id: "1",
					type: "info",
					message: "Auto dismiss",
					duration: 3000,
				}}
				onDismiss={onDismiss}
			/>,
		);

		act(() => {
			jest.advanceTimersByTime(3000);
		});

		expect(onDismiss).toHaveBeenCalledWith("1");
	});

	it("does not auto-dismiss when duration is 0", () => {
		const onDismiss = jest.fn();
		render(
			<ToastItem
				toast={{ id: "1", type: "info", message: "Persistent", duration: 0 }}
				onDismiss={onDismiss}
			/>,
		);

		act(() => {
			jest.advanceTimersByTime(10000);
		});

		expect(onDismiss).not.toHaveBeenCalled();
	});

	it("cleans up timer on unmount", () => {
		const onDismiss = jest.fn();
		const { unmount } = render(
			<ToastItem
				toast={{ id: "1", type: "info", message: "Cleanup", duration: 5000 }}
				onDismiss={onDismiss}
			/>,
		);

		unmount();

		act(() => {
			jest.advanceTimersByTime(5000);
		});

		expect(onDismiss).not.toHaveBeenCalled();
	});

	it("has correct aria attributes", () => {
		render(
			<ToastItem
				toast={{ id: "1", type: "warning", message: "Warning!" }}
				onDismiss={jest.fn()}
			/>,
		);
		expect(screen.getByRole("alert")).toBeInTheDocument();
	});
});

describe("ToastContainer", () => {
	it("renders all toasts", () => {
		const toasts = [
			{ id: "1", type: "info" as const, message: "First" },
			{ id: "2", type: "success" as const, message: "Second" },
		];
		render(<ToastContainer toasts={toasts} onDismiss={jest.fn()} />);
		expect(screen.getByText("First")).toBeInTheDocument();
		expect(screen.getByText("Second")).toBeInTheDocument();
	});

	it("returns null when there are no toasts (empty state)", () => {
		const { container } = render(
			<ToastContainer toasts={[]} onDismiss={jest.fn()} />,
		);
		expect(container.innerHTML).toBe("");
	});

	it("applies position classes correctly", () => {
		const toasts = [{ id: "1", type: "info" as const, message: "Test" }];
		const { container } = render(
			<ToastContainer
				toasts={toasts}
				onDismiss={jest.fn()}
				position="bottom-left"
			/>,
		);
		const div = container.firstChild as HTMLElement;
		expect(div.className).toContain("bottom-4");
		expect(div.className).toContain("left-4");
	});

	it("has correct aria label", () => {
		const toasts = [{ id: "1", type: "info" as const, message: "Test" }];
		render(<ToastContainer toasts={toasts} onDismiss={jest.fn()} />);
		expect(screen.getByLabelText("Notifications")).toBeInTheDocument();
	});
});

describe("useToast hook", () => {
	it("starts with empty toasts array", () => {
		const { result } = renderHook(() => useToast());
		expect(result.current.toasts).toEqual([]);
	});

	it("adds a toast and returns its id", () => {
		const { result } = renderHook(() => useToast());
		let id: string;
		act(() => {
			id = result.current.addToast({ type: "success", message: "Saved!" });
		});
		expect(result.current.toasts).toHaveLength(1);
		expect(result.current.toasts[0].message).toBe("Saved!");
		expect(result.current.toasts[0].type).toBe("success");
		expect(id!).toBeDefined();
	});

	it("dismisses a toast by id", () => {
		const { result } = renderHook(() => useToast());
		let id: string;
		act(() => {
			id = result.current.addToast({ type: "info", message: "Temp" });
		});
		expect(result.current.toasts).toHaveLength(1);
		act(() => {
			result.current.dismissToast(id!);
		});
		expect(result.current.toasts).toHaveLength(0);
	});

	it("handles multiple toasts", () => {
		const { result } = renderHook(() => useToast());
		act(() => {
			result.current.addToast({ type: "info", message: "First" });
			result.current.addToast({ type: "success", message: "Second" });
		});
		expect(result.current.toasts).toHaveLength(2);
	});
});
