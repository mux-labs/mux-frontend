// @vitest-environment node
import { describe, expect, it } from "vitest";
import { clientIp, isCsrfSafe, readSessionCookie } from "./credentials";

const APP_ORIGIN = "https://app.example.com";

function makeRequest(init: {
  headers?: Record<string, string>;
  origin?: string;
}): Request {
  const headers = new Headers(init.headers ?? {});
  if (init.origin !== undefined) {
    headers.set("origin", init.origin);
  }
  return new Request(`${APP_ORIGIN}/api/things`, {
    method: "POST",
    headers,
  });
}

describe("isCsrfSafe", () => {
  it("passes requests carrying an explicit Authorization header regardless of Origin", () => {
    const request = makeRequest({
      headers: { authorization: "Bearer token" },
      origin: "https://evil.example.com",
    });
    expect(isCsrfSafe(request, APP_ORIGIN)).toBe(true);
  });

  it("passes requests carrying an explicit API-key header regardless of Origin", () => {
    const request = makeRequest({
      headers: { "x-api-key": "key-123" },
      origin: "https://evil.example.com",
    });
    expect(isCsrfSafe(request, APP_ORIGIN)).toBe(true);
  });

  it("passes a cookie-only request whose Origin matches this app's origin", () => {
    const request = makeRequest({
      headers: { cookie: "session=abc" },
      origin: APP_ORIGIN,
    });
    expect(isCsrfSafe(request, APP_ORIGIN)).toBe(true);
  });

  it("rejects a cookie-only request with a mismatched Origin", () => {
    const request = makeRequest({
      headers: { cookie: "session=abc" },
      origin: "https://evil.example.com",
    });
    expect(isCsrfSafe(request, APP_ORIGIN)).toBe(false);
  });

  it("rejects a cookie-only request with a missing Origin", () => {
    const request = makeRequest({
      headers: { cookie: "session=abc" },
    });
    expect(isCsrfSafe(request, APP_ORIGIN)).toBe(false);
  });
});

function requestWithCookie(cookie?: string): Request {
	const headers: Record<string, string> = {};
	if (cookie !== undefined) headers.cookie = cookie;
	return new Request("http://localhost:3000/api/activity", { headers });
}

function requestWithHeaders(headers: Record<string, string>): Request {
	return new Request("http://localhost:3000/api/activity", { headers });
}

describe("readSessionCookie", () => {
	it("returns the session cookie value when present", () => {
		const request = requestWithCookie("session=abc123; other=xyz");
		expect(readSessionCookie(request)).toBe("abc123");
	});

	it("returns null when the session cookie is absent (deny-by-default)", () => {
		expect(readSessionCookie(requestWithCookie("other=xyz"))).toBeNull();
	});

	it("returns null when no cookie header is sent", () => {
		expect(readSessionCookie(requestWithCookie())).toBeNull();
	});

	it("returns null for an empty session cookie value", () => {
		expect(readSessionCookie(requestWithCookie("session="))).toBeNull();
	});
});

describe("clientIp", () => {
	it("returns the first x-forwarded-for entry when present", () => {
		const request = requestWithHeaders({
			"x-forwarded-for": "203.0.113.7, 10.0.0.1, 10.0.0.2",
		});
		expect(clientIp(request)).toBe("203.0.113.7");
	});

	it("prefers x-forwarded-for over x-real-ip", () => {
		const request = requestWithHeaders({
			"x-forwarded-for": "203.0.113.7",
			"x-real-ip": "198.51.100.9",
		});
		expect(clientIp(request)).toBe("203.0.113.7");
	});

	it("falls back to x-real-ip when x-forwarded-for is absent", () => {
		const request = requestWithHeaders({ "x-real-ip": "198.51.100.9" });
		expect(clientIp(request)).toBe("198.51.100.9");
	});

	it("returns null when neither header is present (direct connection)", () => {
		expect(clientIp(requestWithHeaders({}))).toBeNull();
	});
});
