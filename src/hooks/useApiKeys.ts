"use client";

import { useCallback, useEffect, useState } from "react";
import { fetchApiKeys } from "@/lib/api/index";
import type { ApiKey } from "@/mock-data/api-keys";

export function useApiKeys(enabled = true) {
	const [data, setData] = useState<ApiKey[] | null>(null);
	const [loading, setLoading] = useState(enabled);
	const [error, setError] = useState<Error | null>(null);

	const load = useCallback(async () => {
		if (!enabled) return;
		setLoading(true);
		setError(null);
		try {
			const res = await fetchApiKeys();
			setData(res);
		} catch (err: unknown) {
			setError(
				err instanceof Error ? err : new Error("Failed to load API keys"),
			);
		} finally {
			setLoading(false);
		}
	}, [enabled]);

	useEffect(() => {
		if (!enabled) {
			setLoading(false);
			return;
		}
		load();
	}, [enabled, load]);

	return {
		data,
		loading,
		error,
		refetch: load,
	};
}
