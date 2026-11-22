import { describe, expect, it } from "vitest";
import { MOCK_AUDIT_ENTRIES } from "./mock-entries";
import {
	type AuditPaginationState,
	auditPaginationReducer,
	canLoadMore,
	initialAuditPaginationState,
} from "./pagination-state";

const firstPage = MOCK_AUDIT_ENTRIES.slice(0, 3);
const secondPage = MOCK_AUDIT_ENTRIES.slice(3, 6);

function readyState(
	overrides: Partial<AuditPaginationState> = {},
): AuditPaginationState {
	return {
		...initialAuditPaginationState,
		items: [...firstPage],
		nextCursor: "cursor_1",
		status: "ready",
		...overrides,
	};
}

describe("auditPaginationReducer", () => {
	it("reset increments generation and restores initial fields", () => {
		const state = readyState({
			generation: 4,
			error: { kind: "failed", code: "network" },
		});
		const next = auditPaginationReducer(state, { type: "reset" });

		expect(next.generation).toBe(5);
		expect(next.items).toEqual(initialAuditPaginationState.items);
		expect(next.nextCursor).toBe(initialAuditPaginationState.nextCursor);
		expect(next.status).toBe(initialAuditPaginationState.status);
		expect(next.error).toBe(initialAuditPaginationState.error);
	});

	it("drops a success action with a stale generation", () => {
		const state = readyState({ generation: 2 });
		const next = auditPaginationReducer(state, {
			type: "success",
			generation: 1,
			page: { items: [...secondPage], nextCursor: "cursor_2", hasMore: true },
		});

		expect(next).toBe(state);
	});

	it("does not duplicate items already present", () => {
		const state = readyState({ generation: 1 });
		const next = auditPaginationReducer(state, {
			type: "success",
			generation: 1,
			page: {
				items: [firstPage[0], ...secondPage],
				nextCursor: "cursor_2",
				hasMore: true,
			},
		});

		expect(next.items.map((entry) => entry.id)).toEqual([
			...firstPage.map((entry) => entry.id),
			...secondPage.map((entry) => entry.id),
		]);
		expect(next.status).toBe("ready");
	});

	it("transitions to exhausted when nextCursor is null", () => {
		const state = readyState({ generation: 1 });
		const next = auditPaginationReducer(state, {
			type: "success",
			generation: 1,
			page: { items: [...secondPage], nextCursor: null, hasMore: false },
		});

		expect(next.status).toBe("exhausted");
		expect(next.nextCursor).toBeNull();
		expect(canLoadMore(next)).toBe(false);
	});

	it("clears nextCursor on invalid_cursor failure", () => {
		const state = readyState({ generation: 1 });
		const next = auditPaginationReducer(state, {
			type: "failure",
			generation: 1,
			error: { kind: "failed", code: "invalid_cursor", correlationId: null },
		});

		expect(next.nextCursor).toBeNull();
		expect(canLoadMore(next)).toBe(false);
	});

	it("keeps nextCursor on other failure codes", () => {
		const state = readyState({ generation: 1 });
		const next = auditPaginationReducer(state, {
			type: "failure",
			generation: 1,
			error: { kind: "failed", code: "network", correlationId: null },
		});

		expect(next.nextCursor).toBe("cursor_1");
		expect(next.error).toEqual({
			kind: "failed",
			code: "network",
			correlationId: null,
		});
	});
});

describe("canLoadMore", () => {
	it("is false while loading", () => {
		expect(canLoadMore(readyState({ status: "loading" }))).toBe(false);
	});

	it("is false when exhausted", () => {
		expect(
			canLoadMore(readyState({ status: "exhausted", nextCursor: null })),
		).toBe(false);
	});

	it("is true when ready with a cursor", () => {
		expect(canLoadMore(readyState())).toBe(true);
	});

	it("is true before the first page has loaded", () => {
		expect(canLoadMore(initialAuditPaginationState)).toBe(true);
	});

	it("is false when started with no cursor left", () => {
		expect(
			canLoadMore(readyState({ started: true, nextCursor: null })),
		).toBe(false);
	});

	it("is false after an invalid_cursor failure", () => {
		expect(
			canLoadMore(
				readyState({
					started: true,
					nextCursor: null,
					status: "error",
					error: { kind: "failed", code: "invalid_cursor", correlationId: null },
				}),
			),
		).toBe(false);
	});

	it("is true after a retryable failure that keeps the cursor", () => {
		expect(
			canLoadMore(
				readyState({
					started: true,
					status: "error",
					error: { kind: "failed", code: "network", correlationId: null },
				}),
			),
		).toBe(true);
	});
});
