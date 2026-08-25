/**
 * Recovery API Service
 *
 * Handles all API calls related to wallet recovery status and timeline
 * Implements error handling, retry logic, and request/response validation
 */

import { getApiBaseUrl } from "@/lib/api/config";
import type { RecoveryTimeline, RecoveryTimelineEvent } from "@/types/recovery";

/**
 * API response types
 */
export interface RecoveryStatusResponse {
	success: boolean;
	data?: RecoveryTimeline;
	error?: string;
	timestamp: number;
}

export interface RecoveryStatusError {
	code: string;
	message: string;
	statusCode: number;
	retryable: boolean;
}

/**
 * Configuration for API requests
 */
interface ApiConfig {
	baseUrl: string;
	timeout: number;
	retryAttempts: number;
	retryDelay: number;
}

/**
 * Default API configuration
 */
const DEFAULT_CONFIG: ApiConfig = {
	baseUrl: getApiBaseUrl() || "http://localhost:3000/api",
	timeout: 10000,
	retryAttempts: 3,
	retryDelay: 1000,
};

/**
 * Validates recovery timeline data from API response
 */
function validateRecoveryTimeline(data: unknown): data is RecoveryTimeline {
	if (!data || typeof data !== "object") {
		return false;
	}

	const timeline = data as Record<string, unknown>;

	// Check required fields
	if (
		typeof timeline.id !== "string" ||
		typeof timeline.walletId !== "string" ||
		!(
			timeline.startedAt instanceof Date ||
			typeof timeline.startedAt === "string"
		) ||
		!Array.isArray(timeline.events) ||
		typeof timeline.status !== "string"
	) {
		return false;
	}

	// Validate events
	const validStatuses = ["pending", "in_progress", "completed", "failed"];
	if (!validStatuses.includes(timeline.status)) {
		return false;
	}

	return true;
}

/**
 * Converts API response dates to Date objects
 */
function parseRecoveryTimeline(data: unknown): RecoveryTimeline | null {
	if (!validateRecoveryTimeline(data)) {
		return null;
	}

	const timeline = data as any;

	return {
		...timeline,
		startedAt:
			typeof timeline.startedAt === "string"
				? new Date(timeline.startedAt)
				: timeline.startedAt,
		completedAt: timeline.completedAt
			? typeof timeline.completedAt === "string"
				? new Date(timeline.completedAt)
				: timeline.completedAt
			: undefined,
		events: (timeline.events as any[]).map((event) => ({
			...event,
			timestamp:
				typeof event.timestamp === "string"
					? new Date(event.timestamp)
					: event.timestamp,
		})),
	};
}

/**
 * Handles API errors and determines if they're retryable
 */
function handleApiError(error: unknown): RecoveryStatusError {
	if (error instanceof Error) {
		// Network errors are retryable
		if (error.message.includes("fetch") || error.message.includes("network")) {
			return {
				code: "NETWORK_ERROR",
				message: "Network error occurred. Please check your connection.",
				statusCode: 0,
				retryable: true,
			};
		}

		// Timeout errors are retryable
		if (error.message.includes("timeout")) {
			return {
				code: "TIMEOUT_ERROR",
				message: "Request timed out. Please try again.",
				statusCode: 408,
				retryable: true,
			};
		}
	}

	// Default error
	return {
		code: "UNKNOWN_ERROR",
		message: "An unknown error occurred",
		statusCode: 500,
		retryable: true,
	};
}

/**
 * Fetches recovery status from API with retry logic
 *
 * @param walletId - The wallet ID to fetch recovery status for
 * @param config - Optional API configuration
 * @returns Promise resolving to recovery timeline or error
 *
 * @example
 * const result = await fetchRecoveryStatus("wallet-123");
 * if (result.success) {
 *   console.log(result.data);
 * } else {
 *   console.error(result.error);
 * }
 */
export async function fetchRecoveryStatus(
	walletId: string,
	config: Partial<ApiConfig> = {},
): Promise<RecoveryStatusResponse> {
	const finalConfig = { ...DEFAULT_CONFIG, ...config };

	if (!walletId || typeof walletId !== "string") {
		return {
			success: false,
			error: "Invalid wallet ID provided",
			timestamp: Date.now(),
		};
	}

	let lastError: RecoveryStatusError | null = null;

	// Retry logic
	for (let attempt = 0; attempt < finalConfig.retryAttempts; attempt++) {
		try {
			const controller = new AbortController();
			const timeoutId = setTimeout(
				() => controller.abort(),
				finalConfig.timeout,
			);

			const response = await fetch(
				`${finalConfig.baseUrl}/recovery/status/${walletId}`,
				{
					method: "GET",
					headers: {
						"Content-Type": "application/json",
					},
					signal: controller.signal,
				},
			);

			clearTimeout(timeoutId);

			// Handle non-200 responses
			if (!response.ok) {
				const errorData = await response.json().catch(() => ({}));
				lastError = {
					code: `HTTP_${response.status}`,
					message: errorData.message || `HTTP ${response.status}`,
					statusCode: response.status,
					retryable: response.status >= 500 || response.status === 408,
				};

				// Don't retry on client errors (4xx) except 408
				if (response.status < 500 && response.status !== 408) {
					return {
						success: false,
						error: lastError.message,
						timestamp: Date.now(),
					};
				}

				// Retry on server errors or timeout
				if (attempt < finalConfig.retryAttempts - 1 && lastError.retryable) {
					await new Promise((resolve) =>
						setTimeout(resolve, finalConfig.retryDelay * (attempt + 1)),
					);
					continue;
				}

				return {
					success: false,
					error: lastError.message,
					timestamp: Date.now(),
				};
			}

			// Parse response
			const responseData = await response.json();

			// Validate and parse timeline
			const timeline = parseRecoveryTimeline(responseData);

			if (!timeline) {
				return {
					success: false,
					error: "Invalid recovery timeline data received from API",
					timestamp: Date.now(),
				};
			}

			return {
				success: true,
				data: timeline,
				timestamp: Date.now(),
			};
		} catch (error) {
			lastError = handleApiError(error);

			// Don't retry on non-retryable errors
			if (!lastError.retryable) {
				return {
					success: false,
					error: lastError.message,
					timestamp: Date.now(),
				};
			}

			// Retry with exponential backoff
			if (attempt < finalConfig.retryAttempts - 1) {
				await new Promise((resolve) =>
					setTimeout(resolve, finalConfig.retryDelay * (attempt + 1)),
				);
			}
		}
	}

	// All retries exhausted
	return {
		success: false,
		error:
			lastError?.message ||
			"Failed to fetch recovery status after multiple attempts",
		timestamp: Date.now(),
	};
}

/**
 * Fetches recovery timeline events from API
 *
 * @param recoveryId - The recovery timeline ID
 * @param config - Optional API configuration
 * @returns Promise resolving to timeline events or error
 */
export async function fetchRecoveryEvents(
	recoveryId: string,
	config: Partial<ApiConfig> = {},
): Promise<{
	success: boolean;
	data?: RecoveryTimelineEvent[];
	error?: string;
	timestamp: number;
}> {
	const finalConfig = { ...DEFAULT_CONFIG, ...config };

	if (!recoveryId || typeof recoveryId !== "string") {
		return {
			success: false,
			error: "Invalid recovery ID provided",
			timestamp: Date.now(),
		};
	}

	try {
		const controller = new AbortController();
		const timeoutId = setTimeout(() => controller.abort(), finalConfig.timeout);

		const response = await fetch(
			`${finalConfig.baseUrl}/recovery/${recoveryId}/events`,
			{
				method: "GET",
				headers: {
					"Content-Type": "application/json",
				},
				signal: controller.signal,
			},
		);

		clearTimeout(timeoutId);

		if (!response.ok) {
			const errorData = await response.json().catch(() => ({}));
			return {
				success: false,
				error: errorData.message || `HTTP ${response.status}`,
				timestamp: Date.now(),
			};
		}

		const data = await response.json();

		if (!Array.isArray(data)) {
			return {
				success: false,
				error: "Invalid events data received from API",
				timestamp: Date.now(),
			};
		}

		// Parse event timestamps
		const events = data.map((event: any) => ({
			...event,
			timestamp:
				typeof event.timestamp === "string"
					? new Date(event.timestamp)
					: event.timestamp,
		}));

		return {
			success: true,
			data: events,
			timestamp: Date.now(),
		};
	} catch (error) {
		const apiError = handleApiError(error);
		return {
			success: false,
			error: apiError.message,
			timestamp: Date.now(),
		};
	}
}

/**
 * Response shape for a recovery initiation request.
 */
export interface InitiateRecoveryResponse {
	success: boolean;
	data?: { recoveryId: string };
	error?: string;
	timestamp: number;
}

/**
 * Initiates a wallet recovery request against the backend.
 *
 * Never send custody secrets (private keys, seed phrases, signing keys) as
 * part of this request — only the wallet identifier is required to kick off
 * the recovery flow server-side.
 *
 * @param walletId - The wallet ID to initiate recovery for
 * @param config - Optional API configuration
 * @returns Promise resolving to the created recovery record or an error
 *
 * @example
 * const result = await initiateRecovery("wallet-123");
 * if (result.success) {
 *   console.log(result.data?.recoveryId);
 * } else {
 *   console.error(result.error);
 * }
 */
export async function initiateRecovery(
	walletId: string,
	config: Partial<ApiConfig> = {},
): Promise<InitiateRecoveryResponse> {
	const finalConfig = { ...DEFAULT_CONFIG, ...config };

	if (!walletId || typeof walletId !== "string") {
		return {
			success: false,
			error: "Invalid wallet ID provided",
			timestamp: Date.now(),
		};
	}

	try {
		const controller = new AbortController();
		const timeoutId = setTimeout(() => controller.abort(), finalConfig.timeout);

		const response = await fetch(`${finalConfig.baseUrl}/recovery/initiate`, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify({ walletId }),
			signal: controller.signal,
		});

		clearTimeout(timeoutId);

		if (!response.ok) {
			const errorData = await response.json().catch(() => ({}));
			return {
				success: false,
				error: errorData.message || `HTTP ${response.status}`,
				timestamp: Date.now(),
			};
		}

		const data = await response.json().catch(() => ({}));

		return {
			success: true,
			data: { recoveryId: data.recoveryId },
			timestamp: Date.now(),
		};
	} catch (error) {
		const apiError = handleApiError(error);
		return {
			success: false,
			error: apiError.message,
			timestamp: Date.now(),
		};
	}
}

/**
 * Polls recovery status at regular intervals
 *
 * @param walletId - The wallet ID to poll
 * @param interval - Polling interval in milliseconds
 * @param maxDuration - Maximum polling duration in milliseconds
 * @param onUpdate - Callback when status updates
 * @param config - Optional API configuration
 * @returns Function to stop polling
 */
export function pollRecoveryStatus(
	walletId: string,
	interval: number = 5000,
	maxDuration: number = 300000, // 5 minutes
	onUpdate: (response: RecoveryStatusResponse) => void,
	config: Partial<ApiConfig> = {},
): () => void {
	let pollCount = 0;
	const maxPolls = Math.ceil(maxDuration / interval);
	let timeoutId: NodeJS.Timeout | null = null;

	const poll = async () => {
		if (pollCount >= maxPolls) {
			return;
		}

		const response = await fetchRecoveryStatus(walletId, config);
		onUpdate(response);

		// Stop polling if recovery is complete or failed
		if (response.success && response.data) {
			if (
				response.data.status === "completed" ||
				response.data.status === "failed"
			) {
				return;
			}
		}

		pollCount++;
		timeoutId = setTimeout(poll, interval);
	};

	// Start polling
	poll();

	// Return stop function
	return () => {
		if (timeoutId) {
			clearTimeout(timeoutId);
		}
	};
}
