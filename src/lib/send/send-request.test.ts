import { describe, expect, it } from "vitest";
import {
	isValidIdempotencyKey,
	MAX_BODY_BYTES,
	parseSendBody,
} from "./send-request";

const VALID_WALLET_ID = "wallet_abc-123";
const VALID_DESTINATION = `G${"A".repeat(55)}`;
const VALID_ASSET = `native`;
const VALID_NETWORK = "testnet";

function validBody(overrides: Record<string, unknown> = {}) {
	return {
		walletId: VALID_WALLET_ID,
		destination: VALID_DESTINATION,
		amount: "1.5",
		asset: VALID_ASSET,
		network: VALID_NETWORK,
		...overrides,
	};
}

describe("parseSendBody", () => {
	it("returns null for null", () => {
		expect(parseSendBody(null)).toBeNull();
	});

	it("returns null for an array", () => {
		expect(parseSendBody([])).toBeNull();
		expect(parseSendBody([1, 2, 3])).toBeNull();
	});

	it("returns null for a non-object primitive", () => {
		expect(parseSendBody("not an object")).toBeNull();
		expect(parseSendBody(42)).toBeNull();
		expect(parseSendBody(undefined)).toBeNull();
	});

	it("returns null for an object with an unknown key", () => {
		expect(parseSendBody(validBody({ extra: "nope" }))).toBeNull();
	});

	it("returns null when walletId fails WALLET_ID_RE", () => {
		expect(parseSendBody(validBody({ walletId: "ab" }))).toBeNull(); // too short
		expect(parseSendBody(validBody({ walletId: "has a space" }))).toBeNull();
		expect(parseSendBody(validBody({ walletId: 123 }))).toBeNull();
	});

	it("returns null when destination is not a valid StrKey account/contract address", () => {
		expect(parseSendBody(validBody({ destination: "not-a-key" }))).toBeNull();
		// Wrong leading character.
		expect(
			parseSendBody(validBody({ destination: `X${"A".repeat(55)}` })),
		).toBeNull();
		// Right length, invalid base32 character (0, 1, 8, 9 excluded).
		expect(
			parseSendBody(validBody({ destination: `G${"0".repeat(55)}` })),
		).toBeNull();
	});

	it("returns null for amount of '0'", () => {
		expect(parseSendBody(validBody({ amount: "0" }))).toBeNull();
	});

	it("returns null for amount of '0.0'", () => {
		expect(parseSendBody(validBody({ amount: "0.0" }))).toBeNull();
	});

	it("returns null for amount with more than 7 fractional digits", () => {
		expect(parseSendBody(validBody({ amount: "1.12345678" }))).toBeNull();
	});

	it("accepts amount with exactly 7 fractional digits", () => {
		expect(parseSendBody(validBody({ amount: "1.1234567" }))).not.toBeNull();
	});

	it("returns null for a negative amount", () => {
		expect(parseSendBody(validBody({ amount: "-1" }))).toBeNull();
	});

	it("returns null when asset fails ASSET_RE", () => {
		expect(parseSendBody(validBody({ asset: "not-an-asset" }))).toBeNull();
		expect(parseSendBody(validBody({ asset: "" }))).toBeNull();
	});

	it("accepts the native asset and a CODE:ISSUER asset", () => {
		expect(parseSendBody(validBody({ asset: "native" }))).not.toBeNull();
		expect(
			parseSendBody(validBody({ asset: `USDC:${VALID_DESTINATION}` })),
		).not.toBeNull();
	});

	it("returns null when network is not a string", () => {
		expect(parseSendBody(validBody({ network: 1 }))).toBeNull();
	});

	it("returns null when memo exceeds MAX_MEMO_BYTES", () => {
		// MAX_MEMO_BYTES is 28; 29 ASCII bytes exceeds it.
		expect(parseSendBody(validBody({ memo: "a".repeat(29) }))).toBeNull();
	});

	it("accepts a memo at the byte limit and rejects memo as a non-string", () => {
		expect(parseSendBody(validBody({ memo: "a".repeat(28) }))).not.toBeNull();
		expect(parseSendBody(validBody({ memo: 123 }))).toBeNull();
	});

	it("returns exactly the allowed keys on a successful parse, omitting memo when undefined", () => {
		const result = parseSendBody(validBody());
		expect(result).toEqual({
			walletId: VALID_WALLET_ID,
			destination: VALID_DESTINATION,
			amount: "1.5",
			asset: VALID_ASSET,
			network: VALID_NETWORK,
		});
		expect(result && "memo" in result).toBe(false);
	});

	it("includes memo in the result when provided", () => {
		const result = parseSendBody(validBody({ memo: "for rent" }));
		expect(result).toEqual({
			walletId: VALID_WALLET_ID,
			destination: VALID_DESTINATION,
			amount: "1.5",
			asset: VALID_ASSET,
			network: VALID_NETWORK,
			memo: "for rent",
		});
	});

	it("exposes MAX_BODY_BYTES as a positive number", () => {
		expect(MAX_BODY_BYTES).toBeGreaterThan(0);
	});
});

describe("isValidIdempotencyKey", () => {
	it("rejects a key one character below the minimum length", () => {
		expect(isValidIdempotencyKey("a".repeat(15))).toBe(false);
	});

	it("accepts a key at the minimum length boundary (16)", () => {
		expect(isValidIdempotencyKey("a".repeat(16))).toBe(true);
	});

	it("accepts a key at the maximum length boundary (128)", () => {
		expect(isValidIdempotencyKey("a".repeat(128))).toBe(true);
	});

	it("rejects a key one character above the maximum length", () => {
		expect(isValidIdempotencyKey("a".repeat(129))).toBe(false);
	});

	it("rejects keys with disallowed characters", () => {
		expect(isValidIdempotencyKey(`${"a".repeat(15)}!`)).toBe(false);
		expect(isValidIdempotencyKey(`${"a".repeat(15)} `)).toBe(false);
		expect(isValidIdempotencyKey(`${"a".repeat(15)}.`)).toBe(false);
	});

	it("accepts underscores and hyphens within the allowed length", () => {
		expect(isValidIdempotencyKey(`${"a".repeat(14)}_-`)).toBe(true);
	});
});
