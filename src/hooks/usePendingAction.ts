import { useCallback, useState } from "react";

/**
 * Tracks in-flight state for a destructive/async action so callers can
 * disable the triggering button while a request is pending, preventing
 * duplicate submissions.
 */
export function usePendingAction<Args extends unknown[], Result>(
	action: (...args: Args) => Promise<Result>,
) {
	const [isPending, setIsPending] = useState(false);

	const run = useCallback(
		async (...args: Args) => {
			if (isPending) return undefined;
			setIsPending(true);
			try {
				return await action(...args);
			} finally {
				setIsPending(false);
			}
		},
		[action, isPending],
	);

	return { run, isPending };
}
