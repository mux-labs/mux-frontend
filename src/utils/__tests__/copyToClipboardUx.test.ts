/**
 * Tests for copy-to-clipboard UX utilities
 */
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
	copyToClipboardWithFallback,
	formatCopyFeedback,
	getCopyDescription,
	getCopyAriaLabel,
	checkCopyAllowed,
	handleCopyWithFeedback,
	generateCopyTitle,
	exportAsText,
	announceToScreenReader,
} from "@/utils/copyToClipboardUx";

describe("Copy-to-Clipboard UX Utilities", () => {
	beforeEach(() => {
		// Mock clipboard API
		Object.assign(navigator, {
			clipboard: {
				writeText: vi.fn().mockResolvedValue(undefined),
			},
		});

		// Mock vibration API
		Object.assign(navigator, {
			vibrate: vi.fn(),
		});
	});

	describe("formatCopyFeedback", () => {
		it("should return full text for short strings", () => {
			const result = formatCopyFeedback("Hello");
			expect(result).toBe("Copied: Hello");
		});

		it("should truncate long strings", () => {
			const longText = "a".repeat(100);
			const result = formatCopyFeedback(longText, 50);
			expect(result).toContain("...");
			expect(result).toContain("Copied:");
		});

		it("should preserve start and end of truncated text", () => {
			const text = "GBZXN7PIRZGNMHGA7MUUUF4GWPY5AYPV6LY4UV2GL6VJGIQRXFDNMADI";
			const result = formatCopyFeedback(text, 30);
			expect(result).toContain("GBZXN7");
			expect(result).toContain("NMADI");
		});
	});

	describe("getCopyDescription", () => {
		it("should return description for address", () => {
			const result = getCopyDescription("address");
			expect(result).toBe("Copy address to clipboard");
		});

		it("should return description for API key", () => {
			const result = getCopyDescription("key");
			expect(result).toBe("Copy API key to clipboard");
		});

		it("should return description for recovery code", () => {
			const result = getCopyDescription("code");
			expect(result).toBe("Copy recovery code to clipboard");
		});

		it("should return default description for text", () => {
			const result = getCopyDescription("text");
			expect(result).toBe("Copy to clipboard");
		});

		it("should default to text for unknown type", () => {
			const result = getCopyDescription("unknown" as any);
			expect(result).toBe("Copy to clipboard");
		});
	});

	describe("getCopyAriaLabel", () => {
		it("should return copy description when not copied", () => {
			const result = getCopyAriaLabel("address", false);
			expect(result).toBe("Copy address to clipboard");
		});

		it("should return copied message when copied", () => {
			const result = getCopyAriaLabel("address", true);
			expect(result).toBe("Address copied to clipboard");
		});

		it("should handle key type when copied", () => {
			const result = getCopyAriaLabel("key", true);
			expect(result).toBe("API key copied to clipboard");
		});

		it("should handle code type when copied", () => {
			const result = getCopyAriaLabel("code", true);
			expect(result).toBe("Recovery code copied to clipboard");
		});
	});

	describe("checkCopyAllowed", () => {
		it("should allow non-empty strings", () => {
			const result = checkCopyAllowed("Hello");
			expect(result).toBeNull();
		});

		it("should disallow empty strings by default", () => {
			const result = checkCopyAllowed("");
			expect(result).toBe("Nothing to copy");
		});

		it("should allow empty strings when allowEmpty is true", () => {
			const result = checkCopyAllowed("", true);
			expect(result).toBeNull();
		});

		it("should disallow non-string types", () => {
			const result = checkCopyAllowed(123 as any);
			expect(result).toBe("Invalid content to copy");
		});

		it("should disallow very large content", () => {
			const largeText = "a".repeat(10001);
			const result = checkCopyAllowed(largeText);
			expect(result).toBe("Content too large to copy");
		});
	});

	describe("handleCopyWithFeedback", () => {
		it("should successfully copy and provide feedback", async () => {
			const result = await handleCopyWithFeedback("Test text");
			expect(result.success).toBe(true);
			expect(result.feedbackText).toContain("Copied:");
		});

		it("should return error feedback for empty content", async () => {
			const result = await handleCopyWithFeedback("");
			expect(result.success).toBe(false);
			expect(result.feedbackText).toBe("Nothing to copy");
		});

		it("should call onSuccess callback", async () => {
			const onSuccess = vi.fn();
			await handleCopyWithFeedback("Test", { onSuccess });
			expect(onSuccess).toHaveBeenCalledWith("Test");
		});

		it("should use custom feedback text", async () => {
			const result = await handleCopyWithFeedback("Test", {
				feedbackText: "Custom feedback",
			});
			expect(result.feedbackText).toBe("Custom feedback");
		});
	});

	describe("generateCopyTitle", () => {
		it("should return copy description when not copied and no error", () => {
			const result = generateCopyTitle(false, null, "address");
			expect(result).toBe("Copy address to clipboard");
		});

		it("should return copied message when copied", () => {
			const result = generateCopyTitle(true, null, "address");
			expect(result).toBe("Address copied!");
		});

		it("should return error message when error exists", () => {
			const result = generateCopyTitle(false, "Copy denied", "address");
			expect(result).toBe("Copy denied");
		});

		it("should handle different types", () => {
			const keyTitle = generateCopyTitle(true, null, "key");
			expect(keyTitle).toBe("Key copied!");

			const codeTitle = generateCopyTitle(true, null, "code");
			expect(codeTitle).toBe("Code copied!");
		});
	});

	describe("exportAsText", () => {
		it("should export object as formatted text", () => {
			const data = {
				name: "John",
				email: "john@example.com",
				status: "active",
			};
			const result = exportAsText(data, "User Info");
			expect(result).toContain("User Info");
			expect(result).toContain("name: John");
			expect(result).toContain("email: john@example.com");
		});

		it("should skip null and undefined values", () => {
			const data = {
				name: "John",
				email: null,
				status: undefined,
				active: true,
			};
			const result = exportAsText(data);
			expect(result).toContain("name: John");
			expect(result).toContain("active: true");
			expect(result).not.toContain("email:");
			expect(result).not.toContain("status:");
		});

		it("should format camelCase keys", () => {
			const data = {
				firstName: "John",
				lastName: "Doe",
				userStatus: "active",
			};
			const result = exportAsText(data);
			expect(result).toContain("first name: John");
			expect(result).toContain("last name: Doe");
			expect(result).toContain("user status: active");
		});

		it("should not include title when not provided", () => {
			const data = { name: "John" };
			const result = exportAsText(data);
			expect(result).not.toContain("===");
			expect(result).toBe("name: John");
		});
	});

	describe("announceToScreenReader", () => {
		// `announceToScreenReader` reuses a singleton #copy-announcer element and
		// schedules a real 1000ms timeout to clear it. Left unmanaged, that timer
		// fires asynchronously between tests and the stale element leaks into the
		// next test's jsdom document — a classic source of order-dependent
		// flakiness. Fake timers + explicit cleanup make each test deterministic.
		beforeEach(() => {
			vi.useFakeTimers();
		});

		afterEach(() => {
			vi.runOnlyPendingTimers();
			vi.useRealTimers();
			document.getElementById("copy-announcer")?.remove();
		});

		it("should create announcer element if not exists", () => {
			announceToScreenReader("Test message");
			const announcer = document.getElementById("copy-announcer");
			expect(announcer).toBeDefined();
			expect(announcer?.getAttribute("role")).toBe("status");
		});

		it("should set aria-live to polite", () => {
			announceToScreenReader("Test message");
			const announcer = document.getElementById("copy-announcer");
			expect(announcer?.getAttribute("aria-live")).toBe("polite");
		});

		it("should set message content", () => {
			announceToScreenReader("Test announcement");
			const announcer = document.getElementById("copy-announcer");
			expect(announcer?.textContent).toBe("Test announcement");
		});

		it("should clear the message after the announcement timeout elapses", () => {
			announceToScreenReader("Temporary announcement");
			const announcer = document.getElementById("copy-announcer");
			expect(announcer?.textContent).toBe("Temporary announcement");

			vi.advanceTimersByTime(1000);

			expect(announcer?.textContent).toBe("");
		});

		it("should reuse the existing announcer element on subsequent calls", () => {
			announceToScreenReader("First message");
			const firstAnnouncer = document.getElementById("copy-announcer");

			announceToScreenReader("Second message");
			const secondAnnouncer = document.getElementById("copy-announcer");

			expect(secondAnnouncer).toBe(firstAnnouncer);
			expect(secondAnnouncer?.textContent).toBe("Second message");
		});
	});

	describe("copyToClipboardWithFallback", () => {
		it("should use navigator.clipboard API", async () => {
			const writeText = vi.fn().mockResolvedValue(undefined);
			Object.assign(navigator, {
				clipboard: { writeText },
			});

			await copyToClipboardWithFallback("Test");
			expect(writeText).toHaveBeenCalledWith("Test");
		});

		it("should call onSuccess callback", async () => {
			const onSuccess = vi.fn();
			await copyToClipboardWithFallback("Test", { onSuccess });
			expect(onSuccess).toHaveBeenCalledWith("Test");
		});

		it("should trigger haptic feedback if enabled", async () => {
			const vibrate = vi.fn();
			Object.assign(navigator, { vibrate });

			await copyToClipboardWithFallback("Test", { hapticFeedback: true });
			expect(vibrate).toHaveBeenCalledWith(10);
		});

		it("should announce to screen reader if enabled", async () => {
			await copyToClipboardWithFallback("Test Address", {
				announce: true,
				feedbackText: "Address copied",
			});
			const announcer = document.getElementById("copy-announcer");
			expect(announcer?.textContent).toBe("Address copied");
		});

		it("should call onError on failure", async () => {
			const onError = vi.fn();
			Object.assign(navigator, {
				clipboard: {
					writeText: vi.fn().mockRejectedValue(new Error("Copy failed")),
				},
			});

			try {
				await copyToClipboardWithFallback("Test", { onError });
			} catch {
				// Expected
			}

			expect(onError).toHaveBeenCalled();
		});
	});
});
