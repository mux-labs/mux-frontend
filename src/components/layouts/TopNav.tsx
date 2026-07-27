"use client";

import {
	ArrowRightStartOnRectangleIcon,
	Bars3Icon,
	BellIcon,
	ChevronDownIcon,
	MagnifyingGlassIcon,
	MoonIcon,
	SunIcon,
} from "@heroicons/react/24/outline";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useNetwork } from "@/context/NetworkContext";
import { useDarkMode } from "@/hooks/useDarkMode";
import type { WalletNetwork } from "@/types/wallet";

interface TopNavProps {
	onMenuClick: () => void;
}

const networkLabel = { mainnet: "Mainnet", testnet: "Testnet" } as const;
// Text colors darkened to -900 to meet WCAG AA (4.5:1) contrast against their badge backgrounds.
const networkBadgeClass = {
	mainnet: "bg-blue-100 text-blue-900",
	testnet: "bg-amber-100 text-amber-900",
} as const;

export function TopNav({ onMenuClick }: TopNavProps) {
	const [searchOpen, setSearchOpen] = useState(false);
	const [menuOpen, setMenuOpen] = useState(false);
	const pathname = usePathname();
	const { network, setNetwork } = useNetwork();
	const [optimisticNetwork, setOptimisticNetwork] =
		useState<WalletNetwork>(network);
	const [isSwitchingNetwork, setIsSwitchingNetwork] = useState(false);
	const switchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
	const { user, isLoading } = useAuth();
	const { isDark, toggle: toggleDark } = useDarkMode();
	const router = useRouter();
	const menuRef = useRef<HTMLDivElement>(null);

	// Get current page title from pathname
	const pageTitle = (() => {
		const segments = pathname.split("/").filter(Boolean);
		const segment = segments.at(-1) ?? "";
		if (segments.at(-2) === "wallets" && segment !== "wallets") {
			return "Wallet Detail";
		}
		const titleMap: Record<string, string> = {
			dashboard: "Dashboard",
			analytics: "Analytics",
			users: "Users",
			documents: "Documents",
			settings: "Settings",
			wallets: "Wallets",
			"api-keys": "API Keys",
			"spending-limits": "Spending Limits",
		};
		return (
			titleMap[segment] ?? segment.charAt(0).toUpperCase() + segment.slice(1)
		);
	})();

	useEffect(() => {
		setOptimisticNetwork(network);
	}, [network]);

	useEffect(() => {
		document.title = `${pageTitle} · ${networkLabel[optimisticNetwork]} — Mux`;
	}, [pageTitle, optimisticNetwork]);

	useEffect(() => {
		return () => {
			if (switchTimerRef.current) clearTimeout(switchTimerRef.current);
		};
	}, []);

	function handleNetworkSwitch(nextNetwork: WalletNetwork) {
		if (nextNetwork === optimisticNetwork) return;

		setOptimisticNetwork(nextNetwork);
		setIsSwitchingNetwork(true);
		setNetwork(nextNetwork);

		if (switchTimerRef.current) clearTimeout(switchTimerRef.current);
		switchTimerRef.current = setTimeout(() => {
			setIsSwitchingNetwork(false);
		}, 300);
	}

	// Close dropdown when clicking outside
	useEffect(() => {
		function handleClickOutside(event: MouseEvent) {
			if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
				setMenuOpen(false);
			}
		}
		document.addEventListener("mousedown", handleClickOutside);
		return () => document.removeEventListener("mousedown", handleClickOutside);
	}, []);

	// Close dropdown on Escape key
	useEffect(() => {
		function handleKeyDown(event: KeyboardEvent) {
			if (event.key === "Escape") {
				setMenuOpen(false);
			}
		}
		document.addEventListener("keydown", handleKeyDown);
		return () => document.removeEventListener("keydown", handleKeyDown);
	}, []);

	function handleLogout() {
		setMenuOpen(false);
		signOut();
		router.replace("/login");
	}

	const displayName = user?.name ?? "Developer";

	// Close dropdown when clicking outside
	useEffect(() => {
		function handleClickOutside(event: MouseEvent) {
			if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
				setMenuOpen(false);
			}
		}
		document.addEventListener("mousedown", handleClickOutside);
		return () => document.removeEventListener("mousedown", handleClickOutside);
	}, []);

	// Close dropdown on Escape key
	useEffect(() => {
		function handleKeyDown(event: KeyboardEvent) {
			if (event.key === "Escape") {
				setMenuOpen(false);
			}
		}
		document.addEventListener("keydown", handleKeyDown);
		return () => document.removeEventListener("keydown", handleKeyDown);
	}, []);

	function handleLogout() {
		setMenuOpen(false);
		signOut();
		router.replace("/login");
	}

	const displayName = user?.name ?? "Developer";

	// Close dropdown when clicking outside
	useEffect(() => {
		function handleClickOutside(event: MouseEvent) {
			if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
				setMenuOpen(false);
			}
		}
		document.addEventListener("mousedown", handleClickOutside);
		return () => document.removeEventListener("mousedown", handleClickOutside);
	}, []);

	// Close dropdown on Escape key
	useEffect(() => {
		function handleKeyDown(event: KeyboardEvent) {
			if (event.key === "Escape") {
				setMenuOpen(false);
			}
		}
		document.addEventListener("keydown", handleKeyDown);
		return () => document.removeEventListener("keydown", handleKeyDown);
	}, []);

	function handleLogout() {
		setMenuOpen(false);
		signOut();
		router.replace("/login");
	}

	const displayName = user?.name ?? "Developer";

	// Close dropdown when clicking outside
	useEffect(() => {
		function handleClickOutside(event: MouseEvent) {
			if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
				setMenuOpen(false);
			}
		}
		document.addEventListener("mousedown", handleClickOutside);
		return () => document.removeEventListener("mousedown", handleClickOutside);
	}, []);

	// Close dropdown on Escape key
	useEffect(() => {
		function handleKeyDown(event: KeyboardEvent) {
			if (event.key === "Escape") {
				setMenuOpen(false);
			}
		}
		document.addEventListener("keydown", handleKeyDown);
		return () => document.removeEventListener("keydown", handleKeyDown);
	}, []);

	function handleLogout() {
		setMenuOpen(false);
		signOut();
		router.replace("/login");
	}

	const displayName = user?.name ?? "Developer";

	return (
		<header className="sticky top-0 z-40 flex h-16 shrink-0 items-center gap-x-4 border-b border-gray-200 bg-white/95 px-4 shadow-sm sm:gap-x-6 sm:px-6 lg:px-8 backdrop-blur supports-backdrop-filter:bg-white/60 dark:border-zinc-800 dark:bg-zinc-900/95 dark:supports-backdrop-filter:bg-zinc-900/60">
			{/* Menu button for mobile */}
			<button
				type="button"
				onClick={onMenuClick}
				aria-label="Open sidebar"
				className="-m-2.5 rounded-md p-2.5 text-gray-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 lg:hidden"
			>
				<span className="sr-only">Open sidebar</span>
				<Bars3Icon className="h-6 w-6" aria-hidden="true" />
			</button>

			{/* Separator */}
			<div className="h-6 w-px bg-gray-200 lg:hidden" aria-hidden="true" />

			{/* Page title and breadcrumbs */}
			<div className="flex flex-1 items-center gap-x-4 self-stretch lg:gap-x-6">
				<div className="flex flex-1 items-center">
					<h1 className="flex items-center gap-2 text-lg font-semibold text-gray-900 sm:text-xl">
						{pageTitle}
						<span
							className={`rounded-full px-2 py-0.5 text-xs font-medium ${networkBadgeClass[optimisticNetwork]}`}
						>
							{networkLabel[optimisticNetwork]}
						</span>
					</h1>

					{/* Breadcrumbs - hidden on mobile */}
					<nav
						aria-label="Breadcrumb"
						className="hidden lg:ml-6 lg:flex lg:items-center"
					>
						<ol className="flex items-center space-x-2 text-sm">
							<li className="text-gray-500">Home</li>
							<li className="text-gray-400">/</li>
							<li className="flex items-center gap-1.5 font-medium text-gray-900">
								{pageTitle}
								<span
									className={`rounded-full px-2 py-0.5 text-xs font-medium ${networkBadgeClass[optimisticNetwork]}`}
								>
									{networkLabel[optimisticNetwork]}
								</span>
							</li>
						</ol>
					</nav>
				</div>

				{/* Right side actions */}
				<div className="flex items-center gap-x-3 sm:gap-x-6">
					{/* Network Switcher — global testnet/mainnet toggle, persisted via NetworkContext */}
					<div
						role="group"
						aria-label="Network selector"
						className="flex shrink-0 items-center rounded-lg border border-gray-200 bg-gray-50 p-0.5 text-xs font-medium dark:border-zinc-700 dark:bg-zinc-800 sm:text-sm"
					>
						<button
							type="button"
							onClick={() => handleNetworkSwitch("testnet")}
							aria-pressed={optimisticNetwork === "testnet"}
							aria-label="Switch to Testnet"
							className={`rounded-md px-2 py-1 transition-colors sm:px-3 ${
								optimisticNetwork === "testnet"
									? "bg-amber-100 text-amber-900"
									: "text-gray-500 hover:text-gray-700 dark:text-zinc-400 dark:hover:text-zinc-200"
							}`}
						>
							Testnet
						</button>
						<button
							type="button"
							onClick={() => handleNetworkSwitch("mainnet")}
							aria-pressed={optimisticNetwork === "mainnet"}
							aria-label="Switch to Mainnet"
							className={`rounded-md px-2 py-1 transition-colors sm:px-3 ${
								optimisticNetwork === "mainnet"
									? "bg-blue-100 text-blue-900"
									: "text-gray-500 hover:text-gray-700 dark:text-zinc-400 dark:hover:text-zinc-200"
							}`}
						>
							Mainnet
						</button>
					</div>
					<span className="sr-only" aria-live="polite">
						{isSwitchingNetwork
							? `Switching to ${networkLabel[optimisticNetwork]}`
							: `Using ${networkLabel[optimisticNetwork]}`}
					</span>

					{/* Search - responsive */}
					<div
						className={`
            ${searchOpen ? "w-48 sm:w-64" : "w-0"} 
            transition-all duration-300 overflow-hidden
            lg:w-64 lg:transition-none
          `}
					>
						<div className="relative">
							<MagnifyingGlassIcon
								className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 pointer-events-none"
								aria-hidden="true"
							/>
							<input
								type="search"
								placeholder="Search..."
								className="block w-full rounded-lg border-0 py-2 pl-10 pr-3 text-gray-900 ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:text-sm sm:leading-6"
							/>
						</div>
					</div>

					<button
						type="button"
						onClick={() => setSearchOpen(!searchOpen)}
						aria-label={searchOpen ? "Close search" : "Open search"}
						className="rounded-md p-2 text-gray-400 hover:text-gray-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 lg:hidden"
					>
						<span className="sr-only">Search</span>
						<MagnifyingGlassIcon className="h-5 w-5" aria-hidden="true" />
					</button>

					{/* Dark mode toggle */}
					<button
						type="button"
						onClick={toggleDark}
						aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
						className="rounded-full p-1 text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:text-zinc-400 dark:hover:text-zinc-300"
					>
						{isDark ? (
							<SunIcon className="h-5 w-5" aria-hidden="true" />
						) : (
							<MoonIcon className="h-5 w-5" aria-hidden="true" />
						)}
					</button>

					{/* Notifications */}
					<button
						type="button"
						aria-label="View notifications"
						className="relative rounded-full p-1 text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
					>
						<span className="sr-only">View notifications</span>
						<BellIcon className="h-6 w-6" aria-hidden="true" />
						<span className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-red-500 border-2 border-white" />
					</button>

					{/* User dropdown */}
					<div className="relative" ref={menuRef}>
						<button
							type="button"
							aria-label="Open user menu"
							className="flex items-center gap-x-3 rounded-lg p-1.5 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
							id="user-menu-button"
						>
							{isLoading ? (
								<div
									data-testid="user-avatar-skeleton"
									className="h-8 w-8 rounded-full bg-gray-200 animate-pulse"
								/>
							) : user ? (
								<>
									<div
										data-testid="user-avatar"
										aria-label={`${user.name} avatar`}
										className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-linear-to-br from-blue-500 to-purple-600 text-xs font-semibold text-white select-none"
									>
										{user.name
											.split(" ")
											.map((n: string) => n[0])
											.slice(0, 2)
											.join("")
											.toUpperCase()}
									</div>
									<div className="hidden lg:block text-left">
										<p className="text-sm font-medium text-gray-900">
											{user.name}
										</p>
									</div>
								</>
							) : (
								<div
									data-testid="user-avatar-empty"
									className="h-8 w-8 rounded-full bg-linear-to-br from-gray-300 to-gray-400"
								/>
							)}
							<ChevronDownIcon
								className={`hidden h-5 w-5 text-gray-400 lg:block transition-transform duration-150 ${menuOpen ? "rotate-180" : ""}`}
								aria-hidden="true"
							/>
						</button>

						{/* Dropdown menu */}
						{menuOpen && (
							<div
								id="user-menu"
								role="menu"
								aria-labelledby="user-menu-button"
								data-testid="user-menu"
								className="absolute right-0 mt-2 w-48 origin-top-right rounded-lg bg-white py-1 shadow-lg ring-1 ring-black/5 focus:outline-none z-50"
							>
								{/* User info */}
								<div className="border-b border-gray-100 px-4 py-2">
									<p className="text-xs text-gray-500">Signed in as</p>
									<p
										className="truncate text-sm font-medium text-gray-900"
										data-testid="user-menu-email"
									>
										{user?.email ?? ""}
									</p>
								</div>

								{/* Logout action */}
								<button
									type="button"
									role="menuitem"
									onClick={handleLogout}
									data-testid="logout-button"
									className="flex w-full items-center gap-x-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 hover:text-red-600 focus:outline-none focus:bg-gray-50"
								>
									<ArrowRightStartOnRectangleIcon
										className="h-4 w-4 text-gray-400"
										aria-hidden="true"
									/>
									Sign out
								</button>
							</div>
						)}
					</div>
				</div>
			</div>
		</header>
	);
}
