/**
 * Validates a send amount against the available wallet balance.
 */
export interface SendAmountValidationResult {
	isValid: boolean;
	error: string | null;
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

	if (availableBalance !== null && parsed > availableBalance) {
		return {
			isValid: false,
			error: `Amount exceeds available balance (${availableBalance}).`,
		};
	}

	return { isValid: true, error: null };
}
