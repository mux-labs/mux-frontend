import { describe, expect, it } from "vitest";
import { OnboardingErrorCode } from "@/app/api/wallets/route";
import { mapCreateWalletError } from "./create-wallet-error-map";

describe("mapCreateWalletError", () => {
	it("maps recognized error codes to their display copy", () => {
		expect(
			mapCreateWalletError({
				error: { code: OnboardingErrorCode.UNAUTHORIZED },
			}),
		).toEqual({
			code: OnboardingErrorCode.UNAUTHORIZED,
			title: "Sign in required",
			message: "Your session has expired. Sign in again to create a wallet.",
			retryable: false,
			correlationId: null,
		});

		expect(
			mapCreateWalletError({
				error: { code: OnboardingErrorCode.FORBIDDEN },
			}),
		).toEqual({
			code: OnboardingErrorCode.FORBIDDEN,
			title: "Not allowed",
			message: "You do not have permission to create a wallet for this owner.",
			retryable: false,
			correlationId: null,
		});

		expect(
			mapCreateWalletError({
				error: { code: OnboardingErrorCode.INVALID_REQUEST },
			}),
		).toEqual({
			code: OnboardingErrorCode.INVALID_REQUEST,
			title: "Check your details",
			message: "Some wallet details are invalid. Review them and try again.",
			retryable: false,
			correlationId: null,
		});

		expect(
			mapCreateWalletError({
				error: { code: OnboardingErrorCode.IDEMPOTENCY_CONFLICT },
			}),
		).toEqual({
			code: OnboardingErrorCode.IDEMPOTENCY_CONFLICT,
			title: "Request already in progress",
			message:
				"A wallet creation request is already being processed. Refresh before retrying.",
			retryable: false,
			correlationId: null,
		});

		expect(
			mapCreateWalletError({
				error: { code: OnboardingErrorCode.UPSTREAM_UNAVAILABLE },
			}),
		).toEqual({
			code: OnboardingErrorCode.UPSTREAM_UNAVAILABLE,
			title: "Network temporarily unavailable",
			message:
				"We could not reach the Stellar network. No wallet was created. Try again shortly.",
			retryable: true,
			correlationId: null,
		});

		expect(
			mapCreateWalletError({
				error: { code: OnboardingErrorCode.INTERNAL },
			}),
		).toEqual({
			code: OnboardingErrorCode.INTERNAL,
			title: "Something went wrong",
			message: "We could not create your wallet. No wallet was created.",
			retryable: true,
			correlationId: null,
		});
	});

	it("preserves a string correlation id for support", () => {
		expect(
			mapCreateWalletError({
				error: {
					code: OnboardingErrorCode.UPSTREAM_UNAVAILABLE,
					correlationId: "corr-123",
				},
			}).correlationId,
		).toBe("corr-123");
	});

	it("fails closed to INTERNAL for unrecognized bodies", () => {
		const internal = {
			code: OnboardingErrorCode.INTERNAL,
			title: "Something went wrong",
			message: "We could not create your wallet. No wallet was created.",
			retryable: true,
			correlationId: null,
		};

		const unrecognized: unknown[] = [
			undefined,
			null,
			"boom",
			42,
			{},
			{ error: null },
			{ error: {} },
			{ error: { code: "SOMETHING_ELSE" } },
			{ error: { code: 500 } },
			{ error: { code: "onboarding_internal" } },
			{ message: "raw upstream failure" },
		];

		for (const body of unrecognized) {
			expect(mapCreateWalletError(body)).toEqual(internal);
		}
	});

	it("drops a non-string correlation id", () => {
		expect(
			mapCreateWalletError({
				error: { code: OnboardingErrorCode.INTERNAL, correlationId: 123 },
			}).correlationId,
		).toBeNull();
	});
});
