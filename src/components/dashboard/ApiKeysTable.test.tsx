import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import type { ApiKey } from "@/mock-data/api-keys";
import { ApiKeysTable } from "./ApiKeysTable";

const activeKey: ApiKey = {
	id: "test-1",
	name: "Default Key",
	key: "mux_sk_a••••1234",
	status: "Active",
	createdAt: "2026-07-26T00:00:00.000Z",
};

describe("ApiKeysTable", () => {
	it("renders masked API key values", () => {
		render(<ApiKeysTable initialKeys={[activeKey]} />);

		expect(
			screen.getByRole("table", { name: /api keys/i }),
		).toBeInTheDocument();
		expect(screen.getByText("Default Key")).toBeInTheDocument();
		expect(screen.getByText("mux_sk_a••••1234")).toBeInTheDocument();
	});

	it("opens the create modal and adds a new masked key", async () => {
		const user = userEvent.setup();
		render(<ApiKeysTable initialKeys={[]} />);

		await user.click(screen.getByRole("button", { name: /create new key/i }));
		await user.type(screen.getByLabelText(/key name/i), "New Test Key");
		await user.click(screen.getByTestId("generate-key-btn"));
		await user.click(await screen.findByTestId("acknowledge-checkbox"));
		await user.click(screen.getByTestId("done-btn"));

		expect(screen.getByText("New Test Key")).toBeInTheDocument();
	});

	it("revokes a key only after confirmation", async () => {
		const user = userEvent.setup();
		render(<ApiKeysTable initialKeys={[activeKey]} />);

		await user.click(screen.getByTestId("revoke-btn-test-1"));
		expect(
			screen.getByRole("alertdialog", { name: /revoke api key/i }),
		).toBeInTheDocument();

		await user.click(screen.getByRole("button", { name: /revoke key/i }));

		await waitFor(() =>
			expect(screen.queryByTestId("revoke-btn-test-1")).not.toBeInTheDocument(),
		);
		expect(screen.getByText("Revoked")).toBeInTheDocument();
	});

	it("shows loading state while API keys are fetched", () => {
		mockUseApiKeys.mockReturnValue({
			data: null,
			loading: true,
			error: null,
			refetch: vi.fn(),
		});

		render(<ApiKeysTable />);

		expect(screen.getByLabelText("Loading API keys")).toBeInTheDocument();
	});

	it("shows an actionable empty state when no API keys exist", () => {
		mockUseApiKeys.mockReturnValue({
			data: [],
			loading: false,
			error: null,
			refetch: vi.fn(),
		});

		render(<ApiKeysTable />);

		expect(screen.getByText("No API keys yet")).toBeInTheDocument();
		fireEvent.click(screen.getAllByText("Create new key")[1]);
		expect(screen.getByText("Create API Key")).toBeInTheDocument();
	});

	it("shows an error state and retries loading", () => {
		const refetch = vi.fn();
		mockUseApiKeys.mockReturnValue({
			data: null,
			loading: false,
			error: new Error("network"),
			refetch,
		});

		render(<ApiKeysTable />);

		expect(
			screen.getByText("Failed to load API keys. Please try again."),
		).toBeInTheDocument();
		fireEvent.click(screen.getByRole("button", { name: /retry/i }));
		expect(refetch).toHaveBeenCalledTimes(1);
	});
});
