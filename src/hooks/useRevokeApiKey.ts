"use client";

import { useCallback, useState } from "react";
import { revokeKey } from "@/lib/api/index";
// Import from the canonical types module, not from mock-data, so the hook
// typechecks correctly against the live backend response shape (#707).
import type { ApiKey } from "@/types/api-key";

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
