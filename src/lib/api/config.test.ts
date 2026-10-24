import { describe, expect, it } from "vitest";
import { getBackendBaseUrl } from "../http/backend-url";
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

describe("getBackendBaseUrl / getBackendApiBaseUrl parity", () => {
	const envs = [
		{},
		{ MUX_BACKEND_URL: "" },
		{ MUX_BACKEND_URL: "   " },
		{ MUX_BACKEND_URL: "not a url" },
		{ MUX_BACKEND_URL: "ftp://backend" },
		{ MUX_BACKEND_URL: "javascript:alert(1)" },
		{ MUX_BACKEND_URL: "https://user:secret@backend.test" },
		{ MUX_BACKEND_URL: "https://user@backend.test" },
		{ MUX_BACKEND_URL: "http://:secret@backend.test" },
		{ MUX_BACKEND_URL: " https://backend.test/ " },
		{ MUX_BACKEND_URL: "http://localhost:4000/api//" },
		{ MUX_BACKEND_URL: "https://API.EXAMPLE.COM:443/" },
		{ MUX_BACKEND_URL: "https://API.EXAMPLE.COM:443/v1/" },
		{ MUX_BACKEND_URL: "http://API.EXAMPLE.COM:80" },
	];

	it("returns the same value (or both null) for the same env", () => {
		for (const env of envs) {
			expect(getBackendBaseUrl(env)).toBe(getBackendApiBaseUrl(env));
		}
	});

	it("rejects credential-bearing URLs in both helpers", () => {
		for (const MUX_BACKEND_URL of [
			"https://user:secret@backend.test",
			"https://user@backend.test",
			"http://:secret@backend.test",
		]) {
			expect(getBackendBaseUrl({ MUX_BACKEND_URL })).toBeNull();
			expect(getBackendApiBaseUrl({ MUX_BACKEND_URL })).toBeNull();
		}
	});

	it("normalizes uppercase host and default port identically", () => {
		const env = { MUX_BACKEND_URL: "https://API.EXAMPLE.COM:443/" };
		expect(getBackendBaseUrl(env)).toBe("https://api.example.com");
		expect(getBackendApiBaseUrl(env)).toBe("https://api.example.com");
	});
});

describe("buildBackendUrl", () => {
	const env = { MUX_BACKEND_URL: "https://backend.test/v1" };

	it("joins relative API paths onto the base URL", () => {
		expect(buildBackendUrl("/spending-limits", env)).toBe(
			"https://backend.test/v1/spending-limits",
		);
		expect(buildBackendUrl("/wallets/abc/balance?x=1", env)).toBe(
			"https://backend.test/v1/wallets/abc/balance?x=1",
		);
	});

	it("normalizes trailing slashes on the base without doubling slashes", () => {
		expect(
			buildBackendUrl("/spending-limits", {
				MUX_BACKEND_URL: "https://backend.test/v1/",
			}),
		).toBe("https://backend.test/v1/spending-limits");
		expect(
			buildBackendUrl("/spending-limits", {
				MUX_BACKEND_URL: "https://backend.test///",
			}),
		).toBe("https://backend.test/spending-limits");
		expect(
			buildBackendUrl("/health", { MUX_BACKEND_URL: "http://localhost:4000" }),
		).toBe("http://localhost:4000/health");
	});

	it("returns null when the backend is not configured", () => {
		expect(buildBackendUrl("/spending-limits", {})).toBeNull();
		expect(
			buildBackendUrl("/spending-limits", { MUX_BACKEND_URL: undefined }),
		).toBeNull();
	});

	it("returns null when MUX_BACKEND_URL is blank", () => {
		expect(
			buildBackendUrl("/spending-limits", { MUX_BACKEND_URL: "" }),
		).toBeNull();
		expect(
			buildBackendUrl("/spending-limits", { MUX_BACKEND_URL: "   " }),
		).toBeNull();
	});

	it("returns null when MUX_BACKEND_URL is not http(s)", () => {
		for (const MUX_BACKEND_URL of [
			"ftp://backend.test",
			"file:///etc/passwd",
			"javascript:alert(1)",
			"backend.test",
		]) {
			expect(
				buildBackendUrl("/spending-limits", { MUX_BACKEND_URL }),
			).toBeNull();
		}
	});

	it("returns null when MUX_BACKEND_URL embeds credentials", () => {
		for (const MUX_BACKEND_URL of [
			"https://user:secret@backend.test",
			"https://user@backend.test",
			"http://:secret@backend.test",
		]) {
			expect(
				buildBackendUrl("/spending-limits", { MUX_BACKEND_URL }),
			).toBeNull();
		}
	});

	it("refuses paths without a leading slash", () => {
		expect(buildBackendUrl("spending-limits", env)).toBeNull();
		expect(buildBackendUrl("", env)).toBeNull();
		expect(buildBackendUrl("https://evil.test/x", env)).toBeNull();
		expect(buildBackendUrl("evil.test/x", env)).toBeNull();
	});

	it("refuses protocol-relative paths", () => {
		expect(buildBackendUrl("//evil.test/x", env)).toBeNull();
		expect(buildBackendUrl("//evil.test", env)).toBeNull();
		expect(buildBackendUrl("///evil.test/x", env)).toBeNull();
	});

	it("refuses any path containing ..", () => {
		expect(buildBackendUrl("/../admin", env)).toBeNull();
		expect(buildBackendUrl("/wallets/../admin", env)).toBeNull();
		expect(buildBackendUrl("/wallets/..", env)).toBeNull();
		expect(buildBackendUrl("/wallets/..%2fadmin", env)).toBeNull();
		expect(buildBackendUrl("/a..b", env)).toBeNull();
	});
});
