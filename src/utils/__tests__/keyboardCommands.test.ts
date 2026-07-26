/**
 * Tests for keyboard commands and command palette utilities
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import {
	createCommandRegistry,
	registerCommand,
	unregisterCommand,
	executeCommand,
	getCommandByShortcut,
	getCommandsByCategory,
	formatShortcut,
	parseShortcut,
	KeyboardMacroRecorder,
	searchCommands,
	getAllShortcuts,
	matchesShortcut,
} from "../keyboardCommands";
import type { KeyboardCommand } from "../keyboardCommands";

describe("keyboardCommands", () => {
	let registry = createCommandRegistry();
	let mockCallback: () => void;

	beforeEach(() => {
		registry = createCommandRegistry();
		mockCallback = vi.fn();
	});

	describe("createCommandRegistry", () => {
		it("should create an empty registry", () => {
			expect(registry.commands.size).toBe(0);
			expect(registry.shortcuts.size).toBe(0);
		});
	});

	describe("registerCommand", () => {
		it("should register a command", () => {
			const command: KeyboardCommand = {
				id: "save",
				name: "Save",
				callback: mockCallback,
			};

			registerCommand(registry, command);

			expect(registry.commands.get("save")).toEqual(command);
		});

		it("should register command with shortcut", () => {
			const command: KeyboardCommand = {
				id: "save",
				name: "Save",
				shortcut: { key: "s", ctrl: true },
				callback: mockCallback,
			};

			registerCommand(registry, command);

			expect(registry.shortcuts.get("Ctrl+s")).toBe("save");
		});

		it("should register multiple commands", () => {
			const cmd1: KeyboardCommand = {
				id: "save",
				name: "Save",
				callback: mockCallback,
			};
			const cmd2: KeyboardCommand = {
				id: "undo",
				name: "Undo",
				callback: mockCallback,
			};

			registerCommand(registry, cmd1);
			registerCommand(registry, cmd2);

			expect(registry.commands.size).toBe(2);
		});
	});

	describe("unregisterCommand", () => {
		it("should unregister a command", () => {
			const command: KeyboardCommand = {
				id: "save",
				name: "Save",
				callback: mockCallback,
			};

			registerCommand(registry, command);
			unregisterCommand(registry, "save");

			expect(registry.commands.get("save")).toBeUndefined();
		});

		it("should remove shortcut when unregistering", () => {
			const command: KeyboardCommand = {
				id: "save",
				name: "Save",
				shortcut: { key: "s", ctrl: true },
				callback: mockCallback,
			};

			registerCommand(registry, command);
			unregisterCommand(registry, "save");

			expect(registry.shortcuts.get("Ctrl+s")).toBeUndefined();
		});

		it("should not error on non-existent command", () => {
			expect(() => unregisterCommand(registry, "non-existent")).not.toThrow();
		});
	});

	describe("executeCommand", () => {
		it("should execute a command callback", async () => {
			const command: KeyboardCommand = {
				id: "save",
				name: "Save",
				callback: mockCallback,
			};

			registerCommand(registry, command);
			const success = await executeCommand(registry, "save");

			expect(success).toBe(true);
			expect(mockCallback).toHaveBeenCalled();
		});

		it("should return false for disabled command", async () => {
			const command: KeyboardCommand = {
				id: "save",
				name: "Save",
				enabled: false,
				callback: mockCallback,
			};

			registerCommand(registry, command);
			const success = await executeCommand(registry, "save");

			expect(success).toBe(false);
			expect(mockCallback).not.toHaveBeenCalled();
		});

		it("should return false for non-existent command", async () => {
			const success = await executeCommand(registry, "non-existent");
			expect(success).toBe(false);
		});

		it("should handle async callbacks", async () => {
			const asyncCallback = vi.fn().mockResolvedValue(undefined);
			const command: KeyboardCommand = {
				id: "async",
				name: "Async",
				callback: asyncCallback,
			};

			registerCommand(registry, command);
			const success = await executeCommand(registry, "async");

			expect(success).toBe(true);
		});
	});

	describe("getCommandByShortcut", () => {
		it("should find command by shortcut", () => {
			const command: KeyboardCommand = {
				id: "save",
				name: "Save",
				shortcut: { key: "s", ctrl: true },
				callback: mockCallback,
			};

			registerCommand(registry, command);
			const found = getCommandByShortcut(registry, { key: "s", ctrl: true });

			expect(found?.id).toBe("save");
		});

		it("should return undefined for non-existent shortcut", () => {
			const found = getCommandByShortcut(registry, { key: "x", ctrl: true });
			expect(found).toBeUndefined();
		});

		it("should distinguish between different modifiers", () => {
			const cmd1: KeyboardCommand = {
				id: "save",
				name: "Save",
				shortcut: { key: "s", ctrl: true },
				callback: mockCallback,
			};
			const cmd2: KeyboardCommand = {
				id: "saveas",
				name: "Save As",
				shortcut: { key: "s", ctrl: true, shift: true },
				callback: mockCallback,
			};

			registerCommand(registry, cmd1);
			registerCommand(registry, cmd2);

			const found1 = getCommandByShortcut(registry, { key: "s", ctrl: true });
			const found2 = getCommandByShortcut(registry, { key: "s", ctrl: true, shift: true });

			expect(found1?.id).toBe("save");
			expect(found2?.id).toBe("saveas");
		});
	});

	describe("getCommandsByCategory", () => {
		it("should get commands by category", () => {
			const cmd1: KeyboardCommand = {
				id: "save",
				name: "Save",
				category: "file",
				callback: mockCallback,
			};
			const cmd2: KeyboardCommand = {
				id: "cut",
				name: "Cut",
				category: "edit",
				callback: mockCallback,
			};

			registerCommand(registry, cmd1);
			registerCommand(registry, cmd2);

			const fileCommands = getCommandsByCategory(registry, "file");
			expect(fileCommands).toHaveLength(1);
			expect(fileCommands[0].id).toBe("save");
		});

		it("should return empty array for empty category", () => {
			const commands = getCommandsByCategory(registry, "non-existent");
			expect(commands).toHaveLength(0);
		});
	});

	describe("formatShortcut", () => {
		it("should format shortcut with single modifier", () => {
			const shortcut = formatShortcut({ key: "s", ctrl: true });
			expect(shortcut).toBe("Ctrl+s");
		});

		it("should format shortcut with multiple modifiers", () => {
			const shortcut = formatShortcut({
				key: "s",
				ctrl: true,
				shift: true,
			});
			expect(shortcut).toBe("Ctrl+Shift+s");
		});

		it("should format shortcut with all modifiers", () => {
			const shortcut = formatShortcut({
				key: "k",
				ctrl: true,
				shift: true,
				alt: true,
				meta: true,
			});
			expect(shortcut).toBe("Ctrl+Shift+Alt+Meta+k");
		});

		it("should format shortcut without modifiers", () => {
			const shortcut = formatShortcut({ key: "Enter" });
			expect(shortcut).toBe("Enter");
		});
	});

	describe("parseShortcut", () => {
		it("should parse shortcut string", () => {
			const shortcut = parseShortcut("Ctrl+s");
			expect(shortcut).toEqual({ key: "s", ctrl: true });
		});

		it("should parse shortcut with multiple modifiers", () => {
			const shortcut = parseShortcut("Ctrl+Shift+s");
			expect(shortcut).toEqual({ key: "s", ctrl: true, shift: true });
		});

		it("should parse shortcut without modifiers", () => {
			const shortcut = parseShortcut("Enter");
			expect(shortcut).toEqual({ key: "Enter" });
		});
	});

	describe("KeyboardMacroRecorder", () => {
		it("should record keyboard events", () => {
			const recorder = new KeyboardMacroRecorder();
			recorder.startRecording();
			recorder.recordKey("a");
			recorder.recordKey("b");
			recorder.recordKey("c");
			const macro = recorder.stopRecording();

			expect(macro).toHaveLength(3);
			expect(macro[0].key).toBe("a");
		});

		it("should calculate delays between keys", () => {
			const recorder = new KeyboardMacroRecorder();
			recorder.startRecording();
			recorder.recordKey("a");
			setTimeout(() => recorder.recordKey("b"), 10);
			const macro = recorder.stopRecording();

			expect(macro[0].delay).toBe(0);
			expect(macro[1].delay).toBeGreaterThanOrEqual(10);
		});

		it("should not record when not recording", () => {
			const recorder = new KeyboardMacroRecorder();
			recorder.recordKey("a");
			const macro = recorder.stopRecording();

			expect(macro).toHaveLength(0);
		});

		it("should track recording state", () => {
			const recorder = new KeyboardMacroRecorder();
			expect(recorder.isCurrentlyRecording()).toBe(false);
			recorder.startRecording();
			expect(recorder.isCurrentlyRecording()).toBe(true);
			recorder.stopRecording();
			expect(recorder.isCurrentlyRecording()).toBe(false);
		});
	});

	describe("searchCommands", () => {
		beforeEach(() => {
			const commands: KeyboardCommand[] = [
				{
					id: "save",
					name: "Save",
					description: "Save the file",
					category: "file",
					callback: mockCallback,
				},
				{
					id: "saveas",
					name: "Save As",
					description: "Save with new name",
					category: "file",
					callback: mockCallback,
				},
				{
					id: "cut",
					name: "Cut",
					description: "Cut selection",
					category: "edit",
					callback: mockCallback,
				},
			];

			commands.forEach((cmd) => registerCommand(registry, cmd));
		});

		it("should search by name", () => {
			const results = searchCommands(registry, "save");
			expect(results).toHaveLength(2);
		});

		it("should search by description", () => {
			const results = searchCommands(registry, "selection");
			expect(results).toHaveLength(1);
			expect(results[0].id).toBe("cut");
		});

		it("should be case-insensitive", () => {
			const results = searchCommands(registry, "SAVE");
			expect(results).toHaveLength(2);
		});

		it("should sort by match position", () => {
			const results = searchCommands(registry, "sav");
			expect(results[0].name).toBe("Save");
		});

		it("should return empty for no matches", () => {
			const results = searchCommands(registry, "xyz");
			expect(results).toHaveLength(0);
		});
	});

	describe("getAllShortcuts", () => {
		it("should get all registered shortcuts", () => {
			const cmd1: KeyboardCommand = {
				id: "save",
				name: "Save",
				shortcut: { key: "s", ctrl: true },
				callback: mockCallback,
			};
			const cmd2: KeyboardCommand = {
				id: "cut",
				name: "Cut",
				shortcut: { key: "x", ctrl: true },
				callback: mockCallback,
			};

			registerCommand(registry, cmd1);
			registerCommand(registry, cmd2);

			const shortcuts = getAllShortcuts(registry);
			expect(shortcuts).toHaveLength(2);
		});

		it("should exclude commands without shortcuts", () => {
			const cmd1: KeyboardCommand = {
				id: "save",
				name: "Save",
				shortcut: { key: "s", ctrl: true },
				callback: mockCallback,
			};
			const cmd2: KeyboardCommand = {
				id: "print",
				name: "Print",
				callback: mockCallback,
			};

			registerCommand(registry, cmd1);
			registerCommand(registry, cmd2);

			const shortcuts = getAllShortcuts(registry);
			expect(shortcuts).toHaveLength(1);
		});
	});

	describe("matchesShortcut", () => {
		it("should match keyboard event to shortcut", () => {
			const event = new KeyboardEvent("keydown", {
				key: "s",
				ctrlKey: true,
			});
			const shortcut = { key: "s", ctrl: true };

			const matches = matchesShortcut(event, shortcut);
			expect(matches).toBe(true);
		});

		it("should not match different key", () => {
			const event = new KeyboardEvent("keydown", {
				key: "a",
				ctrlKey: true,
			});
			const shortcut = { key: "s", ctrl: true };

			const matches = matchesShortcut(event, shortcut);
			expect(matches).toBe(false);
		});

		it("should not match missing modifier", () => {
			const event = new KeyboardEvent("keydown", {
				key: "s",
				ctrlKey: false,
			});
			const shortcut = { key: "s", ctrl: true };

			const matches = matchesShortcut(event, shortcut);
			expect(matches).toBe(false);
		});
	});
});
