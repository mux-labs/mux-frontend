import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import { vi } from "vitest";
import RequestsToday from "../RequestsToday";

describe("RequestsToday", () => {
	beforeEach(() => {
		global.fetch = vi.fn(() =>
			Promise.resolve({
				ok: true,
				json: () => Promise.resolve({ count: 123 }),
			}),
		) as unknown as typeof fetch;
	});
	afterEach(() => {
		vi.restoreAllMocks();
	});

	it("renders the fetched count", async () => {
		render(<RequestsToday />);
		expect(screen.getByText(/loading api requests today/i)).toBeInTheDocument();
		await waitFor(() => {
			expect(screen.getByText("123")).toBeInTheDocument();
		});
	});
});
