import { render, screen, waitFor } from "@testing-library/react";
import { describe, it, vi, beforeEach, afterEach, expect } from "vitest";
import Overview from "./Overview";

const overviewData = { data: { projects: 5 } };

describe("Overview", () => {
	beforeEach(() => {
		vi.stubGlobal("fetch", vi.fn());
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	it("renders active project count after fetching overview", async () => {
		// @ts-ignore
		fetch.mockResolvedValueOnce({ ok: true, json: async () => overviewData });

		render(<Overview />);

		await waitFor(() => {
			expect(screen.getByText(/Active projects:/i)).toBeInTheDocument();
			expect(screen.getByText(/5/)).toBeInTheDocument();
		});
	});

	it("shows an empty state when there are no projects", async () => {
		// @ts-ignore
		fetch.mockResolvedValueOnce({
			ok: true,
			json: async () => ({ data: { projects: 0 } }),
		});

		render(<Overview />);

		await waitFor(() => {
			expect(screen.getByText(/No projects/i)).toBeInTheDocument();
			expect(
				screen.getByRole("button", { name: /Create Project/i }),
			).toBeInTheDocument();
		});
	});

	it("shows an error state for network failures", async () => {
		// @ts-ignore
		fetch.mockResolvedValueOnce({ ok: false, status: 500 });

		render(<Overview />);

		await waitFor(() => {
			expect(screen.getByText(/Something went wrong/i)).toBeInTheDocument();
		});
	});

	it("shows an error state for invalid server payloads", async () => {
		// @ts-ignore
		fetch.mockResolvedValueOnce({
			ok: true,
			json: async () => ({ invalid: true }),
		});

		render(<Overview />);

		await waitFor(() => {
			expect(screen.getByText(/Something went wrong/i)).toBeInTheDocument();
			expect(
				screen.getByText(/Overview response is invalid/i),
			).toBeInTheDocument();
		});
	});
});
