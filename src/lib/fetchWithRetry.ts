export interface FetchWithRetryOptions {
	retries?: number;
	baseDelayMs?: number;
}

/**
 * Fetch wrapper for idempotent GET requests that retries transient
 * failures (network errors, 5xx, 429) with exponential backoff.
 */
export async function fetchWithRetry(
	url: string,
	options: FetchWithRetryOptions = {},
): Promise<Response> {
	const { retries = 3, baseDelayMs = 300 } = options;

	let lastError: unknown;

	for (let attempt = 0; attempt <= retries; attempt++) {
		try {
			const res = await fetch(url, { method: "GET" });
			if (res.ok) return res;
			if (res.status !== 429 && res.status < 500) return res;
			lastError = new Error(`HTTP ${res.status}`);
		} catch (err) {
			lastError = err;
		}

		if (attempt < retries) {
			const delay = baseDelayMs * 2 ** attempt;
			await new Promise((resolve) => setTimeout(resolve, delay));
		}
	}

	throw lastError instanceof Error
		? lastError
		: new Error("fetchWithRetry: request failed");
}
