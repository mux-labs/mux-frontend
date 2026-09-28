import { describe, expect, it } from "vitest";
import {
	classifyServiceUnavailable,
	SERVICE_UNAVAILABLE_COPY,
} from "./maintenance";
import { DEFAULT_RETRY_AFTER_MS, MAX_RETRY_AFTER_MS } from "./retry-after";

const NOW = Date.UTC(2026, 8, 27, 12, 0, 0);

function unavailable(headers: Record<string, string> = {}, status = 503) {
	return new Response(null, { status, headers });
}

describe("classifyServiceUnavailable", () => {
	it("ignores non-503 statuses", () => {
		expect(
			classifyServiceUnavailable(unavailable({}, 500), undefined, NOW),
		).toBeNull();
		expect(
			classifyServiceUnavailable(unavailable({}, 429), undefined, NOW),
		).toBeNull();
	});

	it("detects maintenance from the header", () => {
		const state = classifyServiceUnavailable(
			unavailable({ "x-mux-maintenance": "true", "retry-after": "600" }),
			undefined,
			NOW,
		);
		expect(state?.code).toBe("MAINTENANCE");
		// Oversized Retry-After is clamped.
		expect(state?.retryAfterMs).toBe(MAX_RETRY_AFTER_MS);
	});

	it("detects maintenance from the body error code", () => {
		const state = classifyServiceUnavailable(
			unavailable(),
			{ error: { code: "maintenance" } },
			NOW,
		);
		expect(state?.code).toBe("MAINTENANCE");
	});

	it("fails closed to DEPENDENCY_UNAVAILABLE for any other 503", () => {
		for (const body of [
			undefined,
			null,
			"oops",
			{ error: { code: "db_down" } },
		]) {
			const state = classifyServiceUnavailable(
				unavailable({ "x-mux-maintenance": "maybe" }),
				body,
				NOW,
			);
			expect(state?.code).toBe("DEPENDENCY_UNAVAILABLE");
			expect(state?.retryAfterMs).toBe(DEFAULT_RETRY_AFTER_MS);
		}
	});

	it("propagates a safe correlation id", () => {
		const state = classifyServiceUnavailable(
			unavailable({ "x-correlation-id": "abc-123" }),
			undefined,
			NOW,
		);
		expect(state?.correlationId).toBe("abc-123");
		expect(state?.retryAt).toBe(NOW + DEFAULT_RETRY_AFTER_MS);
	});
});

describe("SERVICE_UNAVAILABLE_COPY", () => {
	it("is fixed copy with no links or markup a spoofed 503 could influence", () => {
		for (const copy of Object.values(SERVICE_UNAVAILABLE_COPY)) {
			expect(copy.title + copy.body).not.toMatch(/https?:|<|>/);
		}
	});
});
