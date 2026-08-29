import type { ApiKey, CreatedApiKey } from "@/types/apiKey";
import type { OverviewData } from "@/types/overview";
import ApiClient from "./client";
import { getApiBaseUrl } from "./config";

// Minimal factory used by the app. The API key and session bearer token may
// be provided at runtime.
export const createApiClient = (
	baseUrl = getApiBaseUrl(),
	apiKey?: string,
	authToken?: string,
) => new ApiClient(baseUrl, apiKey, authToken);

export async function fetchApiKeys(): Promise<ApiKey[]> {
	const res = await fetch("/api/api-keys", { cache: "no-store" });
	if (!res.ok) {
		throw new Error(`Failed to fetch API keys (${res.status})`);
	}
	const json = (await res.json()) as { data: ApiKey[] };
	return json.data;
}

export type ActivityItem = {
	id: string;
	type: "wallet_created" | "transaction" | "api_key_created" | "limit_reached";
	description: string;
	timestamp: string;
	status: "success" | "pending" | "error";
	network?: "mainnet" | "testnet";
};

export async function fetchOverview(): Promise<OverviewData | null> {
	const res = await fetch("/api/overview", { cache: "no-store" });
	if (!res.ok) {
		throw new Error(`Failed to fetch overview (${res.status})`);
	}
	const json = (await res.json()) as { data: OverviewData | null };
	return json.data;
}

export async function fetchRecentActivity(): Promise<ActivityItem[]> {
	const res = await fetch("/api/activity", { cache: "no-store" });
	if (!res.ok) {
		throw new Error(`Failed to fetch recent activity (${res.status})`);
	}
	const json = (await res.json()) as { data?: ActivityItem[] } | ActivityItem[];
	return Array.isArray(json) ? json : (json.data ?? []);
}

export async function revokeKey(id: string): Promise<ApiKey | null> {
	const res = await fetch("/api/api-keys", {
		method: "PATCH",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ id, action: "revoke" }),
	});
	if (res.status === 404) return null;
	if (!res.ok) {
		throw new Error(`Failed to revoke API key (${res.status})`);
	}
	const json = (await res.json()) as { data: ApiKey };
	return json.data;
}

export async function createApiKey(name: string): Promise<CreatedApiKey> {
	const res = await fetch("/api/api-keys", {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ name }),
	});
	if (!res.ok) {
		throw new Error(`Failed to create API key (${res.status})`);
	}
	const json = (await res.json()) as { data: CreatedApiKey };
	return json.data;
}

export default createApiClient;
