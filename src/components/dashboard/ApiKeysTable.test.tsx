import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useApiKeys } from "@/hooks/useApiKeys";
import { mockApiKeys } from "@/mock-data/api-keys";
import { ApiKeysTable } from "./ApiKeysTable";

vi.mock("@/hooks/useApiKeys", () => ({
	useApiKeys: vi.fn(),
}));

const mockUseApiKeys = vi.mocked(useApiKeys);

describe("ApiKeysTable", () => {
	beforeEach(() => {
		mockUseApiKeys.mockReset();
		mockUseApiKeys.mockReturnValue({
			data: mockApiKeys,
			loading: false,
			error: null,
			refetch: vi.fn(),
		});
	});

	it("renders API keys table", () => {
		render(<ApiKeysTable />);
		expect(screen.getByText("API Keys")).toBeInTheDocument();
	});

	it("displays mock API keys", () => {
		render(<ApiKeysTable />);
		expect(screen.getByText("Default Key")).toBeInTheDocument();
		expect(screen.getByText("Development Key")).toBeInTheDocument();
	});

	it("opens modal when create button is clicked", () => {
		render(<ApiKeysTable />);

		const createButton = screen.getByText("Create new key");
		fireEvent.click(createButton);

		expect(screen.getByText("Create API Key")).toBeInTheDocument();
	});

	it("adds new key when modal creates one", async () => {
		render(<ApiKeysTable />);

		const createButton = screen.getByText("Create new key");
		fireEvent.click(createButton);

		const input = screen.getByLabelText(/key name/i);
		fireEvent.change(input, { target: { value: "New Test Key" } });

		const generateButton = screen.getByText(/generate key/i);
		fireEvent.click(generateButton);

		await waitFor(() => {
			expect(screen.getByText("New Test Key")).toBeInTheDocument();
		});
	});

	it("revokes key when revoke button is clicked", async () => {
		render(<ApiKeysTable />);

		const revokeButtons = screen.getAllByText("Revoke");
		fireEvent.click(revokeButtons[0]);
		fireEvent.click(screen.getByTestId("confirm-revoke"));

		await waitFor(() => {
			const revokedBadge = screen.getAllByText("Revoked");
			expect(revokedBadge.length).toBeGreaterThan(0);
		});
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
