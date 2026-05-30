export type WebhookStatus = "delivered" | "failed" | "pending";
export type WebhookEvent =
	| "wallet.created"
	| "wallet.updated"
	| "transaction.completed"
	| "transaction.failed"
	| "api_key.created"
	| "api_key.revoked";

export interface Webhook {
	id: string;
	event: WebhookEvent;
	url: string;
	status: WebhookStatus;
	/** HTTP status code returned by the endpoint, undefined if not yet attempted */
	responseCode?: number;
	createdAt: Date;
	lastAttemptAt?: Date;
	/** Number of delivery attempts made */
	attempts: number;
}
