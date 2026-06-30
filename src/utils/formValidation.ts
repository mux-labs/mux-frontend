/**
 * Form validation utilities for Network & Stellar UX
 * Provides reusable validation rules and error messages
 */

export interface ValidationResult {
	valid: boolean;
	error?: string;
}

/**
 * Validate API key name
 * - Required
 * - 1-50 characters
 * - Alphanumeric, spaces, hyphens, underscores only
 */
export function validateApiKeyName(value: string): ValidationResult {
	const trimmed = value.trim();

	if (!trimmed) {
		return { valid: false, error: "Key name is required" };
	}

	if (trimmed.length > 50) {
		return { valid: false, error: "Key name must be 50 characters or less" };
	}

	if (!/^[a-zA-Z0-9\s\-_]+$/.test(trimmed)) {
		return {
			valid: false,
			error: "Key name can only contain letters, numbers, spaces, hyphens, and underscores",
		};
	}

	return { valid: true };
}

/**
 * Validate wallet label
 * - Optional
 * - Max 30 characters
 * - No special characters except spaces, hyphens, underscores
 */
export function validateWalletLabel(value: string): ValidationResult {
	const trimmed = value.trim();

	// Empty is valid (optional field)
	if (!trimmed) {
		return { valid: true };
	}

	if (trimmed.length > 30) {
		return { valid: false, error: "Label must be 30 characters or less" };
	}

	if (/[<>"'&%$#@!()]/.test(trimmed)) {
		return {
			valid: false,
			error: "Label contains invalid characters",
		};
	}

	return { valid: true };
}

/**
 * Validate network selection
 * - Must be 'mainnet' or 'testnet'
 */
export function validateNetwork(value: string): ValidationResult {
	if (!value) {
		return { valid: false, error: "Network is required" };
	}

	if (value !== "mainnet" && value !== "testnet") {
		return { valid: false, error: "Invalid network selection" };
	}

	return { valid: true };
}

/**
 * Validate spending limit amount
 * - Required
 * - Must be positive number
 * - Max 2 decimal places
 */
export function validateSpendingLimit(value: string): ValidationResult {
	const trimmed = value.trim();

	if (!trimmed) {
		return { valid: false, error: "Spending limit is required" };
	}

	const num = parseFloat(trimmed);

	if (isNaN(num)) {
		return { valid: false, error: "Spending limit must be a valid number" };
	}

	if (num <= 0) {
		return { valid: false, error: "Spending limit must be greater than 0" };
	}

	if (!/^\d+(\.\d{1,2})?$/.test(trimmed)) {
		return {
			valid: false,
			error: "Spending limit can have at most 2 decimal places",
		};
	}

	return { valid: true };
}

/**
 * Validate email address
 * - Required
 * - Valid email format
 */
export function validateEmail(value: string): ValidationResult {
	const trimmed = value.trim();

	if (!trimmed) {
		return { valid: false, error: "Email is required" };
	}

	const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
	if (!emailRegex.test(trimmed)) {
		return { valid: false, error: "Please enter a valid email address" };
	}

	return { valid: true };
}

/**
 * Validate recovery code
 * - Required
 * - 6-12 alphanumeric characters
 */
export function validateRecoveryCode(value: string): ValidationResult {
	const trimmed = value.trim().toUpperCase();

	if (!trimmed) {
		return { valid: false, error: "Recovery code is required" };
	}

	if (trimmed.length < 6 || trimmed.length > 12) {
		return {
			valid: false,
			error: "Recovery code must be 6-12 characters",
		};
	}

	if (!/^[A-Z0-9]+$/.test(trimmed)) {
		return {
			valid: false,
			error: "Recovery code must contain only letters and numbers",
		};
	}

	return { valid: true };
}

/**
 * Validate password strength
 * - Required
 * - Min 8 characters
 * - Must contain uppercase, lowercase, number, special char
 */
export function validatePasswordStrength(value: string): ValidationResult {
	if (!value) {
		return { valid: false, error: "Password is required" };
	}

	if (value.length < 8) {
		return { valid: false, error: "Password must be at least 8 characters" };
	}

	if (!/[A-Z]/.test(value)) {
		return {
			valid: false,
			error: "Password must contain an uppercase letter",
		};
	}

	if (!/[a-z]/.test(value)) {
		return {
			valid: false,
			error: "Password must contain a lowercase letter",
		};
	}

	if (!/[0-9]/.test(value)) {
		return {
			valid: false,
			error: "Password must contain a number",
		};
	}

	if (!/[!@#$%^&*()_\-+=\[\]{};:'",.<>?/\\|`~]/.test(value)) {
		return {
			valid: false,
			error: "Password must contain a special character",
		};
	}

	return { valid: true };
}

/**
 * Check if two values match
 * Useful for password confirmation
 */
export function validateMatch(
	value1: string,
	value2: string,
	fieldName = "Values",
): ValidationResult {
	if (value1 !== value2) {
		return {
			valid: false,
			error: `${fieldName} do not match`,
		};
	}

	return { valid: true };
}

/**
 * Validate that a value is not in a list (e.g., duplicate check)
 */
export function validateNotInList(
	value: string,
	list: string[],
	itemName = "Item",
): ValidationResult {
	const trimmed = value.trim();

	if (list.some((item) => item.trim().toLowerCase() === trimmed.toLowerCase())) {
		return {
			valid: false,
			error: `${itemName} has already been added`,
		};
	}

	return { valid: true };
}

/**
 * Validate string is not empty
 */
export function validateRequired(
	value: string,
	fieldName = "This field",
): ValidationResult {
	if (!value.trim()) {
		return {
			valid: false,
			error: `${fieldName} is required`,
		};
	}

	return { valid: true };
}

/**
 * Validate minimum length
 */
export function validateMinLength(
	value: string,
	minLength: number,
	fieldName = "Field",
): ValidationResult {
	if (value.trim().length < minLength) {
		return {
			valid: false,
			error: `${fieldName} must be at least ${minLength} characters`,
		};
	}

	return { valid: true };
}

/**
 * Validate maximum length
 */
export function validateMaxLength(
	value: string,
	maxLength: number,
	fieldName = "Field",
): ValidationResult {
	if (value.trim().length > maxLength) {
		return {
			valid: false,
			error: `${fieldName} must be ${maxLength} characters or less`,
		};
	}

	return { valid: true };
}
