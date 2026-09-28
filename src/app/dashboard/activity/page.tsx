"use client";

import { AuditLogPagination } from "@/components/AuditLogPagination";

/**
 * Activity / audit log page (issue #804). Reads `/api/activity` with
 * cursor pagination; authorization is enforced by the API and backend.
 */
export default function ActivityPage() {
	return (
		<main className="mx-auto max-w-5xl p-6">
			<h1 className="mb-4 text-2xl font-semibold">Activity</h1>
			<AuditLogPagination />
		</main>
	);
}
