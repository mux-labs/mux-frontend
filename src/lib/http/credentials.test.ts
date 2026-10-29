import { describe, expect, it } from "vitest";
import { hasCredential, isCsrfSafe } from "./credentials";

function createRequest(headers: Record<string, string>, url: string = "https://app.example.com"): Request {
  return new Request(url, { headers });
}

describe("hasCredential", () => {
  it("returns true when Authorization header is present", () => {
    expect(hasCredential(createRequest({ authorization: "Bearer token123" }))).toBe(true);
  });
  it("returns true when x-api-key header is present", () => {
    expect(hasCredential(createRequest({ "x-api-key": "key123" }))).toBe(true);
  });
  it("returns false when neither header is present", () => {
    expect(hasCredential(createRequest({}))).toBe(false);
  });
  it("returns false when Authorization header is empty", () => {
    expect(hasCredential(createRequest({ authorization: "" }))).toBe(false);
  });
  it("returns false when x-api-key header is empty", () => {
    expect(hasCredential(createRequest({ "x-api-key": "" }))).toBe(false);
  });
});

describe("isCsrfSafe", () => {
  it("returns true when Authorization header is present", () => {
    expect(isCsrfSafe(createRequest({ authorization: "Bearer token123" }))).toBe(true);
  });
  it("returns true when x-api-key header is present", () => {
    expect(isCsrfSafe(createRequest({ "x-api-key": "key123" }))).toBe(true);
  });
  it("returns false when no auth headers and no origin", () => {
    expect(isCsrfSafe(createRequest({}))).toBe(false);
  });
  it("returns false when origin header is missing", () => {
    expect(isCsrfSafe(createRequest({}, "https://app.example.com"))).toBe(false);
  });
  it("returns false when origin does not match", () => {
    expect(isCsrfSafe(createRequest({ origin: "https://evil.com" }, "https://app.example.com"))).toBe(false);
  });
  it("returns true when origin matches", () => {
    expect(isCsrfSafe(createRequest({ origin: "https://app.example.com" }, "https://app.example.com"))).toBe(true);
  });
  it("returns true when origin matches with path", () => {
    expect(isCsrfSafe(createRequest({ origin: "https://app.example.com" }, "https://app.example.com/path"))).toBe(true);
  });
  it("returns false when origin is malformed", () => {
    expect(isCsrfSafe(createRequest({ origin: "not-a-url" }, "https://app.example.com"))).toBe(false);
  });
  it("returns false when request URL is malformed", () => {
    expect(isCsrfSafe(new Request("not-a-url", { headers: { origin: "https://app.example.com" } }))).toBe(false);
  });
});