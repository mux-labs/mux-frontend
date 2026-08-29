/**
 * Shape of an API key as returned by `GET /api/api-keys` and the backend it
 * proxies to.
 *
 * Kept separate from `src/mock-data/api-keys.ts` so `ApiKeysTable`,
 * `APIKeyModal`, and the revoke/list hooks type against the real backend
 * contract rather than the local mock store's shape.
 */
export interface ApiKey {
	id: string;
	name: string;
	/** Masked key shown in the table (e.g. "sk_live_51M0...") */
	key: string;
	status: "Active" | "Revoked";
	createdAt: string;
}

/**
 * An `ApiKey` plus the full plaintext secret. The backend only ever returns
 * this shape once, from the create endpoint — it must never be re-fetched
 * or re-derived from a later `GET`, which returns `ApiKey` (no `secret`).
 */
export interface CreatedApiKey extends ApiKey {
	secret: string;
}
