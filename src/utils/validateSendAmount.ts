/**
 * Validates a send amount against the available wallet balance.
 *
 * Stellar amounts are denominated in stroops (1 XLM = 10,000,000 stroops).
 * An amount is valid only if it can be expressed as a whole number of stroops —
 * i.e. it has at most 7 decimal places. Amounts with more precision would be
 * silently truncated by the Stellar network, which could cause the user to send
 * a different amount than intended. (#696)
 */
export interface SendAmountValidationResult {
	isValid: boolean;
	error: string | null;
}

/** Number of decimal places in one stroop (1 XLM = 10^7 stroops). */
export const STROOP_DECIMALS = 7;

/**
 * Returns true when `amount` can be represented exactly in stroops — i.e. it
 * has at most {@link STROOP_DECIMALS} decimal places.  The check is done on
 * the string representation to avoid floating-point rounding artefacts.
 */
export function isStroopPrecise(amount: string): boolean {
	// Normalise scientific notation (e.g. "1e-8") to a decimal string so the
	// decimal-place count is correct.
	const normalised = Number.parseFloat(amount).toFixed(STROOP_DECIMALS + 1);
	const dotIndex = normalised.indexOf(".");
	if (dotIndex === -1) return true;
	const decimals = normalised.length - dotIndex - 1;
	// If the (STROOP_DECIMALS+1)th digit is non-zero the value has more
	// precision than stroops can represent.
	return decimals <= STROOP_DECIMALS || normalised[dotIndex + STROOP_DECIMALS + 1] === "0";
}

export function validateSendAmount(
	amount: string,
	availableBalance: number | null,
): SendAmountValidationResult {
	if (!amount.trim()) {
		return { isValid: false, error: "Amount is required." };
	}

	const parsed = Number.parseFloat(amount);
	if (Number.isNaN(parsed) || parsed <= 0) {
		return { isValid: false, error: "Enter a positive amount." };
	}

	// Reject amounts that cannot round-trip to stroops without silent truncation.
	if (!isStroopPrecise(amount.trim())) {
		return {
			isValid: false,
			error: `Amount has too many decimal places. Stellar supports at most ${STROOP_DECIMALS} decimal places (1 stroop = 0.0000001 XLM).`,
		};
	}

	if (availableBalance !== null && parsed > availableBalance) {
		return {
			isValid: false,
			error: `Amount exceeds available balance (${availableBalance}).`,
		};
	}

	return { isValid: true, error: null };
}
