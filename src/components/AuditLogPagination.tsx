"use client";

import { MaintenanceNotice } from "@/components/MaintenanceNotice";
import { RateLimitNotice } from "@/components/RateLimitNotice";
import {
	type UseAuditLogPaginationOptions,
	useAuditLogPagination,
} from "@/hooks/useAuditLogPagination";

const FAILURE_COPY: Record<string, string> = {
	unauthorized:
		"Your session has expired. Sign in again to view the audit log.",
	forbidden: "Only admins can view the audit log.",
	invalid_filter: "One of the filters is invalid. Adjust it and try again.",
	invalid_cursor:
		"This page is no longer valid. Start again from the latest entries.",
	invalid_response: "The audit log returned an unexpected response.",
	network_error: "Couldn't reach the server. Check your connection.",
};

/**
 * Cursor-paginated audit log (issue #804). "Load more" appends the next page;
 * failures keep the rows already loaded and retry the same cursor.
 */
export function AuditLogPagination(props: UseAuditLogPaginationOptions) {
	const log = useAuditLogPagination(props);
	const { error } = log;
	const cursorRejected =
		error?.kind === "failed" && error.code === "invalid_cursor";

	return (
		<section aria-label="Audit log" data-testid="audit-log">
			{log.started && log.items.length === 0 ? (
				<p role="status" data-testid="audit-log-empty">
					No audit events match these filters.
				</p>
			) : (
				<table className="w-full text-left text-sm">
					<thead>
						<tr>
							<th scope="col">Time</th>
							<th scope="col">Actor</th>
							<th scope="col">Action</th>
							<th scope="col">Network</th>
						</tr>
					</thead>
					<tbody>
						{log.items.map((entry) => (
							<tr key={entry.id} data-testid="audit-log-row" data-id={entry.id}>
								<td>
									<time dateTime={entry.createdAt}>
										{new Date(entry.createdAt).toLocaleString()}
									</time>
								</td>
								<td>{entry.actor}</td>
								<td>{entry.action}</td>
								<td>{entry.network}</td>
							</tr>
						))}
					</tbody>
				</table>
			)}

			{error?.kind === "rate_limited" ? (
				<RateLimitNotice
					retryAt={error.retryAt}
					correlationId={error.correlationId}
					onRetry={log.loadMore}
					subject="audit log requests"
				/>
			) : null}
			{error?.kind === "unavailable" ? (
				<MaintenanceNotice state={error.state} onRetry={log.loadMore} />
			) : null}
			{error?.kind === "failed" ? (
				<div role="alert" data-testid="audit-log-error" data-code={error.code}>
					<p>
						{FAILURE_COPY[error.code] ?? "The audit log couldn't be loaded."}
					</p>
					{error.correlationId ? (
						<p className="text-xs">
							Support reference: <code>{error.correlationId}</code>
						</p>
					) : null}
				</div>
			) : null}

			<div className="mt-3 flex gap-2">
				{cursorRejected ? (
					<button
						type="button"
						onClick={log.restart}
						data-testid="audit-log-restart"
					>
						Start over
					</button>
				) : log.status === "exhausted" ? (
					<p data-testid="audit-log-end">
						You&apos;ve reached the oldest entry.
					</p>
				) : error?.kind === "rate_limited" ||
					error?.kind === "unavailable" ? null : (
					<button
						type="button"
						onClick={log.loadMore}
						disabled={!log.canLoadMore}
						aria-busy={log.status === "loading"}
						data-testid="audit-log-load-more"
					>
						{log.status === "loading"
							? "Loading…"
							: error
								? "Retry"
								: log.started
									? "Load more"
									: "Load"}
					</button>
				)}
			</div>
		</section>
	);
}
