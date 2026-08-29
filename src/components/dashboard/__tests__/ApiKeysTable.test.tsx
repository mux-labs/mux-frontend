import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
// Import from the canonical types module, not from mock-data (#707).
import type { ApiKey } from "@/types/api-key";
import { ApiKeysTable } from "../ApiKeysTable";

const activeKey: ApiKey = {
	id: "test-1",
	name: "Test Key",
	key: "sk_live_abc123...",
	status: "Active",
	createdAt: "2024-01-15T10:00:00Z",
};

const revokedKey: ApiKey = {
	id: "test-2",
	name: "Old Key",
	key: "sk_live_xyz789...",
	status: "Revoked",
	createdAt: "2023-12-01T09:00:00Z",
};

// ---------------------------------------------------------------------------
// Feature 3: Empty state
// ---------------------------------------------------------------------------
describe("ApiKeysTable — empty state", () => {
	it("shows empty state when no keys are provided", () => {
		render(<ApiKeysTable initialKeys={[]} />);
		expect(screen.getByText("No API keys yet")).toBeInTheDocument();
		expect(screen.getByText(/Create your first API key/i)).toBeInTheDocument();
	});

	it("shows the table when keys exist", () => {
		render(<ApiKeysTable initialKeys={[activeKey]} />);
		expect(screen.queryByText("No API keys yet")).not.toBeInTheDocument();
		expect(screen.getByText("Test Key")).toBeInTheDocument();
	});

	it("empty state action button opens the create modal", async () => {
		const user = userEvent.setup();
		render(<ApiKeysTable initialKeys={[]} />);
		await user.click(screen.getByRole("button", { name: /create new key/i }));
		expect(
			screen.getByRole("dialog", { name: /create api key/i }),
		).toBeInTheDocument();
	});
});

// ---------------------------------------------------------------------------
// Feature 1: Revoke confirmation modal
// ---------------------------------------------------------------------------
describe("ApiKeysTable — revoke confirmation", () => {
	it("shows Revoke button only for active keys", () => {
		render(<ApiKeysTable initialKeys={[activeKey, revokedKey]} />);
		expect(screen.getByTestId("revoke-btn-test-1")).toBeInTheDocument();
		expect(screen.queryByTestId("revoke-btn-test-2")).not.toBeInTheDocument();
	});

	it("opens confirmation dialog when Revoke is clicked", async () => {
		const user = userEvent.setup();
		render(<ApiKeysTable initialKeys={[activeKey]} />);
		await user.click(screen.getByTestId("revoke-btn-test-1"));
		expect(
			screen.getByRole("alertdialog", { name: /revoke api key/i }),
		).toBeInTheDocument();
		expect(screen.getByText(/Test Key/)).toBeInTheDocument();
	});

	it("closes dialog without revoking when Cancel is clicked", async () => {
		const user = userEvent.setup();
		render(<ApiKeysTable initialKeys={[activeKey]} />);
		await user.click(screen.getByTestId("revoke-btn-test-1"));
		await user.click(screen.getByRole("button", { name: /cancel/i }));
		expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
		// Key should still be Active
		expect(screen.getByText("Active")).toBeInTheDocument();
	});

	it("revokes the key when confirmed", async () => {
		const user = userEvent.setup();
		render(<ApiKeysTable initialKeys={[activeKey]} />);
		await user.click(screen.getByTestId("revoke-btn-test-1"));
		await user.click(screen.getByRole("button", { name: /revoke key/i }));
		expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
		// Revoke button should be gone; "Revoked" text should appear
		expect(screen.queryByTestId("revoke-btn-test-1")).not.toBeInTheDocument();
		expect(screen.getByText("Revoked")).toBeInTheDocument();
	});
});

// ---------------------------------------------------------------------------
// Feature 4: Copy key to clipboard feedback
// ---------------------------------------------------------------------------
describe("ApiKeysTable — copy key feedback", () => {
	it("copies the key and shows feedback", async () => {
		const user = userEvent.setup();
		render(<ApiKeysTable initialKeys={[activeKey]} />);
		const copyBtn = screen.getByTestId("copy-key-test-1");
		await user.click(copyBtn);
		expect(navigator.clipboard.writeText).toHaveBeenCalledWith(activeKey.key);
		// aria-label changes to copied feedback
		await waitFor(() =>
			expect(copyBtn).toHaveAttribute(
				"aria-label",
				"API key copied to clipboard",
			),
		);
		expect(screen.getByRole("status")).toHaveTextContent("API key copied");
	});

	it("resets copy feedback after timeout", async () => {
		vi.useFakeTimers();
		const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
		render(<ApiKeysTable initialKeys={[activeKey]} />);
		await user.click(screen.getByTestId("copy-key-test-1"));
		await waitFor(() =>
			expect(screen.getByTestId("copy-key-test-1")).toHaveAttribute(
				"aria-label",
				"API key copied to clipboard",
			),
		);
		vi.advanceTimersByTime(2100);
		await waitFor(() =>
			expect(screen.getByTestId("copy-key-test-1")).toHaveAttribute(
				"aria-label",
				"Copy API key to clipboard",
			),
		);
		vi.useRealTimers();
	});
});
