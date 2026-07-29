"use client";

import { useEffect } from "react";
import { ErrorState } from "@/components/ui/ErrorState";

interface DashboardErrorBoundaryProps {
	error: Error & { digest?: string };
	reset: () => void;
}

/**
 * Segment-level error boundary rendered by src/app/dashboard/error.tsx.
 * Keeps the surrounding DashboardLayout (sidebar/topbar) mounted so users
 * can still navigate away instead of losing the whole console.
 */
export function DashboardErrorBoundary({
	error,
	reset,
}: DashboardErrorBoundaryProps) {
	useEffect(() => {
		console.error("[DashboardErrorBoundary]", error);
	}, [error]);

	return (
		<ErrorState
			title="This page hit a problem"
			description={
				error.message ||
				"Something went wrong loading this part of the dashboard. Your data is safe - try again."
			}
			retry={{ label: "Try again", onRetry: reset }}
		/>
	);
}
