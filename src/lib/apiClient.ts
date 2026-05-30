/**
 * Typed API client for Mux Protocol.
 *
 * Provides a thin fetch wrapper with:
 * - Consistent error handling via `ApiError`
 * - JSON serialisation / deserialisation
 * - An `optimisticUpdate` helper for instant UI feedback while a mutation is
 *   in-flight, with automatic rollback on failure.
 */

// ---------------------------------------------------------------------------
// Error type
// ---------------------------------------------------------------------------

export class ApiError extends Error {
	constructor(
		public readonly status: number,
		public readonly statusText: string,
		message: string,
	) {
		super(message);
		this.name = "ApiError";
	}
}

// ---------------------------------------------------------------------------
// Core request helper
// ---------------------------------------------------------------------------

export interface RequestOptions extends Omit<RequestInit, "body"> {
	/** Request body — will be JSON-serialised automatically. */
	body?: unknown;
	/** Base URL override. Falls back to `NEXT_PUBLIC_API_BASE_URL` or `""`. */
	baseUrl?: string;
}

/**
 * Makes a typed HTTP request and returns the parsed JSON response.
 *
 * @throws {ApiError} when the server returns a non-2xx status.
 */
export async function request<T>(
	path: string,
	{ body, baseUrl, headers, ...init }: RequestOptions = {},
): Promise<T> {
	const base =
		baseUrl ??
		(typeof process !== "undefined"
			? (process.env.NEXT_PUBLIC_API_BASE_URL ?? "")
			: "");

	const url = `${base}${path}`;

	const response = await fetch(url, {
		...init,
		headers: {
			"Content-Type": "application/json",
			Accept: "application/json",
			...headers,
		},
		body: body !== undefined ? JSON.stringify(body) : undefined,
	});

	if (!response.ok) {
		let message = response.statusText;
		try {
			const errorBody = (await response.json()) as { message?: string };
			if (errorBody.message) message = errorBody.message;
		} catch {
			// ignore parse errors — use statusText as fallback
		}
		throw new ApiError(response.status, response.statusText, message);
	}

	// 204 No Content — return undefined cast to T
	if (response.status === 204) {
		return undefined as T;
	}

	return response.json() as Promise<T>;
}

// Convenience method shorthands
export const apiClient = {
	get: <T>(path: string, options?: Omit<RequestOptions, "method">) =>
		request<T>(path, { ...options, method: "GET" }),

	post: <T>(
		path: string,
		body?: unknown,
		options?: Omit<RequestOptions, "method" | "body">,
	) => request<T>(path, { ...options, method: "POST", body }),

	put: <T>(
		path: string,
		body?: unknown,
		options?: Omit<RequestOptions, "method" | "body">,
	) => request<T>(path, { ...options, method: "PUT", body }),

	patch: <T>(
		path: string,
		body?: unknown,
		options?: Omit<RequestOptions, "method" | "body">,
	) => request<T>(path, { ...options, method: "PATCH", body }),

	delete: <T>(path: string, options?: Omit<RequestOptions, "method">) =>
		request<T>(path, { ...options, method: "DELETE" }),
};

// ---------------------------------------------------------------------------
// Optimistic update helper
// ---------------------------------------------------------------------------

export interface OptimisticUpdateOptions<TState> {
	/**
	 * Returns the current state snapshot used for rollback if the mutation
	 * fails.
	 */
	getSnapshot: () => TState;
	/**
	 * Applies the optimistic change to local state immediately (before the
	 * server responds).
	 */
	applyOptimistic: (optimisticState: TState) => void;
	/**
	 * The async mutation to perform (e.g. an API call).
	 * Receives the snapshot taken before the optimistic update.
	 */
	mutate: (snapshot: TState) => Promise<void>;
	/**
	 * Called when the mutation succeeds. Use this to reconcile server state
	 * with local state if needed.
	 */
	onSuccess?: () => void;
	/**
	 * Called when the mutation fails. Receives the error and the snapshot that
	 * was used for rollback.
	 */
	onError?: (error: unknown, snapshot: TState) => void;
}

/**
 * Performs an optimistic UI update with automatic rollback on failure.
 *
 * Usage example:
 * ```ts
 * await optimisticUpdate({
 *   getSnapshot: () => wallets,
 *   applyOptimistic: (prev) => setWallets([...prev, newWallet]),
 *   mutate: () => apiClient.post("/wallets", newWallet),
 *   onSuccess: () => refetch(),
 *   onError: (err, prev) => {
 *     setWallets(prev);
 *     toast.error("Failed to add wallet");
 *   },
 * });
 * ```
 */
export async function optimisticUpdate<TState>({
	getSnapshot,
	applyOptimistic,
	mutate,
	onSuccess,
	onError,
}: OptimisticUpdateOptions<TState>): Promise<void> {
	const snapshot = getSnapshot();

	// Apply the optimistic change immediately
	applyOptimistic(snapshot);

	try {
		await mutate(snapshot);
		onSuccess?.();
	} catch (error) {
		// Roll back to the snapshot taken before the optimistic update
		applyOptimistic(snapshot);
		onError?.(error, snapshot);
	}
}
