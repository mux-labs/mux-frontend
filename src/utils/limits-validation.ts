/**
 * Spending-limit validation mirroring server rules (#832).
 *
 * The server remains the source of truth; this mirror only rejects input the
 * server would reject so users get early, stable-coded feedback. Unknown keys
 * are denied by default.
 */

export const LIMIT_RULES = {
	maxDecimals: 7, // Stellar stroop precision
	maxAmount: 922_337_203_685.4775807, // int64 stroops
} as const;

export type LimitsErrorCode =
	| "LIMIT_REQUIRED"
	| "LIMIT_NOT_NUMERIC"
	| "LIMIT_NEGATIVE"
	| "LIMIT_TOO_PRECISE"
	| "LIMIT_TOO_LARGE"
	| "LIMIT_DAILY_EXCEEDS_MONTHLY"
	| "LIMIT_PER_TX_EXCEEDS_DAILY"
	| "LIMIT_UNKNOWN_KEY";

export interface LimitsInput {
	perTransaction?: string;
	daily?: string;
	monthly?: string;
}

export type LimitsErrors = Partial<
	Record<keyof LimitsInput | "_form", LimitsErrorCode>
>;

const ALLOWED_KEYS: ReadonlyArray<keyof LimitsInput> = [
	"perTransaction",
	"daily",
	"monthly",
];

function validateAmount(raw: string | undefined): LimitsErrorCode | number {
	if (raw === undefined || raw.trim() === "") return "LIMIT_REQUIRED";
	const value = raw.trim();
	if (!/^-?\d+(\.\d+)?$/.test(value)) return "LIMIT_NOT_NUMERIC";
	if (value.startsWith("-")) return "LIMIT_NEGATIVE";
	const decimals = value.split(".")[1]?.length ?? 0;
	if (decimals > LIMIT_RULES.maxDecimals) return "LIMIT_TOO_PRECISE";
	const num = Number(value);
	if (num > LIMIT_RULES.maxAmount) return "LIMIT_TOO_LARGE";
	return num;
}

export function validateLimits(input: Record<string, unknown>): {
	ok: boolean;
	errors: LimitsErrors;
} {
	const errors: LimitsErrors = {};

	if (
		Object.keys(input).some(
			(k) => !ALLOWED_KEYS.includes(k as keyof LimitsInput),
		)
	) {
		errors._form = "LIMIT_UNKNOWN_KEY";
	}

	const values: Partial<Record<keyof LimitsInput, number>> = {};
	for (const key of ALLOWED_KEYS) {
		const raw = input[key];
		const result = validateAmount(
			typeof raw === "string"
				? raw
				: raw === undefined
					? undefined
					: String(raw),
		);
		if (typeof result === "number") values[key] = result;
		else errors[key] = result;
	}

	const { perTransaction, daily, monthly } = values;
	if (daily !== undefined && monthly !== undefined && daily > monthly) {
		errors.daily = "LIMIT_DAILY_EXCEEDS_MONTHLY";
	}
	if (
		perTransaction !== undefined &&
		daily !== undefined &&
		perTransaction > daily
	) {
		errors.perTransaction = "LIMIT_PER_TX_EXCEEDS_DAILY";
	}

	return { ok: Object.keys(errors).length === 0, errors };
}
