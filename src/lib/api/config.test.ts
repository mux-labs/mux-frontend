import { describe, expect, it } from "vitest";

import { normalizeBackendUrl } from "./config";

describe("normalizeBackendUrl", () => {
	it("returns null when the value is missing", () => {
		expect(normalizeBackendUrl(undefined)).toBeNull();
	});

	it("returns null when the value is blank", () => {
		expect(normalizeBackendUrl("")).toBeNull();
		expect(normalizeBackendUrl("   ")).toBeNull();
	});

	it("returns null when the value is malformed", () => {
		expect(normalizeBackendUrl("not a url")).toBeNull();
		expect(normalizeBackendUrl("://missing-scheme")).toBeNull();
	});

	it("returns null for non-http(s) protocols", () => {
		expect(normalizeBackendUrl("ftp://backend.example.com")).toBeNull();
		expect(normalizeBackendUrl("file:///etc/passwd")).toBeNull();
	});

	it("returns null when credentials are embedded", () => {
		expect(normalizeBackendUrl("https://user:pass@backend.example.com")).toBeNull();
		expect(normalizeBackendUrl("https://user@backend.example.com")).toBeNull();
	});

	it("normalizes a valid backend URL to origin + pathname without trailing slashes", () => {
		expect(normalizeBackendUrl("https://backend.example.com")).toBe(
			"https://backend.example.com",
		);
		expect(normalizeBackendUrl("https://backend.example.com/")).toBe(
			"https://backend.example.com",
		);
		expect(normalizeBackendUrl("  https://backend.example.com/api/  ")).toBe(
			"https://backend.example.com/api",
		);
		expect(normalizeBackendUrl("http://localhost:8080")).toBe(
			"http://localhost:8080",
		);
	});
});
