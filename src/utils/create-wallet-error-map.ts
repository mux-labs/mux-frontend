/**
 * Create wallet errorCode mapping.
 *
 * Maps the stable error codes returned by `POST /api/wallets` to
 * user-facing copy and a retry hint. Unknown or malformed codes fail closed
 * to a generic message so internals are never surfaced to the user. The
 * correlation id is preserved for support without exposing secrets.
 */

import {
	OnboardingErrorCode,
	type OnboardingErrorCodeValue,
} from "@/app/api/wallets/route";

export interface CreateWalletErrorView {
	code: OnboardingErrorCodeValue;
	title: string;
	message: string;
	retryable: boolean;
	correlationId: string | null;
}

const ERROR_COPY: Record<
	OnboardingErrorCodeValue,
	Omit<CreateWalletErrorView, "code" | "correlationId">
> = {
	[OnboardingErrorCode.UNAUTHORIZED]: {
		title: "Sign in required",
		message: "Your session has expired. Sign in again to create a wallet.",
		retryable: false,
	},
	[OnboardingErrorCode.FORBIDDEN]: {
		title: "Not allowed",
		message: "You do not have permission to create a wallet for this owner.",
		retryable: false,
	},
	[OnboardingErrorCode.INVALID_REQUEST]: {
		title: "Check your details",
		message: "Some wallet details are invalid. Review them and try again.",
		retryable: false,
	},
	[OnboardingErrorCode.IDEMPOTENCY_CONFLICT]: {
		title: "Request already in progress",
		message:
			"A wallet creation request is already being processed. Refresh before retrying.",
		retryable: false,
	},
	[OnboardingErrorCode.UPSTREAM_UNAVAILABLE]: {
		title: "Network temporarily unavailable",
		message:
			"We could not reach the Stellar network. No wallet was created. Try again shortly.",
		retryable: true,
	},
	[OnboardingErrorCode.INTERNAL]: {
		title: "Something went wrong",
		message: "We could not create your wallet. No wallet was created.",
		retryable: true,
	},
};

const KNOWN_CODES = new Set<string>(Object.values(OnboardingErrorCode));

export function isCreateWalletErrorCode(
	code: unknown,
): code is OnboardingErrorCodeValue {
	return typeof code === "string" && KNOWN_CODES.has(code);
}

/**
 * Map an error response body from `POST /api/wallets` to display copy.
 * Anything that is not a recognized error body maps to INTERNAL (fail closed).
 */
export function mapCreateWalletError(body: unknown): CreateWalletErrorView {
	const error = (
		body as { error?: { code?: unknown; correlationId?: unknown } } | null
	)?.error;
	const code = isCreateWalletErrorCode(error?.code)
		? error.code
		: OnboardingErrorCode.INTERNAL;
	const correlationId =
		typeof error?.correlationId === "string" ? error.correlationId : null;
	return { code, correlationId, ...ERROR_COPY[code] };
}
