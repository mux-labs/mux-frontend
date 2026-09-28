import { describe, expect, it } from "vitest";
import { buildBackendUrl, getBackendApiBaseUrl } from "./config";

describe("getBackendApiBaseUrl (MUX_BACKEND_URL)", () => {
	it("fails closed when unset or blank", () => {
		expect(getBackendApiBaseUrl({})).toBeNull();
		expect(getBackendApiBaseUrl({ MUX_BACKEND_URL: "" })).toBeNull();
		expect(getBackendApiBaseUrl({ MUX_BACKEND_URL: "   " })).toBeNull();
	});

	it("rejects malformed and non-http(s) URLs", () => {
		expect(getBackendApiBaseUrl({ MUX_BACKEND_URL: "not a url" })).toBeNull();
		expect(
			getBackendApiBaseUrl({ MUX_BACKEND_URL: "ftp://backend" }),
		).toBeNull();
		expect(
			getBackendApiBaseUrl({ MUX_BACKEND_URL: "javascript:alert(1)" }),
		).toBeNull();
	});

	it("rejects URLs with embedded credentials", () => {
		expect(
			getBackendApiBaseUrl({
				MUX_BACKEND_URL: "https://user:secret@backend.test",
			}),
		).toBeNull();
	});

	it("normalizes whitespace and trailing slashes", () => {
		expect(
			getBackendApiBaseUrl({ MUX_BACKEND_URL: " https://backend.test/ " }),
		).toBe("https://backend.test");
		expect(
			getBackendApiBaseUrl({ MUX_BACKEND_URL: "http://localhost:4000/api//" }),
		).toBe("http://localhost:4000/api");
	});
});

describe("buildBackendUrl", () => {
	const env = { MUX_BACKEND_URL: "https://backend.test/v1" };

	it("joins relative API paths onto the base URL", () => {
		expect(buildBackendUrl("/spending-limits", env)).toBe(
			"https://backend.test/v1/spending-limits",
		);
	});

	it("returns null when the backend is not configured", () => {
		expect(buildBackendUrl("/spending-limits", {})).toBeNull();
	});

	it("refuses paths that could escape the backend host", () => {
		expect(buildBackendUrl("spending-limits", env)).toBeNull();
		expect(buildBackendUrl("//evil.test/x", env)).toBeNull();
		expect(buildBackendUrl("/../admin", env)).toBeNull();
	});
});
