import { render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import ActivityPage from "./page";

function jsonResponse(body: unknown, status = 200): Response {
	return new Response(JSON.stringify(body), {
		status,
		headers: { "content-type": "application/json" },
	});
}

describe("ActivityPage", () => {
	afterEach(() => {
		vi.unstubAllGlobals();
		vi.restoreAllMocks();
	});

	beforeEach(() => {
		vi.spyOn(console, "error").mockImplementation(() => {});
	});

	it("renders an unauthorized/error message and no rows on 401", async () => {
		vi.stubGlobal(
			"fetch",
			vi.fn(async () =>
				jsonResponse({ error: { code: "unauthorized" } }, 401),
			),
		);

		render(<ActivityPage />);

		await waitFor(() => {
			expect(
				screen.getByText(/unauthorized|not authorized|permission/i),
			).toBeInTheDocument();
		});
		expect(screen.queryByRole("listitem")).not.toBeInTheDocument();
	});

	it("renders audit rows on a 200 response", async () => {
		vi.stubGlobal(
			"fetch",
			vi.fn(async () =>
				jsonResponse({
					entries: [
						{
							id: "evt_1",
							action: "user.login",
							actor: "alice",
							createdAt: "2024-01-01T00:00:00.000Z",
						},
					],
					nextCursor: null,
				}),
			),
		);

		render(<ActivityPage />);

		await waitFor(() => {
			expect(screen.getByText(/user\.login/)).toBeInTheDocument();
		});
	});
});
