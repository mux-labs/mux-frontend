import { describe, expect, it } from "vitest";
import { redact } from "./guards";

describe("redact", () => {
  it("never echoes raw key material, only its length", () => {
    const secret = "sk_live_abcdef123456";
    const result = redact(secret);
    expect(result).toBe(`[redacted:${secret.length}]`);
    expect(result).not.toContain(secret);
  });

  it("reports the length of a single-character secret", () => {
    expect(redact("x")).toBe("[redacted:1]");
  });

  it("falls back to a bare marker for non-string values", () => {
    expect(redact(undefined)).toBe("[redacted]");
    expect(redact(null)).toBe("[redacted]");
    expect(redact(12345)).toBe("[redacted]");
    expect(redact({ token: "sk_live_abcdef123456" })).toBe("[redacted]");
  });

  it("falls back to a bare marker for an empty string", () => {
    expect(redact("")).toBe("[redacted]");
  });
});
