import { describe, expect, it } from "vitest";
import {
	CORRELATION_HEADER,
	isValidCorrelationId,
	readCorrelationId,
	resolveCorrelationId,
} from "./correlation";

// Mirrors the upper bound in CORRELATION_ID_RE. The pattern is not exported,
// so the boundary is asserted via behaviour.
const MAX_LENGTH = 128;

describe("CORRELATION_HEADER", () => {
	it("is the lowercase x-correlation-id header", () => {
		expect(CORRELATION_HEADER).toBe("x-correlation-id");
	});
});

describe("isValidCorrelationId", () => {
	it.each([
		"a",
		"Z",
		"0",
		"corr-9",
		"req_123",
		"trace.span",
		"svc:req:42",
		"AbC-09._:xyz",
		"123e4567-e89b-12d3-a456-426614174000",
	])("accepts %j", (value) => {
		expect(isValidCorrelationId(value)).toBe(true);
	});

	it(`accepts an id of exactly ${MAX_LENGTH} characters`, () => {
		expect(isValidCorrelationId("a".repeat(MAX_LENGTH))).toBe(true);
	});

	it(`rejects an id of ${MAX_LENGTH + 1} characters`, () => {
		expect(isValidCorrelationId("a".repeat(MAX_LENGTH + 1))).toBe(false);
	});

	it("rejects the empty string", () => {
		expect(isValidCorrelationId("")).toBe(false);
	});

	it.each([
		["a space", "corr 9"],
		["a leading space", " corr"],
		["a trailing space", "corr "],
		["a tab", "corr\t9"],
		["a newline", "corr\n9"],
		["a trailing newline", "corr-9\n"],
		["a carriage return", "corr\r9"],
		["a forged log line", "ok\r\nlevel=error msg=forged"],
		["a NUL byte", "corr\u00009"],
		["a DEL control character", "corr\u007f9"],
		["a less-than sign", "corr<9"],
		["a greater-than sign", "corr>9"],
		["markup", "<script>alert(1)</script>"],
		["a slash", "corr/9"],
		["a quote", 'corr"9'],
		["a non-ASCII letter", "corré"],
	])("rejects an id containing %s", (_label, value) => {
		expect(isValidCorrelationId(value)).toBe(false);
	});

	it.each([
		["undefined", undefined],
		["null", null],
		["a number", 123],
		["a boolean", true],
		["an object", { id: "corr-9" }],
		["an array", ["corr-9"]],
	])("rejects non-string input: %s", (_label, value) => {
		expect(isValidCorrelationId(value)).toBe(false);
	});
});

describe("readCorrelationId", () => {
	it("reads x-correlation-id", () => {
		const headers = new Headers({ [CORRELATION_HEADER]: "corr-1" });
		expect(readCorrelationId(headers)).toBe("corr-1");
	});

	it("falls back to x-request-id when x-correlation-id is absent", () => {
		const headers = new Headers({ "x-request-id": "req-1" });
		expect(readCorrelationId(headers)).toBe("req-1");
	});

	it("prefers x-correlation-id over x-request-id when both are present", () => {
		const headers = new Headers({
			[CORRELATION_HEADER]: "corr-1",
			"x-request-id": "req-1",
		});
		expect(readCorrelationId(headers)).toBe("corr-1");
	});

	it("returns null when neither header is present", () => {
		expect(readCorrelationId(new Headers())).toBeNull();
	});

	it("returns null for an unsafe x-correlation-id", () => {
		const headers = new Headers({ [CORRELATION_HEADER]: "<b>corr</b>" });
		expect(readCorrelationId(headers)).toBeNull();
	});

	it("returns null for an unsafe x-request-id", () => {
		const headers = new Headers({ "x-request-id": "a".repeat(MAX_LENGTH + 1) });
		expect(readCorrelationId(headers)).toBeNull();
	});

	it("does not fall back to x-request-id when x-correlation-id is present but unsafe", () => {
		const headers = new Headers({
			[CORRELATION_HEADER]: "bad id",
			"x-request-id": "req-1",
		});
		expect(readCorrelationId(headers)).toBeNull();
	});
});

describe("resolveCorrelationId", () => {
	it("echoes a safe inbound x-correlation-id", () => {
		const headers = new Headers({ [CORRELATION_HEADER]: "corr-9" });
		expect(resolveCorrelationId(headers)).toBe("corr-9");
	});

	it("echoes a safe inbound x-request-id", () => {
		const headers = new Headers({ "x-request-id": "req-9" });
		expect(resolveCorrelationId(headers)).toBe("req-9");
	});

	it("mints a valid id when no inbound id is present", () => {
		const minted = resolveCorrelationId(new Headers());
		expect(isValidCorrelationId(minted)).toBe(true);
	});

	it("mints a fresh, valid id instead of echoing an unsafe inbound id", () => {
		const unsafe = "<script>alert(1)</script>";
		const minted = resolveCorrelationId(
			new Headers({ [CORRELATION_HEADER]: unsafe }),
		);
		expect(minted).not.toBe(unsafe);
		expect(isValidCorrelationId(minted)).toBe(true);
	});

	it("mints a fresh id per call", () => {
		const first = resolveCorrelationId(new Headers());
		const second = resolveCorrelationId(new Headers());
		expect(first).not.toBe(second);
	});
});
