"use client";

import { useRetryCountdown } from "@/hooks/useRetryCountdown";
import {
	SERVICE_UNAVAILABLE_COPY,
	type ServiceUnavailableState,
} from "@/lib/http/maintenance";
import { formatRetryCountdown } from "@/lib/http/retry-after";

interface MaintenanceNoticeProps {
	state: ServiceUnavailableState;
	onRetry?: () => void;
	now?: () => number;
}

/**
 * Maintenance 503 UX (issue #802). Renders fixed copy only — never the
 * server's message — and keeps retry disabled until `Retry-After` elapses.
 * Callers must keep write actions disabled while this notice is shown.
 */
export function MaintenanceNotice({
	state,
	onRetry,
	now,
}: MaintenanceNoticeProps) {
	const { remainingMs, ready } = useRetryCountdown(state.retryAt, now);
	const copy = SERVICE_UNAVAILABLE_COPY[state.code];

	return (
		<div
			role="status"
			aria-live="polite"
			data-testid="maintenance-notice"
			data-code={state.code}
			className="rounded-md border border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-900"
		>
			<p className="font-medium">{copy.title}</p>
			<p>{copy.body}</p>
			<p className="mt-1" data-testid="maintenance-retry-hint">
				{ready
					? "You can check again now."
					: `We'll be ready to check again in ${formatRetryCountdown(remainingMs)}.`}
			</p>
			{state.correlationId ? (
				<p className="mt-1 text-xs text-slate-600">
					Support reference:{" "}
					<code data-testid="maintenance-correlation-id">
						{state.correlationId}
					</code>
				</p>
			) : null}
			{onRetry ? (
				<button
					type="button"
					onClick={onRetry}
					disabled={!ready}
					data-testid="maintenance-retry"
					className="mt-2 rounded border border-slate-400 px-3 py-1 font-medium disabled:cursor-not-allowed disabled:opacity-50"
				>
					Check again
				</button>
			) : null}
		</div>
	);
}
