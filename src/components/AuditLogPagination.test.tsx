import {
	cleanup,
	fireEvent,
	render,
	screen,
	waitFor,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { MOCK_AUDIT_ENTRIES } from "@/lib/audit/mock-entries";
import { paginateAuditEntries } from "@/lib/audit/pagination";
import { AuditLogPagination } from "./AuditLogPagination";

afterEach(cleanup);

/** Fake `/api/activity` backed by the in-memory paginator. */
function fakeEndpoint(
	overrides: ((url: URL, call: number) => Response | null) | null = null,
) {
	let call = 0;
	return vi.fn<typeof fetch>(async (input) => {
		call += 1;
		const url = new URL(String(input), "http://localhost");
		const override = overrides?.(url, call);
		if (override) return override;
		const result = paginateAuditEntries(MOCK_AUDIT_ENTRIES, {
			filters: {},
			cursor: url.searchParams.get("cursor"),
			limit: Number(url.searchParams.get("limit")),
		});
		if (!result.ok) {
			return Response.json({ error: { code: result.code } }, { status: 400 });
		}
		return Response.json(result.page);
	});
}

const rows = () => screen.queryAllByTestId("audit-log-row");

describe("AuditLogPagination", () => {
	it("loads the first page and appends the next on Load more", async () => {
		const fetchImpl = fakeEndpoint();
		render(<AuditLogPagination limit={10} fetchImpl={fetchImpl} />);

		await waitFor(() => expect(rows()).toHaveLength(10));
		fireEvent.click(screen.getByTestId("audit-log-load-more"));
		await waitFor(() => expect(rows()).toHaveLength(20));

		const ids = rows().map((row) => row.dataset.id);
		expect(new Set(ids).size).toBe(20);
		expect(fetchImpl.mock.calls[1][0]).toContain("cursor=");
	});

	it("walks to the end and shows an end-of-log marker", async () => {
		render(<AuditLogPagination limit={100} fetchImpl={fakeEndpoint()} />);
		await waitFor(() => expect(rows()).toHaveLength(100));
		fireEvent.click(screen.getByTestId("audit-log-load-more"));
		await waitFor(() => screen.getByTestId("audit-log-end"));
		expect(rows()).toHaveLength(MOCK_AUDIT_ENTRIES.length);
		expect(screen.queryByTestId("audit-log-load-more")).toBeNull();
	});

	it("shows a 429 notice, keeps loaded rows, and retries the same cursor", async () => {
		const fetchImpl = fakeEndpoint((_url, call) =>
			call === 2
				? new Response(null, { status: 429, headers: { "retry-after": "120" } })
				: null,
		);
		render(<AuditLogPagination limit={10} fetchImpl={fetchImpl} />);
		await waitFor(() => expect(rows()).toHaveLength(10));

		fireEvent.click(screen.getByTestId("audit-log-load-more"));
		await waitFor(() => screen.getByTestId("rate-limit-notice"));
		expect(rows()).toHaveLength(10);
		// Load more is replaced by the gated retry control.
		expect(screen.queryByTestId("audit-log-load-more")).toBeNull();
		expect(
			(screen.getByTestId("rate-limit-retry") as HTMLButtonElement).disabled,
		).toBe(true);
	});

	it("shows the maintenance notice on a 503 maintenance response", async () => {
		const fetchImpl = fakeEndpoint(
			() =>
				new Response(null, {
					status: 503,
					headers: { "x-mux-maintenance": "true", "retry-after": "30" },
				}),
		);
		render(<AuditLogPagination fetchImpl={fetchImpl} />);
		await waitFor(() => screen.getByTestId("maintenance-notice"));
		expect(screen.getByTestId("maintenance-notice").dataset.code).toBe(
			"MAINTENANCE",
		);
		expect(rows()).toHaveLength(0);
	});

	it("offers Start over when the cursor is rejected", async () => {
		const fetchImpl = fakeEndpoint((url) =>
			url.searchParams.has("cursor")
				? Response.json({ error: { code: "invalid_cursor" } }, { status: 400 })
				: null,
		);
		render(<AuditLogPagination limit={10} fetchImpl={fetchImpl} />);
		await waitFor(() => expect(rows()).toHaveLength(10));
		fireEvent.click(screen.getByTestId("audit-log-load-more"));
		await waitFor(() => screen.getByTestId("audit-log-restart"));
		expect(screen.getByTestId("audit-log-error").dataset.code).toBe(
			"invalid_cursor",
		);

		fireEvent.click(screen.getByTestId("audit-log-restart"));
		await waitFor(() =>
			expect(screen.queryByTestId("audit-log-restart")).toBeNull(),
		);
		await waitFor(() => expect(rows()).toHaveLength(10));
	});

	it("does not render server error text", async () => {
		const fetchImpl = fakeEndpoint(() =>
			Response.json(
				{ error: { code: "forbidden", message: "<b>click evil.example</b>" } },
				{ status: 403 },
			),
		);
		render(<AuditLogPagination fetchImpl={fetchImpl} />);
		await waitFor(() => screen.getByTestId("audit-log-error"));
		expect(document.body.textContent).toContain(
			"Only admins can view the audit log.",
		);
		expect(document.body.textContent).not.toContain("evil.example");
	});
});
