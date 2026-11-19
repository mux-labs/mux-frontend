"use client";

import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { RateLimitNotice } from "./RateLimitNotice";

describe("RateLimitNotice retryAt (UX)", () => {
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
