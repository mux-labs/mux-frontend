import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
	trackAuthEvent,
	trackLogin,
	trackLogout,
	trackSessionExpired,
} from "../authAnalyticsTracking";

describe("authAnalyticsTracking", () => {
	const originalEnv = process.env.NODE_ENV;
	let consoleLogSpy: ReturnType<typeof vi.spyOn>;

	beforeEach(() => {
		consoleLogSpy = vi.spyOn(console, "log").mockImplementation(() => {});
	});

	afterEach(() => {
		consoleLogSpy.mockRestore();
		process.env.NODE_ENV = originalEnv;
	});

	describe("trackAuthEvent", () => {
		it("logs to console in development mode", () => {
			process.env.NODE_ENV = "development";
			trackAuthEvent("login_success", { email: "user@example.com" });

			expect(consoleLogSpy).toHaveBeenCalledWith(
				"[Auth Analytics] login_success",
				{ email: "user@example.com" },
			);
		});

		it("does not log in production mode", () => {
			process.env.NODE_ENV = "production";
			trackAuthEvent("login_success", { email: "user@example.com" });

			expect(consoleLogSpy).not.toHaveBeenCalled();
		});

		it("accepts empty payload", () => {
			process.env.NODE_ENV = "development";
			trackAuthEvent("logout");

			expect(consoleLogSpy).toHaveBeenCalledWith(
				"[Auth Analytics] logout",
				{},
			);
		});

		it("tracks login_page_view event", () => {
			process.env.NODE_ENV = "development";
			trackAuthEvent("login_page_view", { callbackUrl: "/dashboard" });

			expect(consoleLogSpy).toHaveBeenCalledWith(
				"[Auth Analytics] login_page_view",
				{ callbackUrl: "/dashboard" },
			);
		});

		it("tracks login_validation_failed with error details", () => {
			process.env.NODE_ENV = "development";
			trackAuthEvent("login_validation_failed", {
				errors: ["email", "password"],
			});

			expect(consoleLogSpy).toHaveBeenCalledWith(
				"[Auth Analytics] login_validation_failed",
				{ errors: ["email", "password"] },
			);
		});
	});

	describe("trackLogin", () => {
		it("tracks login_success with email and role", () => {
			process.env.NODE_ENV = "development";
			trackLogin("admin@example.com", "admin");

			expect(consoleLogSpy).toHaveBeenCalledWith(
				"[Auth Analytics] login_success",
				{ email: "admin@example.com", role: "admin" },
			);
		});
	});

	describe("trackLogout", () => {
		it("tracks logout with email when provided", () => {
			process.env.NODE_ENV = "development";
			trackLogout("user@example.com");

			expect(consoleLogSpy).toHaveBeenCalledWith("[Auth Analytics] logout", {
				email: "user@example.com",
			});
		});

		it("tracks logout without email when not provided", () => {
			process.env.NODE_ENV = "development";
			trackLogout();

			expect(consoleLogSpy).toHaveBeenCalledWith("[Auth Analytics] logout", {});
		});
	});

	describe("trackSessionExpired", () => {
		it("tracks session_expired event", () => {
			process.env.NODE_ENV = "development";
			trackSessionExpired();

			expect(consoleLogSpy).toHaveBeenCalledWith(
				"[Auth Analytics] session_expired",
				{},
			);
		});
	});
});
