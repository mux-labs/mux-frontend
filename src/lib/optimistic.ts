/**
 * Optimistic UI is only allowed for idempotent mutations.
 *
 * A mutation may be rendered optimistically only when it carries an
 * idempotency key (so a retry cannot double-apply) and is not a money-path
 * write. Otherwise the UI must wait for the server result (fail closed).
 * See docs/security-ux-guards.md#optimistic-ui.
 */

export interface MutationDescriptor {
	idempotencyKey?: string | null;
	/** Spends, recovery, and admin writes are never optimistic. */
	moneyPath?: boolean;
}

export function canApplyOptimistic(mutation: MutationDescriptor): boolean {
	if (mutation.moneyPath) return false;
	return (
		typeof mutation.idempotencyKey === "string" &&
		mutation.idempotencyKey.trim().length > 0
	);
}

/**
 * Runs `commit`, applying `optimistic` state first only when the mutation is
 * idempotent. On failure the previous state is restored and the error rethrown.
 */
export async function runMutation<S, R>(
	mutation: MutationDescriptor,
	state: { get: () => S; set: (next: S) => void },
	optimistic: (prev: S) => S,
	commit: () => Promise<R>,
): Promise<R> {
	const previous = state.get();
	const applied = canApplyOptimistic(mutation);
	if (applied) state.set(optimistic(previous));
	try {
		return await commit();
	} catch (error) {
		if (applied) state.set(previous);
		throw error;
	}
}
