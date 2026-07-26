import { hasValidStellarChecksum } from "@/utils/addressValidation";

/**
 * Truncates a long address string for display.
 * Example: "GBZXN7PIRZGNMHGA7MUUUF4GWPY5AYPV6LY4UV2GL6VJGIQRXFDNMADI" -> "GBZXN7...MADI"
 */
export function truncateAddress(address: string): string {
	if (address.length <= 12) return address;
	return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

/**
 * Validates a Stellar public key (G-address).
 * Stellar public keys are 56 characters, start with 'G', and use base32 alphabet.
 */
export function validateStellarAddress(address: string): {
	valid: boolean;
	error?: string;
} {
	const trimmed = address.trim();

	if (!trimmed) {
		return { valid: false, error: "Address is required." };
	}

	if (!trimmed.startsWith("G")) {
		return {
			valid: false,
			error: "Stellar public keys must start with 'G'.",
		};
	}

	if (trimmed.length !== 56) {
		return {
			valid: false,
			error: `Address must be 56 characters (got ${trimmed.length}).`,
		};
	}

	// Stellar uses base32 alphabet: A-Z and 2-7
	if (!/^[A-Z2-7]{56}$/.test(trimmed)) {
		return {
			valid: false,
			error: "Address contains invalid characters (must be A-Z or 2-7).",
		};
	}

	if (!hasValidStellarChecksum(trimmed)) {
		return {
			valid: false,
			error: "Address checksum is invalid. Check the last characters and try again.",
		};
	}

	return { valid: true };
}
