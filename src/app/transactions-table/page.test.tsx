import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Transaction } from "@/types/transaction";
import Page from "./page";

const SAMPLE_TX: Transaction = {
	hash: "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
	from: "GBZXN7PIRZGNMHGA7MUUUF4GWPY5AYPV6LY4UV2GL6VJGIQRXFDNMADI",
	to: "GCFONE23AB7Y6C5YZOMKUKGETPIAJA752ZPMORQO5VKA6LHXHC7Y3YPE",
	amountXlm: "250.0000000",
	memo: "payment-ref-001",
	ledger: 1000,
	fee: "0.0000100",
	network: "mainnet",
	status: "completed",
	createdAt: "2025-05-28T14:22:00Z",
};

function mockFetch(options?: { fails?: boolean; payload?: Transaction[] }) {
	const fetchMock = vi.fn(() => {
		if (options?.fails) {
			return Promise.resolve({ ok: false, status: 500 });
		}
		return Promise.resolve({
			ok: true,
			status: 200,
			json: async () => options?.payload ?? [SAMPLE_TX],
		});
	});
	vi.stubGlobal("fetch", fetchMock);
	return fetchMock;
}

describe("Transactions table page", () => {
	afterEach(() => {
		vi.unstubAllGlobals();
		vi.restoreAllMocks();
	});

	it("renders the loading skeleton before the fetch resolves", () => {
		mockFetch();
		render(<Page />);
		expect(screen.getByTestId("transactions-loading")).toBeInTheDocument();
	});

	it("renders fetched transactions once loading completes", async () => {
		mockFetch({ payload: [SAMPLE_TX] });
		render(<Page />);
		await waitFor(() =>
			expect(screen.getAllByTestId("tx-row").length).toBeGreaterThan(0),
		);
	});

	it("renders the empty state when the API returns no transactions", async () => {
		mockFetch({ payload: [] });
		render(<Page />);
		await waitFor(() =>
			expect(screen.getByText("No transactions yet")).toBeInTheDocument(),
		);
	});

	it("renders the error state when the fetch fails", async () => {
		mockFetch({ fails: true });
		render(<Page />);
		await waitFor(() =>
			expect(screen.getByText("Something went wrong")).toBeInTheDocument(),
		);
	});

	it("refetches when the retry button is clicked", async () => {
		const fetchMock = mockFetch({ fails: true });
		const user = userEvent.setup();
		render(<Page />);

		await waitFor(() =>
			expect(screen.getByRole("button", { name: /try again/i })).toBeInTheDocument(),
		);

		fetchMock.mockImplementation(() =>
			Promise.resolve({
				ok: true,
				status: 200,
				json: async () => [SAMPLE_TX],
			}),
		);

		await user.click(screen.getByRole("button", { name: /try again/i }));

		await waitFor(() =>
			expect(screen.getAllByTestId("tx-row").length).toBeGreaterThan(0),
		);
	});
});
