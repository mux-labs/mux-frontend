/**
 * Formats a Stellar Lumens (XLM) amount with consistent precision.
 * Stellar amounts have at most 7 decimal places; this trims trailing
 * zeros while keeping a stable minimum of 2 decimals for readability.
 *
 * Stroop precision notes (#696):
 *   1 XLM = 10,000,000 stroops
 *   Minimum representable amount: 0.0000001 XLM (1 stroop)
 *   Maximum decimal places: 7
 */

/** Minimum XLM amount representable on Stellar (1 stroop in XLM). */
export const MIN_XLM_AMOUNT = 0.0000001;

/** Maximum number of decimal places Stellar supports. */
export const XLM_MAX_DECIMALS = 7;

export function formatXLM(
	amount: number | string,
	options?: { minDecimals?: number; maxDecimals?: number },
): string {
	const value = typeof amount === "string" ? Number.parseFloat(amount) : amount;

	if (Number.isNaN(value)) return "0.00 XLM";

	const minimumFractionDigits = options?.minDecimals ?? 2;
	const maximumFractionDigits = options?.maxDecimals ?? XLM_MAX_DECIMALS;

	const formatted = new Intl.NumberFormat("en-US", {
		minimumFractionDigits,
		maximumFractionDigits,
	}).format(value);

	return `${formatted} XLM`;
}

/**
 * Rounds `amount` to stroop precision (7 decimal places) using standard
 * rounding.  Use this before sending an amount to the Stellar network so
 * the value you display to the user is exactly what gets submitted.
 *
 * Returns `NaN` when the input is not a finite number.
 */
export function toStroopPrecision(amount: number | string): number {
	const value = typeof amount === "string" ? Number.parseFloat(amount) : amount;
	if (!Number.isFinite(value)) return Number.NaN;
	// Use toFixed to avoid floating-point artefacts, then re-parse.
	return Number.parseFloat(value.toFixed(XLM_MAX_DECIMALS));
}

/**
 * Returns true when `amount` is exactly representable in stroops — i.e. it
 * does not lose precision when converted to stroops and back.
 */
export function isExactStroopAmount(amount: number | string): boolean {
	const value = typeof amount === "string" ? Number.parseFloat(amount) : amount;
	if (!Number.isFinite(value)) return false;
	const rounded = toStroopPrecision(value);
	return rounded === value;
}
