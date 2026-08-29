/**
 * Local/dev-only mock store for API keys.
 *
 * `src/app/api/api-keys/route.ts` only reads from this store as a fallback
 * when no backend URL (`NEXT_PUBLIC_API_URL`/legacy aliases) is configured,
 * so local dev/CI keeps working without a running API server. In any
 * environment with a backend configured, create/revoke/list are served by
 * the real mux-backend API instead.
 */
import type { ApiKey, CreatedApiKey } from "@/types/apiKey";

/** Re-exported for backward compatibility; the canonical types now live in `@/types/apiKey`. */
export type { ApiKey, CreatedApiKey };

export const mockApiKeys: ApiKey[] = [
	{
		id: "1",
		name: "Default Key",
		key: "sk_live_51M0L9SA9mG8G8xX5u4v5...",
		status: "Active",
		createdAt: "2024-01-15T10:00:00Z",
	},
	{
		id: "2",
		name: "Development Key",
		key: "sk_test_w3hR9A2B4C5D6E7F8G9H...",
		status: "Active",
		createdAt: "2024-01-18T14:30:00Z",
	},
	{
		id: "3",
		name: "Staging Key",
		key: "sk_stg_XyZ123AaBbCcDdEeFf...",
		status: "Revoked",
		createdAt: "2023-12-01T09:15:00Z",
	},
];

// Simple persistence layer that uses localStorage in browser, or an in-memory store in Node/tests.
let inMemoryStore: ApiKey[] | null = null;

function loadStore(): ApiKey[] {
	if (typeof window !== "undefined" && window.localStorage) {
		const raw = window.localStorage.getItem("mockApiKeys");
		if (raw) return JSON.parse(raw) as ApiKey[];
		window.localStorage.setItem("mockApiKeys", JSON.stringify(mockApiKeys));
		return mockApiKeys.slice();
	}
	if (!inMemoryStore) inMemoryStore = mockApiKeys.slice();
	return inMemoryStore;
}

function saveStore(store: ApiKey[]) {
	if (typeof window !== "undefined" && window.localStorage) {
		window.localStorage.setItem("mockApiKeys", JSON.stringify(store));
	} else {
		inMemoryStore = store;
	}
}

export function getApiKeys(): ApiKey[] {
	return loadStore().slice();
}

export function revokeApiKey(id: string): ApiKey | null {
	const store = loadStore();
	const idx = store.findIndex((k) => k.id === id);
	if (idx === -1) return null;
	store[idx] = { ...store[idx], status: "Revoked" };
	saveStore(store);
	return store[idx];
}

function generateSecret() {
	const alphabet =
		"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
	const randomPart = Array.from(
		{ length: 32 },
		() => alphabet[Math.floor(Math.random() * alphabet.length)],
	).join("");
	return `mux_sk_${randomPart}`;
}

export function maskApiKey(secret: string) {
	if (secret.length <= 12) return "••••";
	return `${secret.slice(0, 8)}••••${secret.slice(-4)}`;
}

export function createApiKey(name: string): CreatedApiKey {
	const trimmedName = name.trim();
	const secret = generateSecret();
	const apiKey: ApiKey = {
		id: `key-${Date.now()}`,
		name: trimmedName,
		key: maskApiKey(secret),
		status: "Active",
		createdAt: new Date().toISOString(),
	};
	const store = loadStore();
	saveStore([apiKey, ...store]);
	return { ...apiKey, secret };
}
