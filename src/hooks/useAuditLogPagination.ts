"use client";

import { useCallback, useEffect, useReducer, useRef } from "react";
import {
	type AuditFilters,
	DEFAULT_AUDIT_PAGE_SIZE,
	parseAuditPage,
	toAuditSearchParams,
} from "@/lib/audit/pagination";
import {
	type AuditLoadError,
	type AuditPaginationState,
	auditPaginationReducer,
	canLoadMore,
	initialAuditPaginationState,
} from "@/lib/audit/pagination-state";
import { readCorrelationId } from "@/lib/http/correlation";
import { classifyServiceUnavailable } from "@/lib/http/maintenance";
import { fetchWithRetryAfter } from "@/lib/http/retry-after";

export interface UseAuditLogPaginationOptions {
	filters?: AuditFilters;
	limit?: number;
	endpoint?: string;
	fetchImpl?: typeof fetch;
}

export interface UseAuditLogPagination extends AuditPaginationState {
	loadMore: () => void;
	restart: () => void;
	canLoadMore: boolean;
}

async function errorCode(response: Response): Promise<string> {
	try {
		const body = (await response.json()) as { error?: { code?: unknown } };
		const code = body?.error?.code;
		return typeof code === "string" ? code : `http_${response.status}`;
	} catch {
		return `http_${response.status}`;
	}
}

/**
 * Cursor-paginated audit log reader for `/api/activity` (issue #804).
 * Reloads from page 1 whenever the filters change.
 */
export function useAuditLogPagination({
	filters = {},
	limit = DEFAULT_AUDIT_PAGE_SIZE,
	endpoint = "/api/activity",
	fetchImpl,
}: UseAuditLogPaginationOptions = {}): UseAuditLogPagination {
	const [state, dispatch] = useReducer(
		auditPaginationReducer,
		initialAuditPaginationState,
	);
	const abortRef = useRef<AbortController | null>(null);
	// Held in a ref so an inline fetchImpl doesn't restart pagination each render.
	const fetchImplRef = useRef(fetchImpl);
	useEffect(() => {
		fetchImplRef.current = fetchImpl;
	}, [fetchImpl]);
	const filterKey = JSON.stringify(filters);

	const fetchPage = useCallback(
		async (generation: number, cursor: string | null) => {
			abortRef.current?.abort();
			const controller = new AbortController();
			abortRef.current = controller;
			dispatch({ type: "request", generation });

			const params = toAuditSearchParams({
				filters: JSON.parse(filterKey) as AuditFilters,
				cursor,
				limit,
			});

			let error: AuditLoadError;
			try {
				const result = await fetchWithRetryAfter(
					`${endpoint}?${params.toString()}`,
					{ signal: controller.signal, credentials: "same-origin" },
					{ fetchImpl: fetchImplRef.current },
				);
				if (result.kind === "rate_limited") {
					error = {
						kind: "rate_limited",
						retryAt: result.rateLimit.retryAt,
						correlationId: result.rateLimit.correlationId,
					};
				} else if (result.response.ok) {
					const page = parseAuditPage(await result.response.json(), limit);
					if (page) {
						dispatch({ type: "success", generation, page });
						return;
					}
					error = {
						kind: "failed",
						code: "invalid_response",
						correlationId: readCorrelationId(result.response.headers),
					};
				} else {
					const unavailable = classifyServiceUnavailable(result.response);
					error = unavailable
						? { kind: "unavailable", state: unavailable }
						: {
								kind: "failed",
								code: await errorCode(result.response),
								correlationId: readCorrelationId(result.response.headers),
							};
				}
			} catch (cause) {
				if (controller.signal.aborted) return;
				error = {
					kind: "failed",
					code: cause instanceof TypeError ? "network_error" : "unexpected",
					correlationId: null,
				};
			}
			dispatch({ type: "failure", generation, error });
		},
		[endpoint, filterKey, limit],
	);

	// New filters/limit/endpoint: start a fresh generation from page 1.
	const queryRef = useRef(fetchPage);
	useEffect(() => {
		if (queryRef.current === fetchPage) return;
		queryRef.current = fetchPage;
		dispatch({ type: "reset" });
	}, [fetchPage]);

	useEffect(() => {
		if (!state.started && state.status === "idle") {
			void fetchPage(state.generation, null);
		}
	}, [fetchPage, state.generation, state.started, state.status]);

	useEffect(() => () => abortRef.current?.abort(), []);

	const loadMore = useCallback(() => {
		if (!canLoadMore(state)) return;
		void fetchPage(state.generation, state.nextCursor);
	}, [fetchPage, state]);

	const restart = useCallback(() => dispatch({ type: "reset" }), []);

	return { ...state, loadMore, restart, canLoadMore: canLoadMore(state) };
}
