import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { CopyButton } from "./CopyButton";

// Mock the useCopyToClipboard hook
vi.mock("@/hooks/useCopyToClipboard", () => ({
	useCopyToClipboard: vi.fn(() => ({
		copy: vi.fn(async () => true),
		copied: false,
		error: null,
	})),
}));

// Mock clipboard API
Object.assign(navigator, {
	clipboard: {
		writeText: vi.fn(async () => undefined),
	},
});

describe("CopyButton", () => {
	it("renders with Copy icon by default", () => {
		render(<CopyButton text="Test value" />);
		const button = screen.getByTestId("analytics-copy-button");
		expect(button).toBeInTheDocument();
		expect(button).toHaveAttribute("title", "Copy");
	});

	it("has accessible label", () => {
		render(<CopyButton text="Test value" label="Copy test value" />);
		const button = screen.getByLabelText("Copy test value");
		expect(button).toBeInTheDocument();
	});

	it("uses default accessible label when label prop is not provided", () => {
		render(<CopyButton text="Test value" />);
		const button = screen.getByLabelText("Copy to clipboard");
		expect(button).toBeInTheDocument();
	});

	it("applies custom className", () => {
		render(<CopyButton text="Test value" className="custom-class" />);
		const button = screen.getByTestId("analytics-copy-button");
		expect(button.className).toContain("custom-class");
	});

	it("handles click events", async () => {
		const user = userEvent.setup();
		render(<CopyButton text="Test value" />);
		const button = screen.getByTestId("analytics-copy-button");

		await user.click(button);
		// Should not throw
	});

	it("calls onCopySuccess when copy succeeds", async () => {
		const onCopySuccess = vi.fn();
		const user = userEvent.setup();

		// Mock successful copy
		const { useCopyToClipboard } = await import("@/hooks/useCopyToClipboard");
		vi.mocked(useCopyToClipboard).mockReturnValue({
			copy: vi.fn(async () => true),
			copied: false,
			error: null,
		});

		render(<CopyButton text="Test value" onCopySuccess={onCopySuccess} />);
		const button = screen.getByTestId("analytics-copy-button");

		await user.click(button);

		await waitFor(() => {
			expect(onCopySuccess).toHaveBeenCalledWith("Test value");
		});
	});

	it("prevents event propagation on click", async () => {
		const onClick = vi.fn();
		const user = userEvent.setup();

		render(
			<div onClick={onClick}>
				<CopyButton text="Test value" />
			</div>,
		);

		const button = screen.getByTestId("analytics-copy-button");
		await user.click(button);

		// Parent onClick should not be called due to stopPropagation
		expect(onClick).not.toHaveBeenCalled();
	});

	it("shows Check icon when copied state is true", () => {
		const { useCopyToClipboard } = require("@/hooks/useCopyToClipboard");
		vi.mocked(useCopyToClipboard).mockReturnValue({
			copy: vi.fn(async () => true),
			copied: true,
			error: null,
		});

		render(<CopyButton text="Test value" />);
		const button = screen.getByTestId("analytics-copy-button");
		expect(button).toHaveAttribute("title", "Copied!");
	});

	it("shows AlertCircle icon and disables button when error occurs", () => {
		const { useCopyToClipboard } = require("@/hooks/useCopyToClipboard");
		vi.mocked(useCopyToClipboard).mockReturnValue({
			copy: vi.fn(async () => false),
			copied: false,
			error: "Copy failed",
		});

		render(<CopyButton text="Test value" />);
		const button = screen.getByTestId("analytics-copy-button");
		expect(button).toHaveAttribute("title", "Copy failed");
		expect(button).toBeDisabled();
	});

	it("calls onCopyError when copy fails", async () => {
		const onCopyError = vi.fn();
		const user = userEvent.setup();

		const { useCopyToClipboard } = await import("@/hooks/useCopyToClipboard");
		vi.mocked(useCopyToClipboard).mockReturnValue({
			copy: vi.fn(async () => {
				throw new Error("Copy failed");
			}),
			copied: false,
			error: null,
		});

		render(<CopyButton text="Test value" onCopyError={onCopyError} />);
		const button = screen.getByTestId("analytics-copy-button");

		await user.click(button);

		await waitFor(() => {
			expect(onCopyError).toHaveBeenCalledWith("Copy failed");
		});
	});

	it("supports different size variants", () => {
		const { rerender } = render(<CopyButton text="Test value" size="sm" />);
		let button = screen.getByTestId("analytics-copy-button");
		expect(button.className).toContain("size-sm");

		rerender(<CopyButton text="Test value" size="default" />);
		button = screen.getByTestId("analytics-copy-button");
		expect(button.className).toContain("size-default");
	});

	it("has hover scale animation", () => {
		render(<CopyButton text="Test value" />);
		const button = screen.getByTestId("analytics-copy-button");
		expect(button.className).toContain("hover:scale-110");
	});

	it("has transition-all class for smooth animations", () => {
		render(<CopyButton text="Test value" />);
		const button = screen.getByTestId("analytics-copy-button");
		expect(button.className).toContain("transition-all");
	});
});
