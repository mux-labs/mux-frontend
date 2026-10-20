import { describe, expect, it } from "vitest";
import {
	BACKEND_URL_CANDIDATES,
	configuredNetwork,
	getBackendBaseUrl,
	isMockFallbackAllowed,
} from "./backend-url";

describe("getBackendBaseUrl", () => {
	it("returns null when no candidate is set", () => {
		expect(getBackendBaseUrl({})).toBeNull();
	});

	it("walks the candidates in documented priority order", () => {
		expect(BACKEND_URL_CANDIDATES).toEqual([
			"MUX_BACKEND_URL",
			"NEXT_PUBLIC_API_URL",
			"NEXT_PUBLIC_MUX_API_URL",
			"NEXT_PUBLIC_API_BASE",
		]);

		const env: Record<string, string> = {};
		for (const name of BACKEND_URL_CANDIDATES) {
			env[name] = `https://${name.toLowerCase()}.test`;
		}
		// Remove the highest-priority candidate each round; the next one wins.
		for (const name of BACKEND_URL_CANDIDATES) {
			expect(getBackendBaseUrl(env)).toBe(`https://${name.toLowerCase()}.test`);
			delete env[name];
		}
		expect(getBackendBaseUrl(env)).toBeNull();
	});

	it("each candidate resolves on its own", () => {
		for (const name of BACKEND_URL_CANDIDATES) {
			expect(getBackendBaseUrl({ [name]: "https://backend.test" })).toBe(
				"https://backend.test",
			);
		}
	});

	it("skips blank and whitespace-only values", () => {
		expect(
			getBackendBaseUrl({
				MUX_BACKEND_URL: "",
				NEXT_PUBLIC_API_URL: "   ",
				NEXT_PUBLIC_MUX_API_URL: "\t\n",
				NEXT_PUBLIC_API_BASE: "https://base.test",
			}),
		).toBe("https://base.test");
		expect(
			getBackendBaseUrl({ MUX_BACKEND_URL: " ", NEXT_PUBLIC_API_URL: "" }),
		).toBeNull();
	});

	it.each(["ftp://backend.test", "javascript:alert(1)", "file:///etc/passwd"])(
		"returns null for non-http(s) value %s",
		(value) => {
			expect(getBackendBaseUrl({ MUX_BACKEND_URL: value })).toBeNull();
		},
	);

	it.each(["not a url", "backend.test", "https://"])(
		"returns null for unparseable value %s",
		(value) => {
			expect(getBackendBaseUrl({ MUX_BACKEND_URL: value })).toBeNull();
		},
	);

	it("fails closed instead of falling through to a lower-priority alias", () => {
		expect(
			getBackendBaseUrl({
				MUX_BACKEND_URL: "ftp://backend.test",
				NEXT_PUBLIC_API_URL: "https://public.test",
			}),
		).toBeNull();
	});

	it("trims whitespace and strips trailing slashes from valid URLs", () => {
		expect(getBackendBaseUrl({ MUX_BACKEND_URL: " https://backend.test/ " })).toBe(
			"https://backend.test",
		);
		expect(
			getBackendBaseUrl({ NEXT_PUBLIC_API_URL: "http://localhost:4000/api///" }),
		).toBe("http://localhost:4000/api");
	});
});

describe("isMockFallbackAllowed", () => {
	it("allows mocks outside production on known non-mainnet networks", () => {
		expect(
			isMockFallbackAllowed({
				NODE_ENV: "development",
				MUX_STELLAR_NETWORK: "testnet",
			}),
		).toBe(true);
		expect(
			isMockFallbackAllowed({
				NODE_ENV: "test",
				NEXT_PUBLIC_STELLAR_NETWORK: "futurenet",
			}),
		).toBe(true);
	});

	it("fails closed when the network is unset or unrecognized", () => {
		expect(isMockFallbackAllowed({})).toBe(false);
		expect(isMockFallbackAllowed({ NODE_ENV: "development" })).toBe(false);
		expect(
			isMockFallbackAllowed({
				NODE_ENV: "development",
				MUX_STELLAR_NETWORK: "customnet",
			}),
		).toBe(false);
	});

	it("refuses mocks when NODE_ENV is production", () => {
		expect(isMockFallbackAllowed({ NODE_ENV: "production" })).toBe(false);
		expect(
			isMockFallbackAllowed({
				NODE_ENV: "production",
				MUX_STELLAR_NETWORK: "testnet",
			}),
		).toBe(false);
	});

	it.each(["mainnet", "MAINNET", "Public", "PUBLIC", " mainnet "])(
		"refuses mocks on network %j",
		(network) => {
			expect(isMockFallbackAllowed({ MUX_STELLAR_NETWORK: network })).toBe(false);
			expect(
				isMockFallbackAllowed({ NEXT_PUBLIC_STELLAR_NETWORK: network }),
			).toBe(false);
		},
	);

	it("refuses mocks when a blank server var would otherwise mask mainnet", () => {
		expect(
			isMockFallbackAllowed({
				MUX_STELLAR_NETWORK: " ",
				NEXT_PUBLIC_STELLAR_NETWORK: "mainnet",
			}),
		).toBe(false);
	});
});

describe("configuredNetwork", () => {
	it("returns null when neither var is set", () => {
		expect(configuredNetwork({})).toBeNull();
		expect(
			configuredNetwork({
				MUX_STELLAR_NETWORK: "",
				NEXT_PUBLIC_STELLAR_NETWORK: "  ",
			}),
		).toBeNull();
	});

	it("prefers MUX_STELLAR_NETWORK over NEXT_PUBLIC_STELLAR_NETWORK", () => {
		expect(
			configuredNetwork({
				MUX_STELLAR_NETWORK: "testnet",
				NEXT_PUBLIC_STELLAR_NETWORK: "mainnet",
			}),
		).toBe("testnet");
	});

	it("falls back to NEXT_PUBLIC_STELLAR_NETWORK when the server var is blank", () => {
		expect(
			configuredNetwork({
				MUX_STELLAR_NETWORK: "   ",
				NEXT_PUBLIC_STELLAR_NETWORK: "mainnet",
			}),
		).toBe("mainnet");
		expect(configuredNetwork({ NEXT_PUBLIC_STELLAR_NETWORK: "futurenet" })).toBe(
			"futurenet",
		);
	});

	it("trims the returned value", () => {
		expect(configuredNetwork({ MUX_STELLAR_NETWORK: " testnet " })).toBe(
			"testnet",
		);
	});
});
