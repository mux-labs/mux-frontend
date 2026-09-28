import {
	act,
	cleanup,
	fireEvent,
	render,
	screen,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { SendFlowFlags } from "@/lib/feature-flags/send-flows";
import { MaintenanceNotice } from "./MaintenanceNotice";
import { RateLimitNotice } from "./RateLimitNotice";
import { SendFlowGate } from "./SendFlowGate";

const START = Date.UTC(2026, 8, 27, 12, 0, 0);

beforeEach(() => {
	vi.useFakeTimers();
	vi.setSystemTime(START);
});

afterEach(() => {
	cleanup();
	vi.useRealTimers();
});

describe("RateLimitNotice", () => {
	it("keeps retry disabled until Retry-After elapses", () => {
		const onRetry = vi.fn();
		render(
			<RateLimitNotice
				retryAt={START + 3_000}
				onRetry={onRetry}
				correlationId="corr-1"
			/>,
		);
		const button = screen.getByTestId("rate-limit-retry") as HTMLButtonElement;

		expect(screen.getByTestId("rate-limit-countdown").textContent).toBe("3s");
		expect(button.disabled).toBe(true);
		fireEvent.click(button);
		expect(onRetry).not.toHaveBeenCalled();

		act(() => {
			vi.advanceTimersByTime(3_000);
		});
		expect(button.disabled).toBe(false);
		fireEvent.click(button);
		expect(onRetry).toHaveBeenCalledTimes(1);
	});

	it("is announced politely and shows the support reference", () => {
		render(<RateLimitNotice retryAt={START + 1_000} correlationId="corr-1" />);
		const notice = screen.getByTestId("rate-limit-notice");
		expect(notice.getAttribute("role")).toBe("status");
		expect(notice.getAttribute("aria-live")).toBe("polite");
		expect(screen.getByTestId("rate-limit-correlation-id").textContent).toBe(
			"corr-1",
		);
	});
});

describe("MaintenanceNotice", () => {
	it("renders fixed maintenance copy and gates retry", () => {
		render(
			<MaintenanceNotice
				state={{
					code: "MAINTENANCE",
					retryAfterMs: 60_000,
					retryAt: START + 60_000,
					correlationId: null,
				}}
				onRetry={() => undefined}
			/>,
		);
		const notice = screen.getByTestId("maintenance-notice");
		expect(notice.dataset.code).toBe("MAINTENANCE");
		expect(notice.textContent).toContain("Scheduled maintenance");
		expect(screen.getByTestId("maintenance-retry-hint").textContent).toContain(
			"1m 00s",
		);
		expect(
			(screen.getByTestId("maintenance-retry") as HTMLButtonElement).disabled,
		).toBe(true);
	});

	it("uses outage copy for dependency failures", () => {
		render(
			<MaintenanceNotice
				state={{
					code: "DEPENDENCY_UNAVAILABLE",
					retryAfterMs: 1_000,
					retryAt: START + 1_000,
					correlationId: "corr-2",
				}}
			/>,
		);
		expect(screen.getByTestId("maintenance-notice").textContent).toContain(
			"Service temporarily unavailable",
		);
		expect(screen.getByTestId("maintenance-correlation-id").textContent).toBe(
			"corr-2",
		);
	});
});

describe("SendFlowGate", () => {
	const enabled: SendFlowFlags = {
		enabled: true,
		killSwitch: false,
		mainnetEnabled: false,
		network: "testnet",
	};

	it("renders the send UI when the gate is open", () => {
		render(
			<SendFlowGate flags={enabled} network="testnet">
				<form data-testid="wallet-send-form" />
			</SendFlowGate>,
		);
		expect(screen.queryByTestId("wallet-send-form")).not.toBeNull();
		expect(screen.queryByTestId("send-flow-disabled")).toBeNull();
	});

	it.each([
		[{ ...enabled, enabled: false }, undefined, "SEND_DISABLED"],
		[{ ...enabled, killSwitch: true }, undefined, "SEND_KILL_SWITCH_ENGAGED"],
		[
			{ ...enabled, network: "mainnet" as const },
			undefined,
			"SEND_MAINNET_NOT_ENABLED",
		],
		[enabled, "mainnet", "SEND_NETWORK_MISMATCH"],
	])("hides the send UI when closed (%#)", (flags, network, code) => {
		render(
			<SendFlowGate flags={flags} network={network}>
				<form data-testid="wallet-send-form" />
			</SendFlowGate>,
		);
		expect(screen.queryByTestId("wallet-send-form")).toBeNull();
		expect(screen.getByTestId("send-flow-disabled").dataset.code).toBe(code);
	});

	it("is deny-by-default with no NEXT_PUBLIC_* flags set", () => {
		render(
			<SendFlowGate>
				<form data-testid="wallet-send-form" />
			</SendFlowGate>,
		);
		expect(screen.queryByTestId("wallet-send-form")).toBeNull();
	});
});
