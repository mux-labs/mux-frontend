"use client";

import { useEffect, useState } from "react";
import { CardSkeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";

interface OverviewPayload {
	projects: number;
}

function isOverviewPayload(value: unknown): value is OverviewPayload {
	return (
		typeof value === "object" &&
		value !== null &&
		"projects" in value &&
		typeof (value as any).projects === "number"
	);
}

export default function Overview() {
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [data, setData] = useState<OverviewPayload | null>(null);

	const fetchOverview = async () => {
		setLoading(true);
		setError(null);
		try {
			const res = await fetch("/api/overview");
			if (!res.ok) throw new Error(`HTTP ${res.status}`);

			const json = await res.json();
			if (!json?.data || !isOverviewPayload(json.data)) {
				throw new Error("Overview response is invalid");
			}

			setData(json.data);
		} catch (err: any) {
			setError(err?.message || String(err));
			setData(null);
		} finally {
			setLoading(false);
		}
	};

	useEffect(() => {
		fetchOverview();
	}, []);

	if (loading) return <CardSkeleton />;
	if (error)
		return (
			<ErrorState
				description={error}
				retry={{ onRetry: fetchOverview, label: "Reload overview" }}
			/>
		);
	if (!data || data.projects === 0)
		return (
			<EmptyState
				title="No projects"
				description="You don't have any projects yet. Create a project to see overview metrics."
				action={{
					label: "Create Project",
					onClick: () => alert("Create Project"),
				}}
			/>
		);

	return (
		<div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
			<h3 className="text-lg font-semibold">Overview</h3>
			<p className="mt-4 text-zinc-600">Active projects: {data.projects}</p>
		</div>
	);
}
