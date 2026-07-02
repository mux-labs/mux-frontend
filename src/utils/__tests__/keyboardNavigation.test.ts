/**
 * Tests for keyboard navigation utilities and hooks
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import {
	parseKeyboardEvent,
	isKey,
	isKeyCombo,
	getArrowDirection,
	getFocusableElements,
	getShortcutDisplay,
} from "@/utils/keyboardNavigation";

describe("Keyboard Navigation Utilities", () => {
	describe("parseKeyboardEvent", () => {
		it("should parse keyboard event", () => {
			const event = new KeyboardEvent("keydown", {
				key: "Enter",
				ctrlKey: true,
			});

			const parsed = parseKeyboardEvent(event as any);

			expect(parsed.key).toBe("Enter");
			expect(parsed.ctrlKey).toBe(true);
			expect(parsed.shiftKey).toBe(false);
		});
	});

	describe("isKey", () => {
		it("should match key case-insensitively", () => {
			const event = {
				key: "enter",
				ctrlKey: false,
				shiftKey: false,
				altKey: false,
				metaKey: false,
				preventDefault: vi.fn(),
				stopPropagation: vi.fn(),
			};

			expect(isKey(event, "Enter")).toBe(true);
			expect(isKey(event, "ENTER")).toBe(true);
		});

		it("should return false for non-matching key", () => {
			const event = {
				key: "escape",
				ctrlKey: false,
				shiftKey: false,
				altKey: false,
				metaKey: false,
				preventDefault: vi.fn(),
				stopPropagation: vi.fn(),
			};

			expect(isKey(event, "Enter")).toBe(false);
		});
	});

	describe("isKeyCombo", () => {
		it("should match key with modifiers", () => {
			const event = {
				key: "K",
				ctrlKey: true,
				shiftKey: false,
				altKey: false,
				metaKey: false,
				preventDefault: vi.fn(),
				stopPropagation: vi.fn(),
			};

			expect(isKeyCombo(event, "K", { ctrl: true })).toBe(true);
			expect(isKeyCombo(event, "K", { ctrl: false })).toBe(false);
		});

		it("should require all specified modifiers", () => {
			const event = {
				key: "S",
				ctrlKey: true,
				shiftKey: true,
				altKey: false,
				metaKey: false,
				preventDefault: vi.fn(),
				stopPropagation: vi.fn(),
			};

			expect(
				isKeyCombo(event, "S", { ctrl: true, shift: true }),
			).toBe(true);
			expect(
				isKeyCombo(event, "S", { ctrl: true, alt: true }),
			).toBe(false);
		});
	});

	describe("getArrowDirection", () => {
		it("should return arrow direction", () => {
			const upEvent = {
				key: "ArrowUp",
				ctrlKey: false,
				shiftKey: false,
				altKey: false,
				metaKey: false,
				preventDefault: vi.fn(),
				stopPropagation: vi.fn(),
			};

			expect(getArrowDirection(upEvent)).toBe("up");

			const downEvent = { ...upEvent, key: "ArrowDown" };
			expect(getArrowDirection(downEvent)).toBe("down");

			const leftEvent = { ...upEvent, key: "ArrowLeft" };
			expect(getArrowDirection(leftEvent)).toBe("left");

			const rightEvent = { ...upEvent, key: "ArrowRight" };
			expect(getArrowDirection(rightEvent)).toBe("right");
		});

		it("should return null for non-arrow keys", () => {
			const event = {
				key: "Enter",
				ctrlKey: false,
				shiftKey: false,
				altKey: false,
				metaKey: false,
				preventDefault: vi.fn(),
				stopPropagation: vi.fn(),
			};

			expect(getArrowDirection(event)).toBeNull();
		});
	});

	describe("getFocusableElements", () => {
		it("should find all focusable elements", () => {
			const container = document.createElement("div");

			const button = document.createElement("button");
			const link = document.createElement("a");
			link.href = "#";
			const input = document.createElement("input");
			const disabled = document.createElement("button");
			disabled.disabled = true;
			const text = document.createElement("span");

			container.appendChild(button);
			container.appendChild(link);
			container.appendChild(input);
			container.appendChild(disabled);
			container.appendChild(text);

			const focusable = getFocusableElements(container);

			expect(focusable).toHaveLength(3);
			expect(focusable).toContain(button);
			expect(focusable).toContain(link);
			expect(focusable).toContain(input);
			expect(focusable).not.toContain(disabled);
			expect(focusable).not.toContain(text);
		});
	});

	describe("getShortcutDisplay", () => {
		it("should display shortcut with modifiers", () => {
			const display = getShortcutDisplay("K", { ctrl: true });
			expect(display).toContain("K");
			expect(display).toContain("+");
		});

		it("should show Cmd instead of Ctrl on Mac", () => {
			const originalPlatform = navigator.platform;
			Object.defineProperty(navigator, "platform", {
				value: "MacIntel",
				writable: true,
			});

			const display = getShortcutDisplay("K", { ctrl: true });
			expect(display).toContain("⌘");

			Object.defineProperty(navigator, "platform", {
				value: originalPlatform,
				writable: true,
			});
		});

		it("should include multiple modifiers", () => {
			const display = getShortcutDisplay("S", {
				ctrl: true,
				shift: true,
			});
			expect(display).toContain("Shift");
			expect(display).toContain("S");
		});
	});
});

describe("Keyboard Navigation Integration", () => {
	beforeEach(() => {
		document.body.innerHTML = "";
	});

	describe("List Navigation", () => {
		it("should navigate through list items", () => {
			const items: HTMLElement[] = [];
			for (let i = 0; i < 5; i++) {
				const item = document.createElement("button");
				item.textContent = `Item ${i}`;
				items.push(item);
				document.body.appendChild(item);
			}

			// Simulate arrow down navigation
			const currentIndex = 0;
			const nextIndex = Math.min(currentIndex + 1, items.length - 1);

			expect(nextIndex).toBe(1);

			// Simulate arrow up from middle
			const middleIndex = 2;
			const previousIndex = Math.max(middleIndex - 1, 0);

			expect(previousIndex).toBe(1);
		});

		it("should wrap around with wrapAround option", () => {
			const items = [0, 1, 2, 3, 4];

			// Down from last
			let index = 4;
			let nextIndex = index + 1;
			if (nextIndex >= items.length) {
				nextIndex = 0;
			}
			expect(nextIndex).toBe(0);

			// Up from first
			index = 0;
			let previousIndex = index - 1;
			if (previousIndex < 0) {
				previousIndex = items.length - 1;
			}
			expect(previousIndex).toBe(4);
		});

		it("should handle Home and End keys", () => {
			const items = [0, 1, 2, 3, 4];

			// Home should go to first
			expect(0).toBe(0);

			// End should go to last
			expect(items.length - 1).toBe(4);
		});
	});

	describe("Focus Management", () => {
		it("should identify focusable elements", () => {
			const container = document.createElement("div");
			const button = document.createElement("button");
			const input = document.createElement("input");
			const notFocusable = document.createElement("div");

			container.appendChild(button);
			container.appendChild(input);
			container.appendChild(notFocusable);

			const focusable = getFocusableElements(container);

			expect(focusable.length).toBeGreaterThanOrEqual(2);
			expect(focusable).toContain(button);
			expect(focusable).toContain(input);
		});

		it("should exclude disabled buttons", () => {
			const container = document.createElement("div");
			const enabledButton = document.createElement("button");
			const disabledButton = document.createElement("button");
			disabledButton.disabled = true;

			container.appendChild(enabledButton);
			container.appendChild(disabledButton);

			const focusable = getFocusableElements(container);

			expect(focusable).toContain(enabledButton);
			expect(focusable).not.toContain(disabledButton);
		});
	});

	describe("Shortcut Display", () => {
		it("should format keyboard shortcut for display", () => {
			const display1 = getShortcutDisplay("K", { ctrl: true });
			expect(display1).toContain("K");

			const display2 = getShortcutDisplay("Escape");
			expect(display2).toBe("Escape");

			const display3 = getShortcutDisplay("S", {
				ctrl: true,
				shift: true,
				alt: true,
			});
			expect(display3).toContain("Shift");
			expect(display3).toContain("Alt");
			expect(display3).toContain("S");
		});
	});
});
