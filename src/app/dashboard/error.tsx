"use client";

import { DashboardErrorBoundary } from "@/components/dashboard/DashboardErrorBoundary";

export default function DashboardError({
	error,
	reset,
}: {
	error: Error & { digest?: string };
	reset: () => void;
}) {
	return <DashboardErrorBoundary error={error} reset={reset} />;
}
