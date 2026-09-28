"use client";

import { useRetryCountdown } from "@/hooks/useRetryCountdown";
import { formatRetryCountdown } from "@/lib/http/retry-after";

interface RateLimitNoticeProps {
	/** Epoch ms after which a retry is allowed (from `classifyRateLimit`). */
	retryAt: number;
	correlationId?: string | null;
	onRetry?: () => void;
	/** Short noun for what was throttled, e.g. "audit log requests". */
	subject?: string;
	now?: () => number;
}

/**
 * 429 Retry-After UX (issue #801). Shows the server-requested wait and keeps
 * the retry control disabled until it has elapsed, so users cannot hammer a
 * rate-limited endpoint. Writes re-submit with their original Idempotency-Key.
 */
export function RateLimitNotice({
	retryAt,
	correlationId,
	onRetry,
	subject = "requests",
	now,
}: RateLimitNoticeProps) {
	const { remainingMs, ready } = useRetryCountdown(retryAt, now);

	return (
		<div
			role="status"
			aria-live="polite"
			data-testid="rate-limit-notice"
			data-code="RATE_LIMITED"
			className="rounded-md border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900"
		>
			<p className="font-medium">Too many {subject}</p>
			<p>
				{ready ? (
					"You can try again now."
				) : (
					<>
						Try again in{" "}
						<span data-testid="rate-limit-countdown">
							{formatRetryCountdown(remainingMs)}
						</span>
						.
					</>
				)}
			</p>
			{correlationId ? (
				<p className="mt-1 text-xs text-amber-800">
					Support reference:{" "}
					<code data-testid="rate-limit-correlation-id">{correlationId}</code>
				</p>
			) : null}
			{onRetry ? (
				<button
					type="button"
					onClick={onRetry}
					disabled={!ready}
					data-testid="rate-limit-retry"
					className="mt-2 rounded border border-amber-400 px-3 py-1 font-medium disabled:cursor-not-allowed disabled:opacity-50"
				>
					Retry
				</button>
			) : null}
		</div>
	);
}
