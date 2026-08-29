"use client";

import { useAuth } from "@/context/AuthContext";
import { useSessionGuard } from "@/hooks/useSessionGuard";

// ---------------------------------------------------------------------------
// DashboardSkeleton — shown while auth state rehydrates on protected routes
// ---------------------------------------------------------------------------

export function DashboardSkeleton() {
	return (
		<div
			className="flex min-h-screen bg-gray-50"
			data-testid="dashboard-auth-skeleton"
			aria-busy="true"
			aria-label="Loading dashboard"
		>
			{/* Sidebar skeleton */}
			<div className="hidden lg:flex lg:w-64 lg:flex-col lg:fixed lg:inset-y-0">
				<div className="flex flex-col flex-grow border-r border-gray-200 bg-white overflow-y-auto">
					{/* Logo area */}
					<div className="flex items-center flex-shrink-0 px-4 py-5 gap-3">
						<div className="h-8 w-8 rounded-lg bg-gray-200 animate-pulse" />
						<div className="h-5 w-24 rounded bg-gray-200 animate-pulse" />
					</div>
					{/* Nav items */}
					<nav className="mt-2 flex-1 px-3 space-y-1">
						{Array.from({ length: 5 }).map((_, i) => (
							<div
								// biome-ignore lint/suspicious/noArrayIndexKey: static skeleton
								key={i}
								className="flex items-center gap-3 px-3 py-2 rounded-lg"
							>
								<div className="h-5 w-5 rounded bg-gray-200 animate-pulse" />
								<div className="h-4 w-28 rounded bg-gray-200 animate-pulse" />
							</div>
						))}
					</nav>
				</div>
			</div>

			{/* Main content area */}
			<div className="lg:pl-64 flex flex-col flex-1">
				{/* TopNav skeleton */}
				<div className="sticky top-0 z-40 flex h-16 shrink-0 items-center gap-x-4 border-b border-gray-200 bg-white/95 px-4 shadow-sm sm:gap-x-6 sm:px-6 lg:px-8">
					<div className="h-8 w-8 rounded-full bg-gray-200 animate-pulse lg:hidden" />
					<div className="flex flex-1 items-center justify-between">
						<div className="h-6 w-32 rounded bg-gray-200 animate-pulse" />
						<div className="flex items-center gap-3">
							<div className="h-8 w-8 rounded-full bg-gray-200 animate-pulse" />
							<div className="hidden lg:block h-8 w-28 rounded bg-gray-200 animate-pulse" />
						</div>
					</div>
				</div>

				{/* Page content skeleton */}
				<main className="flex-1 py-6">
					<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
						<div className="h-8 w-48 rounded bg-gray-200 animate-pulse" />
						<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
							{Array.from({ length: 3 }).map((_, i) => (
								<div
									// biome-ignore lint/suspicious/noArrayIndexKey: static skeleton
									key={i}
									className="h-32 rounded-xl bg-gray-200 animate-pulse"
								/>
							))}
						</div>
						<div className="h-64 rounded-xl bg-gray-200 animate-pulse" />
					</div>
				</main>
			</div>
		</div>
	);
}

// ---------------------------------------------------------------------------
// AuthGuard — wraps protected route content
// ---------------------------------------------------------------------------

interface AuthGuardProps {
	children: React.ReactNode;
}

/**
 * AuthGuard renders a loading skeleton while the auth state is rehydrating
 * from sessionStorage, then redirects unauthenticated users to the login page.
 * Authenticated users see the protected content immediately.
 *
 * The redirect itself is delegated to {@link useSessionGuard} (issue #624) so
 * the documented client-side stale-session guard is actually on the production
 * `/dashboard/*` path — `DashboardLayout` wraps every real dashboard route in
 * this component — rather than being a second, unused implementation.
 */
export function AuthGuard({ children }: AuthGuardProps) {
	const { isLoading, isAuthenticated } = useAuth();

	useSessionGuard();

	if (isLoading) {
		return <DashboardSkeleton />;
	}

	if (!isAuthenticated) {
		// Render skeleton while redirect navigates
		return <DashboardSkeleton />;
	}

	return <>{children}</>;
}
