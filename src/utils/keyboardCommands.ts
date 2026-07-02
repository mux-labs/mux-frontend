/**
 * Advanced keyboard shortcuts and command palette utilities
 * Provides command palette, keyboard macro recording, and advanced shortcut patterns
 */

export interface KeyboardCommand {
	id: string;
	name: string;
	description?: string;
	shortcut?: {
		key: string;
		ctrl?: boolean;
		shift?: boolean;
		alt?: boolean;
		meta?: boolean;
	};
	callback: () => void | Promise<void>;
	category?: string;
	enabled?: boolean;
}

export interface KeyboardCommandRegistry {
	commands: Map<string, KeyboardCommand>;
	shortcuts: Map<string, string>; // shortcut -> command id
}

/**
 * Create a keyboard command registry
 */
export function createCommandRegistry(): KeyboardCommandRegistry {
	return {
		commands: new Map(),
		shortcuts: new Map(),
	};
}

/**
 * Register a keyboard command
 */
export function registerCommand(
	registry: KeyboardCommandRegistry,
	command: KeyboardCommand,
): void {
	registry.commands.set(command.id, command);

	if (command.shortcut) {
		const shortcutKey = formatShortcut(command.shortcut);
		registry.shortcuts.set(shortcutKey, command.id);
	}
}

/**
 * Unregister a keyboard command
 */
export function unregisterCommand(
	registry: KeyboardCommandRegistry,
	commandId: string,
): void {
	const command = registry.commands.get(commandId);
	if (!command) return;

	registry.commands.delete(commandId);

	if (command.shortcut) {
		const shortcutKey = formatShortcut(command.shortcut);
		registry.shortcuts.delete(shortcutKey);
	}
}

/**
 * Execute a command by ID
 */
export async function executeCommand(
	registry: KeyboardCommandRegistry,
	commandId: string,
): Promise<boolean> {
	const command = registry.commands.get(commandId);
	if (!command || command.enabled === false) return false;

	try {
		await command.callback();
		return true;
	} catch (error) {
		console.error(`Command ${commandId} failed:`, error);
		return false;
	}
}

/**
 * Get command by keyboard shortcut
 */
export function getCommandByShortcut(
	registry: KeyboardCommandRegistry,
	shortcut: {
		key: string;
		ctrl?: boolean;
		shift?: boolean;
		alt?: boolean;
		meta?: boolean;
	},
): KeyboardCommand | undefined {
	const shortcutKey = formatShortcut(shortcut);
	const commandId = registry.shortcuts.get(shortcutKey);
	return commandId ? registry.commands.get(commandId) : undefined;
}

/**
 * Get all commands in a category
 */
export function getCommandsByCategory(
	registry: KeyboardCommandRegistry,
	category: string,
): KeyboardCommand[] {
	return Array.from(registry.commands.values()).filter(
		(cmd) => cmd.category === category,
	);
}

/**
 * Format shortcut for display
 */
export function formatShortcut(shortcut: {
	key: string;
	ctrl?: boolean;
	shift?: boolean;
	alt?: boolean;
	meta?: boolean;
}): string {
	const parts: string[] = [];

	if (shortcut.ctrl) parts.push("Ctrl");
	if (shortcut.shift) parts.push("Shift");
	if (shortcut.alt) parts.push("Alt");
	if (shortcut.meta) parts.push("Meta");

	parts.push(shortcut.key);
	return parts.join("+");
}

/**
 * Parse shortcut from string format
 */
export function parseShortcut(
	shortcutStr: string,
): {
	key: string;
	ctrl?: boolean;
	shift?: boolean;
	alt?: boolean;
	meta?: boolean;
} {
	const parts = shortcutStr.split("+");
	const key = parts.pop() || "";

	return {
		key,
		ctrl: parts.includes("Ctrl"),
		shift: parts.includes("Shift"),
		alt: parts.includes("Alt"),
		meta: parts.includes("Meta"),
	};
}

/**
 * Keyboard macro recording utility
 */
export class KeyboardMacroRecorder {
	private isRecording = false;
	private events: Array<{ key: string; timestamp: number }> = [];
	private startTime = 0;

	startRecording(): void {
		this.isRecording = true;
		this.events = [];
		this.startTime = Date.now();
	}

	stopRecording(): Array<{ key: string; delay: number }> {
		this.isRecording = false;
		return this.events.map((event, index) => ({
			key: event.key,
			delay:
				index === 0
					? 0
					: event.timestamp - this.events[index - 1].timestamp,
		}));
	}

	recordKey(key: string): void {
		if (!this.isRecording) return;
		this.events.push({
			key,
			timestamp: Date.now(),
		});
	}

	isCurrentlyRecording(): boolean {
		return this.isRecording;
	}
}

/**
 * Type-ahead search for commands
 */
export function searchCommands(
	registry: KeyboardCommandRegistry,
	query: string,
): KeyboardCommand[] {
	const lowerQuery = query.toLowerCase();

	return Array.from(registry.commands.values())
		.filter(
			(cmd) =>
				cmd.name.toLowerCase().includes(lowerQuery) ||
				cmd.description?.toLowerCase().includes(lowerQuery) ||
				cmd.category?.toLowerCase().includes(lowerQuery),
		)
		.sort((a, b) => {
			// Sort by name match position
			const aPos = a.name.toLowerCase().indexOf(lowerQuery);
			const bPos = b.name.toLowerCase().indexOf(lowerQuery);
			return aPos - bPos;
		});
}

/**
 * Get all available shortcuts
 */
export function getAllShortcuts(
	registry: KeyboardCommandRegistry,
): Array<{
	command: KeyboardCommand;
	shortcut: string;
}> {
	return Array.from(registry.commands.values())
		.filter((cmd) => cmd.shortcut)
		.map((cmd) => ({
			command: cmd,
			shortcut: formatShortcut(cmd.shortcut!),
		}));
}

/**
 * Validate keyboard event matches shortcut
 */
export function matchesShortcut(
	event: KeyboardEvent,
	shortcut: {
		key: string;
		ctrl?: boolean;
		shift?: boolean;
		alt?: boolean;
		meta?: boolean;
	},
): boolean {
	return (
		event.key === shortcut.key &&
		event.ctrlKey === (shortcut.ctrl ?? false) &&
		event.shiftKey === (shortcut.shift ?? false) &&
		event.altKey === (shortcut.alt ?? false) &&
		event.metaKey === (shortcut.meta ?? false)
	);
}
