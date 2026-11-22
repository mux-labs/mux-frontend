import { describe, expect, it, vi } from "vitest";
import { getBackendApiBaseUrl } from "@/lib/api/config";
import {
	BACKEND_URL_CANDIDATES,
	configuredNetwork,
	getBackendBaseUrl,
	isMockFallbackAllowed,
} from "./backend-url";

vi.mock("@/lib/api/config", async (importOriginal) => {
	const actual = await importOriginal<typeof import("@/lib/api/config")>();
	return { ...actual, getBackendApiBaseUrl: vi.fn(actual.getBackendApiBaseUrl) };
});

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

	it("first non-empty candidate wins, including the failure path", () => {
		// Documented rule: the first non-empty candidate wins.
		expect(
			getBackendBaseUrl({
				MUX_BACKEND_URL: "https://first.test",
				NEXT_PUBLIC_API_URL: "https://second.test",
				NEXT_PUBLIC_MUX_API_URL: "https://third.test",
				NEXT_PUBLIC_API_BASE: "https://fourth.test",
			}),
		).toBe("https://first.test");

		// Empty/whitespace candidates are skipped, not treated as winners.
		expect(
			getBackendBaseUrl({
				MUX_BACKEND_URL: "  ",
				NEXT_PUBLIC_API_URL: "",
				NEXT_PUBLIC_MUX_API_URL: "https://third.test",
				NEXT_PUBLIC_API_BASE: "https://fourth.test",
			}),
		).toBe("https://third.test");

		// Failure path: no non-empty candidate yields null.
		expect(
			getBackendBaseUrl({
				MUX_BACKEND_URL: "",
				NEXT_PUBLIC_API_URL: "   ",
				NEXT_PUBLIC_MUX_API_URL: undefined,
				NEXT_PUBLIC_API_BASE: "\t",
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

	it("delegates each candidate to getBackendApiBaseUrl with the trimmed value", () => {
		const spy = vi.mocked(getBackendApiBaseUrl);
		spy.mockClear();

		expect(
			getBackendBaseUrl({
				MUX_BACKEND_URL: "  https://backend.test/api/  ",
				NEXT_PUBLIC_MUX_BACKEND_URL: "https://ignored.test",
			}),
		).toBe("https://backend.test/api");

		expect(spy).toHaveBeenCalledTimes(1);
		expect(spy).toHaveBeenCalledWith({ MUX_BACKEND_URL: "https://backend.test/api/" });
	});

	it("returns the delegated normalized value verbatim", () => {
		const spy = vi.mocked(getBackendApiBaseUrl);
		spy.mockClear();
		spy.mockReturnValueOnce("https://delegated.test/base");

		expect(getBackendBaseUrl({ MUX_BACKEND_URL: "https://backend.test" })).toBe(
			"https://delegated.test/base",
		);
	});

	it("continues to the next candidate when delegation rejects a value", () => {
		const spy = vi.mocked(getBackendApiBaseUrl);
		spy.mockClear();
		spy.mockReturnValueOnce(null);

		expect(
			getBackendBaseUrl({
				MUX_BACKEND_URL: "https://backend.test",
				NEXT_PUBLIC_MUX_BACKEND_URL: "https://fallback.test",
			}),
		).toBe("https://fallback.test");
		expect(spy).toHaveBeenCalledTimes(2);
	});

	it("returns null when delegation rejects every candidate", () => {
		const spy = vi.mocked(getBackendApiBaseUrl);
		spy.mockClear();
		spy.mockReturnValue(null);

		expect(
			getBackendBaseUrl({
				MUX_BACKEND_URL: "https://backend.test",
				NEXT_PUBLIC_MUX_BACKEND_URL: "https://fallback.test",
				BACKEND_URL: "https://third.test",
			}),
		).toBeNull();
		expect(spy).toHaveBeenCalledTimes(BACKEND_URL_CANDIDATES.length);
	});

	it("rejects URLs with embedded credentials", () => {
		expect(
			getBackendBaseUrl({ MUX_BACKEND_URL: "https://user:pass@backend.test" }),
		).toBeNull();
		expect(
			getBackendBaseUrl({ MUX_BACKEND_URL: "https://user@backend.test" }),
		).toBeNull();
	});

	it("normalizes to origin + pathname, dropping query, hash and trailing slash", () => {
		expect(
			getBackendBaseUrl({
				MUX_BACKEND_URL: "https://backend.test:8443/api/v1/?token=secret#frag",
			}),
		).toBe("https://backend.test:8443/api/v1");
		expect(getBackendBaseUrl({ MUX_BACKEND_URL: "https://backend.test/" })).toBe(
			"https://backend.test",
		);
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
