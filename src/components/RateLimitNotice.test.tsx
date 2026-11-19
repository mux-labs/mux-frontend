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
});
