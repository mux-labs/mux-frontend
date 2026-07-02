/**
 * Command Palette Hook
 * Provides a searchable command palette UI with keyboard shortcuts
 */

import { useCallback, useEffect, useRef, useState } from "react";
import type { KeyboardCommand, KeyboardCommandRegistry } from "../utils/keyboardCommands";
import {
	createCommandRegistry,
	executeCommand,
	getCommandByShortcut,
	searchCommands,
} from "../utils/keyboardCommands";

export interface UseCommandPaletteOptions {
	isOpen?: boolean;
	onOpenChange?: (isOpen: boolean) => void;
	initialCommands?: KeyboardCommand[];
	openShortcut?: { key: string; ctrl?: boolean; meta?: boolean };
}

/**
 * useCommandPalette - Manage command palette state and search
 */
export function useCommandPalette(options: UseCommandPaletteOptions = {}) {
	const registryRef = useRef<KeyboardCommandRegistry>(createCommandRegistry());
	const [isOpen, setIsOpen] = useState(options.isOpen ?? false);
	const [searchQuery, setSearchQuery] = useState("");
	const [selectedIndex, setSelectedIndex] = useState(0);
	const containerRef = useRef<HTMLDivElement>(null);

	// Register initial commands
	useEffect(() => {
		if (options.initialCommands) {
			options.initialCommands.forEach((cmd) => {
				registryRef.current.commands.set(cmd.id, cmd);
			});
		}
	}, [options.initialCommands]);

	const filteredCommands = searchCommands(registryRef.current, searchQuery);

	// Handle keyboard events
	const handleKeyDown = useCallback(
		(e: KeyboardEvent) => {
			// Open palette on Ctrl+K or Cmd+K
			const openShortcut = options.openShortcut ?? { key: "k", ctrl: true, meta: true };
			if (
				(openShortcut.ctrl && e.ctrlKey && e.key.toLowerCase() === openShortcut.key) ||
				(openShortcut.meta && e.metaKey && e.key.toLowerCase() === openShortcut.key)
			) {
				e.preventDefault();
				setIsOpen(true);
				setSearchQuery("");
				setSelectedIndex(0);
				return;
			}

			if (!isOpen) return;

			switch (e.key) {
				case "Escape":
					e.preventDefault();
					setIsOpen(false);
					break;
				case "ArrowDown":
					e.preventDefault();
					setSelectedIndex((i) =>
						i < filteredCommands.length - 1 ? i + 1 : i,
					);
					break;
				case "ArrowUp":
					e.preventDefault();
					setSelectedIndex((i) => (i > 0 ? i - 1 : 0));
					break;
				case "Enter":
					e.preventDefault();
					if (filteredCommands[selectedIndex]) {
						executeCommand(
							registryRef.current,
							filteredCommands[selectedIndex].id,
						);
						setIsOpen(false);
					}
					break;
			}
		},
		[isOpen, filteredCommands, selectedIndex, options.openShortcut],
	);

	// Attach keyboard listener
	useEffect(() => {
		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, [handleKeyDown]);

	// Call onOpenChange callback
	useEffect(() => {
		options.onOpenChange?.(isOpen);
	}, [isOpen, options]);

	const registerCommand = useCallback(
		(command: KeyboardCommand) => {
			registryRef.current.commands.set(command.id, command);
		},
		[],
	);

	const executeCommandById = useCallback(async (commandId: string) => {
		const success = await executeCommand(registryRef.current, commandId);
		if (success) setIsOpen(false);
		return success;
	}, []);

	return {
		isOpen,
		setIsOpen,
		searchQuery,
		setSearchQuery,
		selectedIndex,
		setSelectedIndex,
		filteredCommands,
		containerRef,
		registerCommand,
		executeCommand: executeCommandById,
		registry: registryRef.current,
	};
}

/**
 * useCommandShortcut - Register a single keyboard command shortcut
 */
export function useCommandShortcut(
	command: KeyboardCommand,
	enabled: boolean = true,
) {
	useEffect(() => {
		if (!enabled || !command.shortcut) return;

		const handleKeyDown = (e: KeyboardEvent) => {
			if (
				e.key === command.shortcut?.key &&
				e.ctrlKey === (command.shortcut?.ctrl ?? false) &&
				e.shiftKey === (command.shortcut?.shift ?? false) &&
				e.altKey === (command.shortcut?.alt ?? false) &&
				e.metaKey === (command.shortcut?.meta ?? false)
			) {
				e.preventDefault();
				command.callback();
			}
		};

		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, [command, enabled]);
}

/**
 * useGlobalKeyboardCommand - Register multiple global keyboard commands
 */
export function useGlobalKeyboardCommands(commands: KeyboardCommand[]) {
	useEffect(() => {
		const handleKeyDown = (e: KeyboardEvent) => {
			for (const command of commands) {
				if (!command.shortcut || command.enabled === false) continue;

				if (
					e.key === command.shortcut.key &&
					e.ctrlKey === (command.shortcut.ctrl ?? false) &&
					e.shiftKey === (command.shortcut.shift ?? false) &&
					e.altKey === (command.shortcut.alt ?? false) &&
					e.metaKey === (command.shortcut.meta ?? false)
				) {
					e.preventDefault();
					command.callback();
					break;
				}
			}
		};

		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, [commands]);
}
