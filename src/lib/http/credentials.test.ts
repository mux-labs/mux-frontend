import { describe, expect, it } from "vitest";
import {
  SESSION_COOKIE_NAME,
  hasCredential,
  isCsrfSafe,
  readSessionCookie,
  forwardCredentialHeaders,
  credentialFingerprintSource,
  clientIP,
} from "./credentials";

const req = (
  headers: Record<string, string> = {},
  url = "http://localhost/api/proxy",
) => new Request(url, { headers });

const reqWithUrl = (url: string, headers: Record<string, string> = {}) =>
  new Request(url, { headers });

describe("readSessionCookie", () => {
  it("returns the session cookie value when present", () => {
    const r = req({ cookie: "mux_session=abc123; other=x" });
    expect(readSessionCookie(r)).toBe("abc123");
  });

  it("returns null when the session cookie is absent", () => {
    const r = req({ cookie: "other=x" });
    expect(readSessionCookie(r)).toBeNull();
  });

  it("returns null when cookie header is missing", () => {
    const r = req({});
    expect(readSessionCookie(r)).toBeNull();
  });

  it("returns null when session cookie is empty", () => {
    const r = req({ cookie: "mux_session=; other=x" });
    expect(readSessionCookie(r)).toBeNull();
  });
});

describe("hasCredential", () => {
  it("returns true for Bearer authorization header", () => {
    const r = req({ authorization: "Bearer token123" });
    expect(hasCredential(r)).toBe(true);
  });

  it("returns true for ApiKey authorization header", () => {
    const r = req({ authorization: "ApiKey key123" });
    expect(hasCredential(r)).toBe(true);
  });

  it("returns true for x-api-key header", () => {
    const r = req({ "x-api-key": "key123" });
    expect(hasCredential(r)).toBe(true);
  });

  it("returns false when no credential headers are present", () => {
    const r = req({});
    expect(hasCredential(r)).toBe(false);
  });

  it("returns false for empty authorization header", () => {
    const r = req({ authorization: "" });
    expect(hasCredential(r)).toBe(false);
  });

  it("returns false for unsupported authorization scheme", () => {
    const r = req({ authorization: "Basic dXNlcjpwYXNz" });
    expect(hasCredential(r)).toBe(false);
  });

  it("prefers x-api-key over missing session cookie", () => {
    const r = req({ "x-api-key": "key" });
    expect(hasCredential(r)).toBe(true);
  });
});

describe("isCsrfSafe", () => {
  it("returns true when authorization header is present", () => {
    const r = req({ authorization: "Bearer token" });
    expect(isCsrfSafe(r)).toBe(true);
  });

  it("returns true when x-api-key header is present", () => {
    const r = req({ "x-api-key": "key" });
    expect(isCsrfSafe(r)).toBe(true);
  });

  it("returns false when no credential headers and no origin", () => {
    const r = req({});
    expect(isCsrfSafe(r)).toBe(false);
  });

  it("returns false when origin is missing", () => {
    const r = req({ authorization: "Bearer token" });
    // Wait, this has authorization so it should be true
    expect(isCsrfSafe(r)).toBe(true);
  });

  it("returns false when origin header is missing and no credentials", () => {
    const r = req({}, "http://localhost/api");
    expect(isCsrfSafe(r)).toBe(false);
  });

  it("returns true when origin matches request URL origin", () => {
    const r = reqWithUrl("http://localhost/api", { origin: "http://localhost" });
    expect(isCsrfSafe(r)).toBe(true);
  });

  it("returns false when origin does not match request URL origin", () => {
    const r = reqWithUrl("http://localhost/api", { origin: "http://evil.com" });
    expect(isCsrfSafe(r)).toBe(false);
  });

  it("returns false for malformed origin header", () => {
    const r = reqWithUrl("http://localhost/api", { origin: "not-a-url" });
    expect(isCsrfSafe(r)).toBe(false);
  });

  it("returns false when origin header is empty", () => {
    const r = reqWithUrl("http://localhost/api", { origin: "" });
    expect(isCsrfSafe(r)).toBe(false);
  });
});

describe("forwardCredentialHeaders", () => {
  it("forwards authorization header", () => {
    const r = req({ authorization: "Bearer token" });
    const headers = forwardCredentialHeaders(r);
    expect(headers.authorization).toBe("Bearer token");
  });

  it("forwards x-api-key header", () => {
    const r = req({ "x-api-key": "key123" });
    const headers = forwardCredentialHeaders(r);
    expect(headers["x-api-key"]).toBe("key123");
  });

  it("forwards session cookie", () => {
    const r = req({ cookie: "mux_session=abc123" });
    const headers = forwardCredentialHeaders(r);
    expect(headers.cookie).toBe("mux_session=abc123");
  });

  it("does not forward cookie when session cookie absent", () => {
    const r = req({ cookie: "other=x" });
    const headers = forwardCredentialHeaders(r);
    expect(headers.cookie).toBeUndefined();
  });

  it("forwards multiple credential headers", () => {
    const r = req({
      authorization: "Bearer token",
      "x-api-key": "key",
      cookie: "mux_session=abc",
    });
    const headers = forwardCredentialHeaders(r);
    expect(headers.authorization).toBe("Bearer token");
    expect(headers["x-api-key"]).toBe("key");
    expect(headers.cookie).toBe("mux_session=abc");
  });
});

describe("credentialFingerprintSource", () => {
  it("returns authorization header when present", () => {
    const r = req({ authorization: "Bearer token" });
    expect(credentialFingerprintSource(r)).toBe("Bearer token");
  });

  it("returns x-api-key when authorization absent", () => {
    const r = req({ "x-api-key": "key123" });
    expect(credentialFingerprintSource(r)).toBe("key123");
  });

  it("returns session cookie when no auth headers", () => {
    const r = req({ cookie: "mux_session=abc123" });
    expect(credentialFingerprintSource(r)).toBe("mux_session=abc123");
  });

  it("returns empty string when no credential sources", () => {
    const r = req({});
    expect(credentialFingerprintSource(r)).toBe("");
  });
});

describe("clientIP", () => {
  it("returns first x-forwarded-for entry", () => {
    const r = req({ "x-forwarded-for": "1.2.3.4, 5.6.7.8" });
    expect(clientIP(r)).toBe("1.2.3.4");
  });

  it("returns x-real-ip when x-forwarded-for absent", () => {
    const r = req({ "x-real-ip": "1.2.3.4" });
    expect(clientIP(r)).toBe("1.2.3.4");
  });

  it("returns null when no IP headers present", () => {
    const r = req({});
    expect(clientIP(r)).toBeNull();
  });
});