"use client";

import { useRouter } from "next/navigation";
import { useMemo } from "react";
import { useCommandPalette } from "@/hooks/useCommandPalette";
import type { KeyboardCommand } from "@/utils/keyboardCommands";

const NAV_COMMANDS: { id: string; name: string; href: string }[] = [
	{ id: "nav-dashboard", name: "Go to Dashboard", href: "/dashboard" },
	{
		id: "nav-analytics",
		name: "Go to Analytics",
		href: "/dashboard/analytics",
	},
	{ id: "nav-wallets", name: "Go to Wallets", href: "/dashboard/wallets" },
	{ id: "nav-users", name: "Go to Users", href: "/dashboard/users" },
	{ id: "nav-api-keys", name: "Go to API Keys", href: "/dashboard/api-keys" },
	{
		id: "nav-spending-limits",
		name: "Go to Spending Limits",
		href: "/dashboard/spending-limits",
	},
	{ id: "nav-settings", name: "Go to Settings", href: "/dashboard/settings" },
];

/**
 * Global Ctrl/Cmd+K command palette, mounted once in the dashboard app
 * shell. Currently exposes navigation across the dashboard routes; only
 * client-side routing, no wallet/API-key data or secrets involved.
 */
export function CommandPalette() {
	const router = useRouter();

	const initialCommands = useMemo<KeyboardCommand[]>(
		() =>
			NAV_COMMANDS.map((item) => ({
				id: item.id,
				name: item.name,
				category: "Navigation",
				callback: () => router.push(item.href),
			})),
		[router],
	);

	const {
		isOpen,
		setIsOpen,
		searchQuery,
		setSearchQuery,
		selectedIndex,
		filteredCommands,
		executeCommand,
	} = useCommandPalette({ initialCommands });

	if (!isOpen) return null;

	return (
		<div
			role="dialog"
			aria-modal="true"
			aria-label="Command palette"
			className="fixed inset-0 z-[60] flex items-start justify-center p-4 pt-24"
		>
			<div
				className="absolute inset-0 bg-black/50 backdrop-blur-sm"
				onClick={() => setIsOpen(false)}
				aria-hidden="true"
			/>
			<div className="relative w-full max-w-lg rounded-xl border border-zinc-200 bg-white shadow-xl dark:border-zinc-800 dark:bg-zinc-900">
				<input
					autoFocus
					value={searchQuery}
					onChange={(e) => setSearchQuery(e.target.value)}
					placeholder="Type a command or search..."
					aria-label="Search commands"
					className="w-full border-b border-zinc-200 bg-transparent px-4 py-3 text-sm text-zinc-900 outline-none dark:border-zinc-800 dark:text-zinc-50"
				/>
				<ul role="listbox" className="max-h-80 overflow-y-auto p-2">
					{filteredCommands.length === 0 ? (
						<li className="px-3 py-2 text-sm text-zinc-500">
							No matching commands
						</li>
					) : (
						filteredCommands.map((command, index) => (
							<li key={command.id}>
								<button
									type="button"
									role="option"
									aria-selected={index === selectedIndex}
									onClick={() => executeCommand(command.id)}
									className={`w-full rounded-lg px-3 py-2 text-left text-sm ${
										index === selectedIndex
											? "bg-zinc-100 dark:bg-zinc-800"
											: "hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
									}`}
								>
									{command.name}
								</button>
							</li>
						))
					)}
				</ul>
			</div>
		</div>
	);
}
