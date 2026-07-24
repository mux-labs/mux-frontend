import { describe, it, expect } from "vitest";
import {
	getExplorerUrl,
	isValidStellarAddress,
	isValidStellarTransaction,
} from "@/utils/explorerUrl";
import {
	getCachedExplorerBaseUrl,
	getCachedExplorerUrl,
	clearExplorerUrlCache,
} from "@/utils/explorerUrlCache";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------
const VALID_ADDRESS = "GBZXN7PIRZGNMHGA7MUUUF4GWPY5AYPV6LY4UV2GL6VJGIQRXFDNMADI";
const VALID_TX =
	"a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2";

// ---------------------------------------------------------------------------
// getExplorerUrl
// ---------------------------------------------------------------------------
describe("getExplorerUrl", () => {
	it("generates a mainnet account URL", () => {
		const url = getExplorerUrl(VALID_ADDRESS, "mainnet", "account");
		expect(url).toBe(
			`https://stellar.expert/explorer/public/account/${VALID_ADDRESS}`,
		);
	});

	it("generates a testnet account URL", () => {
		const url = getExplorerUrl(VALID_ADDRESS, "testnet", "account");
		expect(url).toBe(
			`https://stellar.expert/explorer/testnet/account/${VALID_ADDRESS}`,
		);
	});

	it("generates a mainnet transaction URL", () => {
		const url = getExplorerUrl(VALID_TX, "mainnet", "transaction");
		expect(url).toBe(
			`https://stellar.expert/explorer/public/tx/${VALID_TX}`,
		);
	});

	it("generates a testnet transaction URL", () => {
		const url = getExplorerUrl(VALID_TX, "testnet", "transaction");
		expect(url).toBe(
			`https://stellar.expert/explorer/testnet/tx/${VALID_TX}`,
		);
	});

	it("generates an address-type URL", () => {
		const url = getExplorerUrl(VALID_ADDRESS, "mainnet", "address");
		expect(url).toBe(
			`https://stellar.expert/explorer/public/${VALID_ADDRESS}`,
		);
	});

	it("defaults to account type when type is omitted", () => {
		const url = getExplorerUrl(VALID_ADDRESS, "mainnet");
		expect(url).toContain("/account/");
	});

	it("URL-encodes special characters in the identifier", () => {
		// Edge case: identifier with spaces (not a real address, but tests encoding)
		const url = getExplorerUrl("hello world", "mainnet", "address");
		expect(url).toContain("hello%20world");
	});

	it("throws when identifier is empty", () => {
		expect(() => getExplorerUrl("", "mainnet")).toThrow();
	});

	it("throws when identifier is only whitespace", () => {
		expect(() => getExplorerUrl("   ", "mainnet")).toThrow();
	});
});

// ---------------------------------------------------------------------------
// isValidStellarAddress
// ---------------------------------------------------------------------------
describe("isValidStellarAddress", () => {
	it("returns true for a valid 56-char G-address", () => {
		expect(isValidStellarAddress(VALID_ADDRESS)).toBe(true);
	});

	it("returns false for an address that is too short", () => {
		expect(isValidStellarAddress("GBZXN7PIRZGN")).toBe(false);
	});

	it("returns false for an address that is too long", () => {
		expect(isValidStellarAddress(`${VALID_ADDRESS}X`)).toBe(false);
	});

	it("returns false for an address not starting with G", () => {
		const badAddress = `A${VALID_ADDRESS.slice(1)}`;
		expect(isValidStellarAddress(badAddress)).toBe(false);
	});

	it("returns false for an address with invalid characters", () => {
		const badAddress = `G${"B".repeat(54)}1`; // '1' is not in base32
		expect(isValidStellarAddress(badAddress)).toBe(false);
	});

	it("returns false for an empty string", () => {
		expect(isValidStellarAddress("")).toBe(false);
	});

	it("returns false for null-ish input", () => {
		// @ts-expect-error – intentional runtime safety test
		expect(isValidStellarAddress(null)).toBe(false);
	});
});

// ---------------------------------------------------------------------------
// isValidStellarTransaction
// ---------------------------------------------------------------------------
describe("isValidStellarTransaction", () => {
	it("returns true for a valid 64-char hex string", () => {
		expect(isValidStellarTransaction(VALID_TX)).toBe(true);
	});

	it("is case-insensitive", () => {
		expect(isValidStellarTransaction(VALID_TX.toUpperCase())).toBe(true);
	});

	it("returns false for a hash that is too short", () => {
		expect(isValidStellarTransaction(VALID_TX.slice(0, 32))).toBe(false);
	});

	it("returns false for a hash with non-hex characters", () => {
		const bad = `g${"a".repeat(63)}`;
		expect(isValidStellarTransaction(bad)).toBe(false);
	});

	it("returns false for an empty string", () => {
		expect(isValidStellarTransaction("")).toBe(false);
	});
});

// ---------------------------------------------------------------------------
// getCachedExplorerBaseUrl / getCachedExplorerUrl
// ---------------------------------------------------------------------------
describe("getCachedExplorerBaseUrl", () => {
	beforeEach(() => clearExplorerUrlCache());

	it("returns the correct mainnet account base URL", () => {
		expect(getCachedExplorerBaseUrl("account", "mainnet")).toBe(
			"https://stellar.expert/explorer/public/account",
		);
	});

	it("returns the correct testnet account base URL", () => {
		expect(getCachedExplorerBaseUrl("account", "testnet")).toBe(
			"https://stellar.expert/explorer/testnet/account",
		);
	});

	it("returns the same string reference on repeated calls (cached)", () => {
		const first = getCachedExplorerBaseUrl("transaction", "mainnet");
		const second = getCachedExplorerBaseUrl("transaction", "mainnet");
		expect(first).toBe(second); // strict reference equality
	});

	it("returns different values for different networks", () => {
		const mainnet = getCachedExplorerBaseUrl("account", "mainnet");
		const testnet = getCachedExplorerBaseUrl("account", "testnet");
		expect(mainnet).not.toBe(testnet);
	});
});

describe("getCachedExplorerUrl", () => {
	beforeEach(() => clearExplorerUrlCache());

	it("builds a full URL with cached base", () => {
		const url = getCachedExplorerUrl(VALID_ADDRESS, "mainnet", "account");
		expect(url).toBe(
			`https://stellar.expert/explorer/public/account/${VALID_ADDRESS}`,
		);
	});

	it("defaults to account type", () => {
		const url = getCachedExplorerUrl(VALID_ADDRESS, "testnet");
		expect(url).toContain("/account/");
	});

	it("throws for an empty identifier", () => {
		expect(() => getCachedExplorerUrl("", "mainnet")).toThrow();
	});
});
