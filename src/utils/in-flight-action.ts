import { useCallback, useRef, useState } from "react";

/**
 * Disable CTAs while in-flight (#828).
 *
 * Wraps an async action so that repeated clicks while a request is pending are
 * ignored (a ref guards against double-submits within the same render), and
 * exposes `pending` so buttons can render `disabled` / `aria-busy`.
 */
export function useInFlightAction<A extends unknown[], R>(
	action: (...args: A) => Promise<R>,
) {
	const inFlight = useRef(false);
	const [pending, setPending] = useState(false);

	const run = useCallback(
		async (...args: A): Promise<R | undefined> => {
			if (inFlight.current) return undefined;
			inFlight.current = true;
			setPending(true);
			try {
				return await action(...args);
			} finally {
				inFlight.current = false;
				setPending(false);
			}
		},
		[action],
	);

	return {
		run,
		pending,
		ctaProps: { disabled: pending, "aria-busy": pending },
	} as const;
}
