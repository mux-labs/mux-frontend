import { describe, expect, it } from "vitest";
import { isCsrfSafe } from "./credentials";

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
