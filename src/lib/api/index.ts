import type { ApiKey, CreatedApiKey } from "@/mock-data/api-keys";
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
