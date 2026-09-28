import type { AuditEntry } from "./pagination";

/**
 * Deterministic audit fixture for local dev/CI only. `/api/activity` serves
 * it solely when `isMockFallbackAllowed()` is true (never in production or
 * on mainnet). Timestamps are anchored to a fixed epoch so cursors stay
 * valid across requests, and every fourth pair shares a timestamp to
 * exercise the id tie-break.
 */

const ACTIONS = [
	"wallet.created",
	"wallet.send",
	"api_key.rotated",
	"member.added",
	"recovery.started",
] as const;
const ACTORS = ["member_admin", "member_dev_1", "member_dev_2"] as const;
const ANCHOR_MS = Date.UTC(2026, 0, 1);
const STEP_MS = 60 * 60 * 1000;

export const MOCK_AUDIT_ENTRY_COUNT = 120;

export const MOCK_AUDIT_ENTRIES: readonly AuditEntry[] = Array.from(
	{ length: MOCK_AUDIT_ENTRY_COUNT },
	(_, index) => {
		const slot = index % 4 === 1 ? index - 1 : index;
		return {
			id: `evt_${String(index).padStart(4, "0")}`,
			actor: ACTORS[index % ACTORS.length],
			action: ACTIONS[index % ACTIONS.length],
			createdAt: new Date(ANCHOR_MS + slot * STEP_MS).toISOString(),
			network: "testnet",
		};
	},
);
