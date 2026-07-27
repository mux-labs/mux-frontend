import type { ApiKey } from "@/mock-data/api-keys";
import type { OverviewData } from "@/mock-data/overview";
import ApiClient from "./client";
import { getApiBaseUrl } from "./config";

// Minimal factory used by the app. The API key may be provided at runtime.
export const createApiClient = (baseUrl = getApiBaseUrl(), apiKey?: string) =>
	new ApiClient(baseUrl, apiKey);

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
	const keys = await fetchApiKeys();
	const key = keys.find((item) => item.id === id);
	if (!key) {
		return null;
	}
	return { ...key, status: "Revoked" };
}

export default createApiClient;
