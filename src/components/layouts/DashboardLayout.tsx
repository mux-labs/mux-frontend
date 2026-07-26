"use client";

import { usePathname } from "next/navigation";
import {
	type KeyboardEvent,
	useCallback,
	useEffect,
	useRef,
	useState,
} from "react";
import { NetworkProvider } from "@/context/NetworkContext";
import { Sidebar } from "./Sidebar";
import { TopNav } from "./TopNav";

interface DashboardLayoutProps {
	children: React.ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
	const pathname = usePathname();

	return <DashboardLayoutShell key={pathname}>{children}</DashboardLayoutShell>;
}

function DashboardLayoutShell({ children }: DashboardLayoutProps) {
	const [sidebarOpen, setSidebarOpen] = useState(false);
	const sidebarRef = useRef<HTMLDivElement>(null);

	const closeSidebar = useCallback(() => {
		setSidebarOpen(false);
	}, []);

	const toggleSidebar = useCallback(() => {
		setSidebarOpen((prev) => !prev);
	}, []);

	// Lock body scroll when sidebar is open on mobile
	useEffect(() => {
		if (sidebarOpen) {
			document.body.style.overflow = "hidden";
		} else {
			document.body.style.overflow = "auto";
		}

		return () => {
			document.body.style.overflow = "auto";
		};
	}, [sidebarOpen]);

	// Close sidebar on Escape key press
	const handleKeyDown = useCallback(
		(event: KeyboardEvent<HTMLDivElement>) => {
			if (event.key === "Escape" && sidebarOpen) {
				closeSidebar();
			}
		},
		[sidebarOpen, closeSidebar],
	);

	// Touch swipe to close on mobile - track touch start position
	const touchStartX = useRef<number | null>(null);

	const handleTouchStart = useCallback(
		(e: React.TouchEvent<HTMLDivElement>) => {
			touchStartX.current = e.touches[0]?.clientX ?? null;
		},
		[],
	);

	const handleTouchEnd = useCallback(
		(e: React.TouchEvent<HTMLDivElement>) => {
			if (touchStartX.current === null || !sidebarOpen) return;
			const endX = e.changedTouches[0]?.clientX ?? 0;
			const deltaX = endX - touchStartX.current;
			// If swiped left by more than 50px, close the sidebar
			if (deltaX < -50) {
				closeSidebar();
			}
			touchStartX.current = null;
		},
		[sidebarOpen, closeSidebar],
	);

	return (
		<NetworkProvider>
			<div
				className="relative flex min-h-screen bg-gray-50 dark:bg-zinc-950"
				onKeyDown={handleKeyDown}
				onTouchStart={handleTouchStart}
				onTouchEnd={handleTouchEnd}
			>
				{/* Mobile Overlay */}
				{sidebarOpen && (
					<div
						className="fixed inset-0 z-40 bg-black/50 lg:hidden"
						onClick={closeSidebar}
						aria-hidden="true"
					/>
				)}

				{/* Sidebar */}
				<div ref={sidebarRef}>
					<Sidebar isOpen={sidebarOpen} onClose={closeSidebar} />
				</div>

				<div className="flex flex-col flex-1 min-w-0">
					{/* TopNav */}
					<TopNav onMenuClick={toggleSidebar} />

					{/* Main */}
					<main id="main-content" className="flex-1">
						<div className="py-6">
							<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
								{children}
							</div>
						</div>
					</main>
				</div>
			</div>
		</NetworkProvider>
	);
}
