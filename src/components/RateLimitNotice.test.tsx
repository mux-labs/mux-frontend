"use client";

import { render, screen, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { RateLimitNotice } from "./RateLimitNotice";

describe("RateLimitNotice", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("shows the server-requested wait time", () => {
    render(<RateLimitNotice retryAfterSeconds={30} onRetry={vi.fn()} />);

    expect(screen.getByText(/30/)).toBeInTheDocument();
  });

  it("keeps the retry control disabled until the Retry-After wait has elapsed", async () => {
    const onRetry = vi.fn();
    render(<RateLimitNotice retryAfterSeconds={5} onRetry={onRetry} />);

    const retryButton = screen.getByRole("button", { name: /retry/i });
    expect(retryButton).toBeDisabled();

    await act(async () => {
      vi.advanceTimersByTime(4000);
    });
    expect(retryButton).toBeDisabled();

    await act(async () => {
      vi.advanceTimersByTime(1000);
    });
    expect(retryButton).toBeEnabled();

    await userEvent.click(retryButton);
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it("re-submits writes with their original Idempotency-Key", async () => {
    const onRetry = vi.fn();
    render(
      <RateLimitNotice
        retryAfterSeconds={0}
        idempotencyKey="idem-key-123"
        onRetry={onRetry}
      />,
    );

    const retryButton = screen.getByRole("button", { name: /retry/i });
    await userEvent.click(retryButton);

    expect(onRetry).toHaveBeenCalledWith(
      expect.objectContaining({ idempotencyKey: "idem-key-123" }),
    );
  });

  it("does not invoke retry while the wait has not elapsed (failure path)", async () => {
    const onRetry = vi.fn();
    render(<RateLimitNotice retryAfterSeconds={10} onRetry={onRetry} />);

    const retryButton = screen.getByRole("button", { name: /retry/i });
    await userEvent.click(retryButton);

    expect(onRetry).not.toHaveBeenCalled();
  });

  it("keeps retry disabled until the epoch-ms retryAt has elapsed", () => {
    const retryAt = 1_700_000_030_000;
    const now = () => 1_700_000_000_000;
    const onRetry = vi.fn();

    render(
      <RateLimitNotice retryAt={retryAt} onRetry={onRetry} now={now} />,
    );

    const retry = screen.getByTestId("rate-limit-retry");
    expect(retry).toBeDisabled();
    expect(screen.getByTestId("rate-limit-countdown")).toBeInTheDocument();
    expect(screen.queryByText("You can try again now.")).toBeNull();
  });

  it("allows retry once the epoch-ms retryAt has passed", () => {
    const retryAt = 1_700_000_000_000;
    const now = () => 1_700_000_030_000;

    render(<RateLimitNotice retryAt={retryAt} onRetry={() => {}} now={now} />);

    expect(screen.getByTestId("rate-limit-retry")).toBeEnabled();
    expect(screen.getByText("You can try again now.")).toBeInTheDocument();
    expect(screen.queryByTestId("rate-limit-countdown")).toBeNull();
  });
});
