import { getEnv } from "@/lib/env";

export function getApiBaseUrl(): string {
	const env = getEnv();
	const baseUrl =
		env.NEXT_PUBLIC_API_URL ??
		env.NEXT_PUBLIC_MUX_API_URL ??
		env.NEXT_PUBLIC_API_BASE ??
		"";

	return baseUrl.replace(/\/+$/, "");
}

export function getBackendApiBaseUrl(): string {
	const env = getEnv();
	const baseUrl = env.MUX_BACKEND_URL ?? getApiBaseUrl();
	return baseUrl.replace(/\/+$/, "");
}

export function getApiKey(): string | undefined {
	return getEnv().NEXT_PUBLIC_MUX_API_KEY;
}

export function getServerApiKey(): string | undefined {
	return getEnv().MUX_API_KEY;
}
