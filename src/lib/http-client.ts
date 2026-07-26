import { fetchWithAuth } from "@/utils/fetchWithAuth";

export interface ApiResult<T> {
	data?: T;
	error?: string;
}

export async function fetchJson<T>(url: string): Promise<ApiResult<T>> {
	try {
		const res = await fetchWithAuth(url, { cache: "no-store" });
		if (!res.ok) {
			const text = await res.text();
			return { error: `HTTP ${res.status}: ${text}` };
		}
		const data = (await res.json()) as T;
		return { data };
	} catch (err: unknown) {
		const message = err instanceof Error ? err.message : String(err);
		return { error: message };
	}
}

export async function getTransactions() {
	return fetchJson<Record<string, unknown>[]>("/api/transactions");
}

export async function getSpendingLimits() {
	return fetchJson<Record<string, unknown>>("/api/spending-limits");
}

export async function saveSpendingLimits(payload: {
	dailyLimit?: number;
	transactionLimit?: number;
}) {
	try {
		const res = await fetchWithAuth("/api/spending-limits", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify(payload),
		});
		if (!res.ok) {
			const text = await res.text();
			return { error: `HTTP ${res.status}: ${text}` };
		}
		const data = await res.json();
		return { data };
	} catch (err: unknown) {
		const message = err instanceof Error ? err.message : String(err);
		return { error: message };
	}
}
