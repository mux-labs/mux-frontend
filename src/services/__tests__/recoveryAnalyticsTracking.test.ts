/**
 * Tests for recoveryAnalyticsTracking (issue #323 — Recovery UI: Add analytics tracking stub)
 *
 * Verifies that:
 * - trackRecoveryEvent is callable with every valid event name
 * - In development mode it logs to the console
 * - In non-development mode it does NOT log to the console (no-op)
 * - It handles an empty payload gracefully
 * - It handles an arbitrary extra payload
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
	trackRecoveryEvent,
	type RecoveryEventName,
} from "../recoveryAnalyticsTracking";

const ALL_EVENTS: RecoveryEventName[] = [
	"recovery_view",
	"recovery_initiated",
	"recovery_confirmed",
	"recovery_cancelled",
	"recovery_reset",
	"recovery_faq_expanded",
	"recovery_faq_collapsed",
	"recovery_docs_link_clicked",
];

describe("recoveryAnalyticsTracking — trackRecoveryEvent", () => {
	let consoleSpy: ReturnType<typeof vi.spyOn>;

	beforeEach(() => {
		consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});
	});

	afterEach(() => {
		consoleSpy.mockRestore();
		vi.unstubAllEnvs();
	});

	it("does not throw for any valid event name", () => {
		for (const event of ALL_EVENTS) {
			expect(() => trackRecoveryEvent(event)).not.toThrow();
		}
	});

	it("accepts an optional payload without throwing", () => {
		expect(() =>
			trackRecoveryEvent("recovery_faq_expanded", {
				id: "what-is-recovery",
				label: "What is invisible wallet recovery?",
			}),
		).not.toThrow();
	});

	it("defaults to an empty payload when none is provided", () => {
		vi.stubEnv("NODE_ENV", "development");
		trackRecoveryEvent("recovery_view");
		expect(consoleSpy).toHaveBeenCalledWith(
			"[Analytics] recovery_view",
			{},
		);
	});

	it("logs to console in development mode", () => {
		vi.stubEnv("NODE_ENV", "development");
		trackRecoveryEvent("recovery_initiated", { source: "cta" });
		expect(consoleSpy).toHaveBeenCalledWith(
			"[Analytics] recovery_initiated",
			{ source: "cta" },
		);
	});

	it("does NOT log to console in production mode", () => {
		vi.stubEnv("NODE_ENV", "production");
		trackRecoveryEvent("recovery_confirmed");
		expect(consoleSpy).not.toHaveBeenCalled();
	});

	it("does NOT log to console in test mode", () => {
		vi.stubEnv("NODE_ENV", "test");
		trackRecoveryEvent("recovery_cancelled");
		expect(consoleSpy).not.toHaveBeenCalled();
	});

	it("passes arbitrary payload keys through to the log", () => {
		vi.stubEnv("NODE_ENV", "development");
		const payload = { userId: "u_123", wallet: "0xABC", attempt: 2 };
		trackRecoveryEvent("recovery_faq_collapsed", payload);
		expect(consoleSpy).toHaveBeenCalledWith(
			"[Analytics] recovery_faq_collapsed",
			payload,
		);
	});
});
