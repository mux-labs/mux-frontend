"use client";

/**
 * Validation result for a single form field.
 */
export interface FieldError {
	/** The field name that has the error */
	field: string;
	/** Human-readable error message */
	message: string;
}

/**
 * Validates a transaction amount string.
 * Amount must be a positive number with up to 6 decimal places, greater than 0.
 *
 * @param value - The amount string to validate.
 * @returns A FieldError if validation fails, or null if valid.
 */
export function validateAmount(value: string): FieldError | null {
	if (!value || value.trim() === "") {
		return { field: "amount", message: "Amount is required" };
	}

	const trimmed = value.trim();
	const num = Number(trimmed);

	if (Number.isNaN(num)) {
		return { field: "amount", message: "Amount must be a valid number" };
	}

	if (num <= 0) {
		return { field: "amount", message: "Amount must be greater than 0" };
	}

	const decimalMatch = trimmed.match(/\.(\d+)/);
	if (decimalMatch && decimalMatch[1].length > 6) {
		return {
			field: "amount",
			message: "Amount can have at most 6 decimal places",
		};
	}

	return null;
}

/**
 * Validates a wallet/address string.
 * Must be a non-empty string that matches common blockchain address formats.
 *
 * @param value - The address string to validate.
 * @returns A FieldError if validation fails, or null if valid.
 */
export function validateAddress(value: string): FieldError | null {
	if (!value || value.trim() === "") {
		return { field: "address", message: "Address is required" };
	}

	const trimmed = value.trim();
	const addressRegex = /^(0x)?[a-zA-Z0-9]{32,44}$/;

	if (!addressRegex.test(trimmed)) {
		return {
			field: "address",
			message: "Invalid address format (must be 32-44 alphanumeric characters)",
		};
	}

	return null;
}

/**
 * Validates a memo/note string.
 * Optional field. If provided, must be at most 500 characters.
 *
 * @param value - The memo string to validate.
 * @returns A FieldError if validation fails, or null if valid.
 */
export function validateMemo(value: string): FieldError | null {
	if (!value || value.trim() === "") {
		return null;
	}

	if (value.length > 500) {
		return {
			field: "memo",
			message: "Memo must be at most 500 characters",
		};
	}

	return null;
}

/**
 * Result of validating a complete transaction form.
 */
export interface TransactionFormValidation {
	/** Whether all fields passed validation */
	isValid: boolean;
	/** Array of field-level errors, empty when valid */
	errors: FieldError[];
}

/**
 * Validates all fields in a transaction form.
 *
 * @param data - The form data to validate.
 * @returns A TransactionFormValidation with the combined results.
 */
export function validateTransactionForm(data: {
	amount: string;
	address: string;
	memo?: string;
}): TransactionFormValidation {
	const errors: FieldError[] = [];

	const amountError = validateAmount(data.amount);
	if (amountError) errors.push(amountError);

	const addressError = validateAddress(data.address);
	if (addressError) errors.push(addressError);

	const memoError = validateMemo(data.memo ?? "");
	if (memoError) errors.push(memoError);

	return {
		isValid: errors.length === 0,
		errors,
	};
}
