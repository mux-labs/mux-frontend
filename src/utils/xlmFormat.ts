/**
 * Formats a Stellar Lumens (XLM) amount with consistent precision.
 * Stellar amounts have at most 7 decimal places; this trims trailing
 * zeros while keeping a stable minimum of 2 decimals for readability.
 */
export function formatXLM(
	amount: number | string,
	options?: { minDecimals?: number; maxDecimals?: number },
): string {
	const value = typeof amount === "string" ? Number.parseFloat(amount) : amount;

	if (Number.isNaN(value)) return "0.00 XLM";

	const minimumFractionDigits = options?.minDecimals ?? 2;
	const maximumFractionDigits = options?.maxDecimals ?? 7;

	const formatted = new Intl.NumberFormat("en-US", {
		minimumFractionDigits,
		maximumFractionDigits,
	}).format(value);

	return `${formatted} XLM`;
}
