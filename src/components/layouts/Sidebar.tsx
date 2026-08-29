"use client";

import {
	ChartBarIcon,
	CogIcon,
	HomeIcon,
	KeyIcon,
	ShieldCheckIcon,
	UsersIcon,
	WalletIcon,
	XMarkIcon,
} from "@heroicons/react/24/outline";
import clsx from "clsx";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useRef } from "react";
import { useAuth } from "@/context/AuthContext";
import { shellLabels } from "@/lib/i18n/shellLabels";
import { prefetchWallets } from "@/lib/walletsPrefetchCache";

const navigation = [
	{ name: shellLabels.nav.dashboard, href: "/dashboard", icon: HomeIcon },
	{
		name: shellLabels.nav.analytics,
		href: "/dashboard/analytics",
		icon: ChartBarIcon,
	},
	{
		name: shellLabels.nav.wallets,
		href: "/dashboard/wallets",
		icon: WalletIcon,
	},
	{ name: shellLabels.nav.users, href: "/dashboard/users", icon: UsersIcon },
	{ name: shellLabels.nav.apiKeys, href: "/dashboard/api-keys", icon: KeyIcon },
	{
		name: shellLabels.nav.spendingLimits,
		href: "/dashboard/spending-limits",
		icon: ShieldCheckIcon,
	},
	{
		name: shellLabels.nav.settings,
		href: "/dashboard/settings",
		icon: CogIcon,
	},
];

function isNavItemActive(pathname: string, itemHref: string): boolean {
	// Exact match
	if (pathname === itemHref) return true;
	// For the Dashboard root item, only match exact to avoid matching all sub-routes
	if (itemHref === "/dashboard") return false;
	// For other items, match if the pathname starts with the item's href
	// (handles nested routes like /dashboard/settings/profile)
	return pathname.startsWith(itemHref + "/") || pathname.startsWith(itemHref);
}

interface SidebarProps {
	isOpen: boolean;
	onClose: () => void;
}

export function Sidebar({ isOpen, onClose }: SidebarProps) {
	const pathname = usePathname();
	const router = useRouter();
	const { user, isLoading } = useAuth();
	const prefetchedHrefs = useRef(new Set<string>());

	const handleNavItemHover = useCallback(
		(href: string) => {
			// Warm the route's code-split chunk once per mount so navigation
			// feels instant after a hover/focus, regardless of network.
			if (!prefetchedHrefs.current.has(href)) {
				prefetchedHrefs.current.add(href);
				router.prefetch(href);
			}

			// The Wallets page also needs live API data (testnet + mainnet).
			// Kick that fetch off in parallel so it's warm by the time the
			// user actually navigates there.
			if (href === "/dashboard/wallets") {
				prefetchWallets().catch(() => {
					// Swallow errors here - the wallets page itself surfaces
					// the error state once the user actually navigates in.
				});
			}
		},
		[router],
	);

	return (
		<>
			{/* Mobile Sidebar */}
			<div
				className={clsx(
					"fixed inset-y-0 left-0 z-50 w-64 transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-auto lg:z-auto",
					{
						"translate-x-0": isOpen,
						"-translate-x-full": !isOpen,
					},
				)}
			>
				<div className="flex h-full flex-col bg-white shadow-xl lg:shadow-none border-r">
					{/* Logo Section */}
					<div className="flex h-16 items-center justify-between px-6 border-b">
						<div className="flex items-center space-x-3">
							<div className="h-8 w-8 rounded-lg bg-linear-to-br from-blue-500 to-purple-600" />
							<span className="text-xl font-bold text-gray-900">Dashboard</span>
						</div>

						{/* Close button - mobile only */}
						<button
							type="button"
							onClick={onClose}
							aria-label="Close sidebar"
							className="rounded-md p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 lg:hidden"
						>
							<span className="sr-only">Close sidebar</span>
							<XMarkIcon className="h-6 w-6" aria-hidden="true" />
						</button>
					</div>

					{/* Navigation */}
					<nav className="flex-1 space-y-1 px-4 py-6 overflow-y-auto">
						{navigation.map((item) => {
							const isActive = isNavItemActive(pathname, item.href);
							return (
								<Link
									key={item.name}
									href={item.href}
									data-testid={`sidebar-nav-${item.name.toLowerCase().replace(/\s+/g, "-")}`}
									aria-current={isActive ? "page" : undefined}
									className={clsx(
										"group flex items-center rounded-lg px-4 py-3 text-sm font-medium transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2",
										isActive
											? "bg-blue-50 text-blue-700 border border-blue-200"
											: "text-gray-700 hover:bg-gray-50 hover:text-gray-900",
									)}
									onMouseEnter={() => handleNavItemHover(item.href)}
									onFocus={() => handleNavItemHover(item.href)}
									onClick={() => {
										if (window.innerWidth < 1024) {
											onClose();
										}
									}}
								>
									<item.icon
										className={clsx(
											"mr-3 h-5 w-5 shrink-0 transition-colors",
											isActive
												? "text-blue-600"
												: "text-gray-400 group-hover:text-gray-500",
										)}
										aria-hidden="true"
									/>
									{item.name}
								</Link>
							);
						})}
					</nav>

					{/* User Profile */}
					<div className="border-t p-4">
						{isLoading ? (
							<div className="flex items-center space-x-3">
								<div className="h-10 w-10 rounded-full bg-gray-200 animate-pulse" />
								<div className="flex-1 space-y-2">
									<div className="h-3 w-24 rounded bg-gray-200 animate-pulse" />
									<div className="h-2 w-16 rounded bg-gray-200 animate-pulse" />
								</div>
							</div>
						) : user ? (
							<div className="flex items-center space-x-3">
								<div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-linear-to-br from-blue-500 to-purple-600 text-sm font-semibold text-white">
									{user.name
										.split(" ")
										.map((n) => n[0])
										.slice(0, 2)
										.join("")
										.toUpperCase()}
								</div>
								<div className="flex-1 min-w-0">
									<p className="text-sm font-medium text-gray-900 truncate">
										{user.name}
									</p>
									<p className="text-xs text-gray-500 truncate">{user.role}</p>
								</div>
							</div>
						) : (
							<div className="flex items-center space-x-3">
								<div className="h-10 w-10 rounded-full bg-linear-to-br from-gray-300 to-gray-400" />
								<div className="flex-1 min-w-0">
									<p className="text-sm font-medium text-gray-500 truncate">
										Not signed in
									</p>
								</div>
							</div>
						)}
					</div>
				</div>
			</div>
		</>
	);
}
