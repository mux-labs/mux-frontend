import { describe, expect, it } from "vitest";
import { readCorrelationId } from "./helpers";

describe("readCorrelationId", () => {
	it("returns the echoed correlationId from a login error body", () => {
		const body = {
			code: "INVALID_CREDENTIALS",
			correlationId: "corr-abc-123",
		};

		expect(readCorrelationId(body)).toBe("corr-abc-123");
	});

	it("returns the correlationId for every LOGIN_ERROR_CODES value", () => {
		const codes = [
			"INVALID_CREDENTIALS",
			"ACCOUNT_LOCKED",
			"RATE_LIMITED",
			"UNKNOWN",
		];

		for (const code of codes) {
			expect(readCorrelationId({ code, correlationId: `corr-${code}` })).toBe(
				`corr-${code}`,
			);
		}
	});

	it("returns undefined when correlationId is absent", () => {
		expect(readCorrelationId({ code: "INVALID_CREDENTIALS" })).toBeUndefined();
	});

	it("returns undefined for a non-object body", () => {
		expect(readCorrelationId(null)).toBeUndefined();
		expect(readCorrelationId(undefined)).toBeUndefined();
	});
});
