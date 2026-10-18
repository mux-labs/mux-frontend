import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { SendFlowGate } from "./SendFlowGate";

const ENV_KEYS = [
  "NEXT_PUBLIC_SEND_FLOWS_ENABLED",
  "NEXT_PUBLIC_SEND_KILL_SWITCH",
  "NEXT_PUBLIC_STELLAR_NETWORK",
] as const;

const originalEnv: Record<string, string | undefined> = {};

function renderGate() {
  return render(
    <SendFlowGate>
      <button>Send</button>
    </SendFlowGate>,
  );
}

describe("SendFlowGate", () => {
  beforeEach(() => {
    for (const key of ENV_KEYS) {
      originalEnv[key] = process.env[key];
      delete process.env[key];
    }
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllEnvs();
    for (const key of ENV_KEYS) {
      if (originalEnv[key] === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = originalEnv[key];
      }
    }
  });

  it("does not render children when send flows are not enabled", () => {
    vi.stubEnv("NEXT_PUBLIC_STELLAR_NETWORK", "testnet");

    renderGate();

    expect(screen.queryByRole("button", { name: "Send" })).toBeNull();
  });

  it("does not render children when the kill switch is set", () => {
    vi.stubEnv("NEXT_PUBLIC_SEND_FLOWS_ENABLED", "true");
    vi.stubEnv("NEXT_PUBLIC_SEND_KILL_SWITCH", "true");
    vi.stubEnv("NEXT_PUBLIC_STELLAR_NETWORK", "testnet");

    renderGate();

    expect(screen.queryByRole("button", { name: "Send" })).toBeNull();
  });

  it("does not render children for an unknown network", () => {
    vi.stubEnv("NEXT_PUBLIC_SEND_FLOWS_ENABLED", "true");
    vi.stubEnv("NEXT_PUBLIC_STELLAR_NETWORK", "mainnet");

    renderGate();

    expect(screen.queryByRole("button", { name: "Send" })).toBeNull();
  });

  it("renders children for an enabled testnet configuration", () => {
    vi.stubEnv("NEXT_PUBLIC_SEND_FLOWS_ENABLED", "true");
    vi.stubEnv("NEXT_PUBLIC_SEND_KILL_SWITCH", "false");
    vi.stubEnv("NEXT_PUBLIC_STELLAR_NETWORK", "testnet");

    renderGate();

    expect(screen.getByRole("button", { name: "Send" })).toBeInTheDocument();
  });
});
