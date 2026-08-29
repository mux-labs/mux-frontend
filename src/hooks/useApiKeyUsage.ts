"use client";

import { useCallback, useEffect, useState } from "react";
import type { ApiKeyUsageSummary } from "@/mock-data/api-key-usage";

async function fetchApiKeyUsage(id: string): Promise<ApiKeyUsageSummary> {
	const res = await fetch(`/api/api-keys/${encodeURIComponent(id)}/usage`, {
		cache: "no-store",
	});
	if (!res.ok) {
		throw new Error(`Failed to fetch API key usage (${res.status})`);
	}
	const json = (await res.json()) as { data: ApiKeyUsageSummary };
	return json.data;
}

/**
 * Loads per-key usage analytics (roadmap item: "Per-key usage analytics").
 * Mirrors the loading/error/refetch shape of `useApiKeys` / `useWallets`.
 */
export function useApiKeyUsage(apiKeyId: string | null | undefined) {
	const enabled = Boolean(apiKeyId);
	const [data, setData] = useState<ApiKeyUsageSummary | null>(null);
	const [loading, setLoading] = useState(enabled);
	const [error, setError] = useState<Error | null>(null);

	const load = useCallback(async () => {
		if (!apiKeyId) return;
		setLoading(true);
		setError(null);
		try {
			const usage = await fetchApiKeyUsage(apiKeyId);
			setData(usage);
		} catch (err: unknown) {
			setError(
				err instanceof Error ? err : new Error("Failed to load API key usage"),
			);
		} finally {
			setLoading(false);
		}
	}, [apiKeyId]);

	useEffect(() => {
		if (!apiKeyId) {
			setLoading(false);
			return;
		}
		load();
	}, [apiKeyId, load]);

	return {
		data,
		loading,
		error,
		refetch: load,
	};
}
