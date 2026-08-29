/**
 * Canonical types for API keys.
 *
 * Lives here (not in src/mock-data/) so production hooks, components, and
 * the live backend response shapes all reference the same contract (#707).
 *
 * The mock fixture in src/mock-data/api-keys.ts re-exports these types for
 * backward compatibility.
 */

export interface ApiKey {
	id: string;
	name: string;
	/** Masked key shown in the table (e.g. "sk_live_51M0..."). */
	key: string;
	status: "Active" | "Revoked";
	createdAt: string;
}

export interface CreatedApiKey extends ApiKey {
	/**
	 * Full secret returned only on the create flow.
	 * Never persist this in table state after the modal is closed (#708).
	 */
	secret: string;
}
