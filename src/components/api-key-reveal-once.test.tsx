import { render, screen, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ApiKeyRevealOnce, maskApiKey } from "./api-key-reveal-once";

describe("maskApiKey", () => {
  it("masks the secret so the raw key is not exposed", () => {
    const secret = "sk_live_1234567890abcdef";
    const masked = maskApiKey(secret);

    expect(masked).not.toBe(secret);
    expect(masked).not.toContain(secret);
    expect(masked).toContain("•");
  });

  it("keeps a recognizable prefix/suffix while hiding the middle", () => {
    const secret = "sk_live_1234567890abcdef";
    const masked = maskApiKey(secret);

    expect(masked.startsWith(secret.slice(0, 4))).toBe(true);
    expect(masked.endsWith(secret.slice(-4))).toBe(true);
    expect(masked.length).toBeGreaterThan(0);
  });

  it("does not throw on short or empty input", () => {
    expect(() => maskApiKey("")).not.toThrow();
    expect(() => maskApiKey("abc")).not.toThrow();
  });
});

describe("ApiKeyRevealOnce", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("masks the key until the user explicitly reveals it", async () => {
    const user = userEvent.setup();
    const secret = "sk_live_1234567890abcdef";

    render(<ApiKeyRevealOnce apiKey={secret} onAcknowledge={() => {}} />);

    expect(screen.queryByText(secret)).toBeNull();
    expect(screen.getByText(maskApiKey(secret))).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /reveal/i }));

    expect(screen.getByText(secret)).toBeInTheDocument();
  });

  it("wipes the secret from memory once acknowledged", async () => {
    const user = userEvent.setup();
    const secret = "sk_live_1234567890abcdef";
    const onAcknowledge = vi.fn();

    render(<ApiKeyRevealOnce apiKey={secret} onAcknowledge={onAcknowledge} />);

    await user.click(screen.getByRole("button", { name: /reveal/i }));
    expect(screen.getByText(secret)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /saved|acknowledge/i }));

    expect(onAcknowledge).toHaveBeenCalledTimes(1);
    expect(screen.queryByText(secret)).toBeNull();
  });

  it("never logs the secret", async () => {
    const user = userEvent.setup();
    const secret = "sk_live_1234567890abcdef";
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    render(<ApiKeyRevealOnce apiKey={secret} onAcknowledge={() => {}} />);
    await user.click(screen.getByRole("button", { name: /reveal/i }));

    for (const spy of [logSpy, errorSpy, warnSpy]) {
      for (const call of spy.mock.calls) {
        expect(JSON.stringify(call)).not.toContain(secret);
      }
    }
  });
});
