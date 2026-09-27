"use client";

/**
 * Notifications empty story.
 *
 * Empty state for the notifications panel: shown when the server confirms
 * there are no notifications. A load failure renders a distinct error state
 * so an outage is never presented as "no notifications".
 */

interface NotificationsEmptyProps {
	status: "empty" | "error";
	correlationId?: string;
	onRetry?: () => void;
}

export function NotificationsEmpty({
	status,
	correlationId,
	onRetry,
}: NotificationsEmptyProps) {
	if (status === "error") {
		return (
			<div role="alert" data-testid="notifications-error">
				<h3>Could not load notifications</h3>
				<p>
					Your notifications are unavailable right now. Nothing has been marked
					as read.
				</p>
				{correlationId && <p>Reference: {correlationId}</p>}
				{onRetry && (
					<button type="button" onClick={onRetry}>
						Try again
					</button>
				)}
			</div>
		);
	}

	return (
		<div role="status" data-testid="notifications-empty">
			<h3>You are all caught up</h3>
			<p>New wallet, payment and security notifications will appear here.</p>
		</div>
	);
}

const meta = {
	title: "Notifications/Empty",
	component: NotificationsEmpty,
};

export default meta;

export const Empty = { args: { status: "empty" } };

export const LoadError = {
	args: { status: "error", correlationId: "corr_123", onRetry: () => {} },
};
