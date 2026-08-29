"use client";

import { useCallback, useState } from "react";
import { revokeKey } from "@/lib/api/index";
import type { ApiKey } from "@/types/apiKey";

export function useRevokeApiKey() {
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<Error | null>(null);

	const revoke = useCallback(async (id: string) => {
		setLoading(true);
		setError(null);
		try {
			const updated = await revokeKey(id);
			return updated as ApiKey | null;
		} catch (err: unknown) {
			setError(
				err instanceof Error ? err : new Error("Failed to revoke API key"),
			);
			return null;
		} finally {
			setLoading(false);
		}
	}, []);

	const reset = useCallback(() => setError(null), []);

	return { revoke, loading, error, reset };
}
