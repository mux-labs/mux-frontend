import { describe, expect, it } from "vitest";

import {
  MAX_NICKNAME_LENGTH,
  isValidNickname,
  sanitizeNickname,
} from "./sanitize-nickname";

describe("sanitizeNickname", () => {
  it("strips control characters", () => {
    expect(sanitizeNickname("\u0000\u0001alice\u0002")).toBe("alice");
  });

  it("trims surrounding whitespace", () => {
    expect(sanitizeNickname("  alice  ")).toBe("alice");
  });

  it("escapes HTML so markup is not executable", () => {
    const sanitized = sanitizeNickname("<img src=x onerror=alert(1)>");
    expect(sanitized).toBe("&lt;img src=x onerror=alert(1)&gt;");
    expect(sanitized).not.toContain("<");
    expect(sanitized).not.toContain(">");
  });

  it("escapes ampersands and quotes", () => {
    expect(sanitizeNickname(`a&b"c'd`)).toBe("a&amp;b&quot;c&#39;d");
  });

  it("caps the escaped output at MAX_NICKNAME_LENGTH", () => {
    const sanitized = sanitizeNickname("&".repeat(MAX_NICKNAME_LENGTH));
    expect(sanitized.length).toBeLessThanOrEqual(MAX_NICKNAME_LENGTH);
  });
});

describe("isValidNickname", () => {
  it("rejects control-char-only input", () => {
    expect(sanitizeNickname("\u0000\u0001")).toBe("");
    expect(isValidNickname("\u0000\u0001")).toBe(false);
  });

  it("rejects whitespace-only input", () => {
    expect(sanitizeNickname("   \t\n ")).toBe("");
    expect(isValidNickname("   \t\n ")).toBe(false);
  });

  it("rejects empty input", () => {
    expect(isValidNickname("")).toBe(false);
  });

  it("accepts a normal nickname", () => {
    expect(isValidNickname("alice")).toBe(true);
  });

  it("accepts exactly MAX_NICKNAME_LENGTH characters", () => {
    const input = "a".repeat(MAX_NICKNAME_LENGTH);
    expect(isValidNickname(input)).toBe(true);
    expect(sanitizeNickname(input).length).toBe(MAX_NICKNAME_LENGTH);
  });

  it("rejects MAX_NICKNAME_LENGTH + 1 characters", () => {
    expect(isValidNickname("a".repeat(MAX_NICKNAME_LENGTH + 1))).toBe(false);
  });

  it("agrees with sanitizeNickname on the length cap at the boundary", () => {
    const input = "&".repeat(MAX_NICKNAME_LENGTH);
    const sanitized = sanitizeNickname(input);
    expect(sanitized.length).toBeLessThanOrEqual(MAX_NICKNAME_LENGTH);
    expect(isValidNickname(input)).toBe(sanitized.length > 0);
  });

  it("accepts input containing & and < at the boundary", () => {
    const input = "<&".repeat(MAX_NICKNAME_LENGTH / 2);
    const sanitized = sanitizeNickname(input);
    expect(sanitized.length).toBeLessThanOrEqual(MAX_NICKNAME_LENGTH);
    expect(isValidNickname(input)).toBe(true);
  });
});
