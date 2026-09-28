import type { ServiceUnavailableState } from "@/lib/http/maintenance";
import type { AuditEntry, AuditPage } from "./pagination";

/**
 * Client state machine for "load more" audit log pagination (issue #804).
 *
 *  - Every filter change starts a new `generation`; responses from an older
 *    generation are dropped so a slow page for stale filters can never be
 *    appended to the current view.
 *  - Only one page request is in flight at a time (the UI disables "Load
 *    more" while `loading`), and appended pages are de-duplicated by id.
 *  - A failed page keeps the rows already loaded and leaves `nextCursor`
 *    unchanged, so retrying re-requests the same page (idempotent read).
 *  - `invalid_cursor` clears the cursor; the user must restart from page 1.
 */

export type AuditLoadError =
	| { kind: "rate_limited"; retryAt: number; correlationId: string | null }
	| { kind: "unavailable"; state: ServiceUnavailableState }
	| { kind: "failed"; code: string; correlationId: string | null };

export type AuditPaginationStatus =
	| "idle"
	| "loading"
	| "ready"
	| "exhausted"
	| "error";

export interface AuditPaginationState {
	generation: number;
	items: AuditEntry[];
	nextCursor: string | null;
	/** True once the first page for the current generation has loaded. */
	started: boolean;
	status: AuditPaginationStatus;
	error: AuditLoadError | null;
}

export type AuditPaginationAction =
	| { type: "reset" }
	| { type: "request"; generation: number }
	| { type: "success"; generation: number; page: AuditPage }
	| { type: "failure"; generation: number; error: AuditLoadError };

export const initialAuditPaginationState: AuditPaginationState = {
	generation: 0,
	items: [],
	nextCursor: null,
	started: false,
	status: "idle",
	error: null,
};

export function auditPaginationReducer(
	state: AuditPaginationState,
	action: AuditPaginationAction,
): AuditPaginationState {
	if (action.type === "reset") {
		return {
			...initialAuditPaginationState,
			generation: state.generation + 1,
		};
	}
	if (action.generation !== state.generation) return state;

	switch (action.type) {
		case "request":
			return { ...state, status: "loading", error: null };
		case "success": {
			const seen = new Set(state.items.map((item) => item.id));
			const fresh = action.page.items.filter((item) => !seen.has(item.id));
			return {
				...state,
				items: [...state.items, ...fresh],
				nextCursor: action.page.nextCursor,
				started: true,
				status: action.page.nextCursor === null ? "exhausted" : "ready",
				error: null,
			};
		}
		case "failure": {
			const cursorRejected =
				action.error.kind === "failed" &&
				action.error.code === "invalid_cursor";
			return {
				...state,
				nextCursor: cursorRejected ? null : state.nextCursor,
				status: "error",
				error: action.error,
			};
		}
	}
}

/** Whether a "load more" request may be issued from this state. */
export function canLoadMore(state: AuditPaginationState): boolean {
	if (state.status === "loading" || state.status === "exhausted") return false;
	if (state.error?.kind === "failed" && state.error.code === "invalid_cursor") {
		return false;
	}
	return !state.started || state.nextCursor !== null;
}
