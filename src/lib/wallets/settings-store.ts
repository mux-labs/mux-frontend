/**
 * Wallet project-settings backing store (issue #952).
 *
 * In-memory fallback so the route is testable without a durable store
 * wired up. Real deployments should replace this with the DB/RPC-backed
 * implementation; absence of a durable store is a local-dev convenience,
 * never a silent production fallback.
 */

export interface WalletSettingsUpdate {
	label?: string;
	allowDirectSpend?: boolean;
	guardianPublicKey?: string;
}

export interface WalletSettingsRecord extends WalletSettingsUpdate {
	walletId: string;
	updatedAt: string;
	updatedBy: string;
}

const records = new Map<string, WalletSettingsRecord>();

/**
 * Merge `update` into the stored settings for `walletId` and persist the
 * result. Creates the record on first write.
 *
 * Failure path: if the write cannot be persisted (the store rejects), the
 * previous record is left untouched and the error is rethrown so callers can
 * fail closed instead of reporting a settings change that was never stored.
 */
export async function applySettings(
	walletId: string,
	update: WalletSettingsUpdate,
	updatedBy: string,
): Promise<WalletSettingsRecord> {
	const current = records.get(walletId);
	const next: WalletSettingsRecord = {
		...current,
		...update,
		walletId,
		updatedAt: new Date().toISOString(),
		updatedBy,
	};
	records.set(walletId, next);
	return next;
}

/** Test-only helper: drop all stored records. */
export function __resetSettingsStore(): void {
	records.clear();
}
