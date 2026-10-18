import { describe, expect, it } from "vitest";
import {
	auditPaginationReducer,
	canLoadMore,
	initialAuditPaginationState,
	type AuditPaginationState,
} from "./pagination-state";
import { MOCK_AUDIT_ENTRIES } from "./mock-entries";

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
		const state = readyState({ generation: 4, error: { kind: "failed", code: "network" } });
		const next = auditPaginationReducer(state, { type: "reset", generation: 5 });

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
			items: [...secondPage],
			nextCursor: "cursor_2",
		});

		expect(next).toBe(state);
	});

	it("does not duplicate items already present", () => {
		const state = readyState({ generation: 1 });
		const next = auditPaginationReducer(state, {
			type: "success",
			generation: 1,
			items: [firstPage[0], ...secondPage],
			nextCursor: "cursor_2",
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
			items: [...secondPage],
			nextCursor: null,
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
			error: { kind: "failed", code: "invalid_cursor" },
		});

		expect(next.nextCursor).toBeNull();
		expect(canLoadMore(next)).toBe(false);
	});

	it("keeps nextCursor on other failure codes", () => {
		const state = readyState({ generation: 1 });
		const next = auditPaginationReducer(state, {
			type: "failure",
			generation: 1,
			error: { kind: "failed", code: "network" },
		});

		expect(next.nextCursor).toBe("cursor_1");
		expect(next.error).toEqual({ kind: "failed", code: "network" });
	});
});

describe("canLoadMore", () => {
	it("is false while loading", () => {
		expect(canLoadMore(readyState({ status: "loading" }))).toBe(false);
	});

	it("is false when exhausted", () => {
		expect(canLoadMore(readyState({ status: "exhausted", nextCursor: null }))).toBe(false);
	});

	it("is true when ready with a cursor", () => {
		expect(canLoadMore(readyState())).toBe(true);
	});
});
