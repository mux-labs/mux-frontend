/**
 * Address validation and formatting utilities for Stellar addresses
 * Provides comprehensive validation and format checking for copy operations
 */

export type AddressFormat = "full" | "truncated";
export type AddressValidationResult = {
	isValid: boolean;
	format: AddressFormat | null;
	error: string | null;
	fullAddress: string | null;
};

const BASE32_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

function decodeBase32(value: string): Uint8Array | null {
	let bits = 0;
	let buffer = 0;
	const bytes: number[] = [];

	for (const character of value) {
		const digit = BASE32_ALPHABET.indexOf(character);
		if (digit === -1) return null;
		buffer = (buffer << 5) | digit;
		bits += 5;
		if (bits >= 8) {
			bits -= 8;
			bytes.push((buffer >>> bits) & 0xff);
		}
	}

	return Uint8Array.from(bytes);
}

function crc16Xmodem(payload: Uint8Array): number {
	let crc = 0;
	for (const byte of payload) {
		crc ^= byte << 8;
		for (let bit = 0; bit < 8; bit += 1) {
			crc = (crc & 0x8000) !== 0 ? (crc << 1) ^ 0x1021 : crc << 1;
			crc &= 0xffff;
		}
	}
	return crc;
}

/**
 * Verifies the CRC16-XModem checksum embedded in a Stellar StrKey account ID.
 * Stellar serializes the checksum little-endian in the final two decoded bytes.
 */
export function hasValidStellarChecksum(address: string): boolean {
	const normalized = address.trim().toUpperCase();
	if (!/^G[A-Z2-7]{55}$/.test(normalized)) return false;

	const decoded = decodeBase32(normalized);
	if (!decoded || decoded.length !== 35 || decoded[0] !== 6 << 3) return false;

	const payload = decoded.slice(0, -2);
	const expected = decoded[decoded.length - 2] | (decoded[decoded.length - 1] << 8);
	return crc16Xmodem(payload) === expected;
}

/**
 * Validates if a string is a valid Stellar address
 * Stellar addresses start with 'G' and are 56 characters long
 * @param address - The address to validate
 * @returns true if valid, false otherwise
 */
export function isValidStellarAddress(address: string): boolean {
	if (!address || typeof address !== "string") return false;
	return hasValidStellarChecksum(address);
}

/**
 * Checks if a string is a truncated Stellar address
 * Truncated format: 6 chars + "..." + 4 chars (e.g., "GBZXN7...MADI")
 * @param address - The address to check
 * @returns true if truncated format, false otherwise
 */
export function isTruncatedAddress(address: string): boolean {
	if (!address || typeof address !== "string") return false;
	return /^G[A-Z2-7]{5}\.\.\.[A-Z2-7]{4}$/.test(address);
}

/**
 * Expands a truncated address back to full format
 * Requires the original full address to reconstruct
 * @param truncated - The truncated address (e.g., "GBZXN7...MADI")
 * @param fullAddress - The original full address
 * @returns The full address if valid, null otherwise
 */
export function expandTruncatedAddress(
	truncated: string,
	fullAddress: string,
): string | null {
	if (!isTruncatedAddress(truncated)) return null;
	if (!isValidStellarAddress(fullAddress)) return null;

	// Verify the truncated address matches the full address
	const prefix = fullAddress.slice(0, 6);
	const suffix = fullAddress.slice(-4);
	const expectedTruncated = `${prefix}...${suffix}`;

	if (truncated === expectedTruncated) {
		return fullAddress;
	}

	return null;
}

/**
 * Validates an address for copy operation
 * Checks if the address is in a valid format (full or truncated)
 * @param address - The address to validate
 * @param fullAddress - Optional full address for truncated validation
 * @returns Validation result with details
 */
export function validateAddressForCopy(
	address: string,
	fullAddress?: string,
): AddressValidationResult {
	// Check if it's a full address
	if (isValidStellarAddress(address)) {
		return {
			isValid: true,
			format: "full",
			error: null,
			fullAddress: address,
		};
	}

	// Check if it's a truncated address
	if (isTruncatedAddress(address)) {
		if (!fullAddress) {
			return {
				isValid: false,
				format: "truncated",
				error: "Truncated address requires full address for validation",
				fullAddress: null,
			};
		}

		const expanded = expandTruncatedAddress(address, fullAddress);
		if (expanded) {
			return {
				isValid: true,
				format: "truncated",
				error: null,
				fullAddress: expanded,
			};
		}

		return {
			isValid: false,
			format: "truncated",
			error: "Truncated address does not match full address",
			fullAddress: null,
		};
	}

	// Invalid format
	return {
		isValid: false,
		format: null,
		error: "Invalid address format",
		fullAddress: null,
	};
}

/**
 * Gets a human-readable error message for address validation
 * @param result - The validation result
 * @returns Error message or null if valid
 */
export function getAddressValidationError(
	result: AddressValidationResult,
): string | null {
	if (result.isValid) return null;

	if (result.error) return result.error;

	if (result.format === "full") {
		return "Invalid Stellar address format";
	}

	if (result.format === "truncated") {
		return "Invalid truncated address format";
	}

	return "Address validation failed";
}

/**
 * Sanitizes an address for display
 * Removes any whitespace and converts to uppercase
 * @param address - The address to sanitize
 * @returns Sanitized address
 */
export function sanitizeAddress(address: string): string {
	if (!address || typeof address !== "string") return "";
	return address.trim().toUpperCase();
}

/**
 * Validates address before copy operation
 * Comprehensive check including format and content
 * @param address - The address to validate
 * @param fullAddress - Optional full address for context
 * @returns true if safe to copy, false otherwise
 */
export function isSafeToCopy(address: string, fullAddress?: string): boolean {
	const result = validateAddressForCopy(address, fullAddress);
	return result.isValid && result.fullAddress !== null;
}

/**
 * Gets the address to copy (full address if truncated)
 * @param address - The address to process
 * @param fullAddress - Optional full address for truncated expansion
 * @returns The address to copy, or null if invalid
 */
export function getAddressToCopy(
	address: string,
	fullAddress?: string,
): string | null {
	const result = validateAddressForCopy(address, fullAddress);
	return result.fullAddress;
}
