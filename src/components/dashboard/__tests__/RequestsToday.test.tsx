import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
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

	it("renders an empty state when there are no requests", async () => {
		global.fetch = vi.fn(() =>
			Promise.resolve({
				ok: true,
				json: () => Promise.resolve({ count: 0 }),
			}),
		) as unknown as typeof fetch;

		render(<RequestsToday />);

		await waitFor(() => {
			expect(
				screen.getByText(/no api requests have been recorded today/i),
			).toBeInTheDocument();
		});
	});

	it("renders an error state and retries the request", async () => {
		global.fetch = vi
			.fn()
			.mockResolvedValueOnce({
				ok: false,
				status: 500,
				json: () => Promise.resolve({}),
			})
			.mockResolvedValueOnce({
				ok: true,
				json: () => Promise.resolve({ count: 42 }),
			}) as unknown as typeof fetch;

		render(<RequestsToday />);

		await waitFor(() => {
			expect(
				screen.getByText(/requests could not be loaded/i),
			).toBeInTheDocument();
		});

		fireEvent.click(
			screen.getByRole("button", { name: /refresh api requests today/i }),
		);

		await waitFor(() => {
			expect(screen.getByText("42")).toBeInTheDocument();
		});
	});
});
