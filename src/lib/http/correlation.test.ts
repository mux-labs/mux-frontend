import { describe, expect, it } from "vitest";

import { isValidCorrelationId } from "./correlation";

describe("isValidCorrelationId", () => {
	it("accepts conservative opaque ids", () => {
		expect(isValidCorrelationId("abc123")).toBe(true);
		expect(isValidCorrelationId("550e8400-e29b-41d4-a716-446655440000")).toBe(
			true,
		);
		expect(isValidCorrelationId("req_01:abc.def-ghi")).toBe(true);
		expect(isValidCorrelationId("a")).toBe(true);
		expect(isValidCorrelationId("a".repeat(128))).toBe(true);
	});

	it("rejects non-string values", () => {
		expect(isValidCorrelationId(undefined)).toBe(false);
		expect(isValidCorrelationId(null)).toBe(false);
		expect(isValidCorrelationId(123)).toBe(false);
		expect(isValidCorrelationId({})).toBe(false);
	});

	it("rejects empty and whitespace-only ids", () => {
		expect(isValidCorrelationId("")).toBe(false);
		expect(isValidCorrelationId("   ")).toBe(false);
	});

	it("rejects ids containing markup", () => {
		expect(isValidCorrelationId("<script>alert(1)</script>")).toBe(false);
		expect(isValidCorrelationId("abc<img src=x>")).toBe(false);
		expect(isValidCorrelationId('abc"onmouseover="x')).toBe(false);
	});

	it("rejects ids containing log-forging newlines", () => {
		expect(isValidCorrelationId("abc\ndef")).toBe(false);
		expect(isValidCorrelationId("abc\rdef")).toBe(false);
		expect(isValidCorrelationId("abc\r\ndef")).toBe(false);
	});

	it("rejects oversized ids", () => {
		expect(isValidCorrelationId("a".repeat(129))).toBe(false);
		expect(isValidCorrelationId("a".repeat(1024))).toBe(false);
	});

	it("rejects ids with disallowed characters", () => {
		expect(isValidCorrelationId("abc def")).toBe(false);
		expect(isValidCorrelationId("abc/def")).toBe(false);
		expect(isValidCorrelationId("abc;def")).toBe(false);
	});
});
