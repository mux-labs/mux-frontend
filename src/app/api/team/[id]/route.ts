import { NextResponse } from "next/server";
import {
	getApiBaseUrl,
	getUpstreamAuthHeaders,
	isMockFallbackAllowed,
} from "@/lib/api/config";
import { removeTeamMember } from "@/mock-data/team";

/**
 * DELETE /api/team/[id]
 *
 * Removes a team member. Proxies to the backend when configured; otherwise
 * falls back to the in-repo mock store outside production only.
 */
export async function DELETE(
	_request: Request,
	{ params }: { params: Promise<{ id: string }> },
) {
	const { id } = await params;
	const backendUrl = getApiBaseUrl();

	if (backendUrl) {
		try {
			const upstream = await fetch(`${backendUrl}/team/${id}`, {
				method: "DELETE",
				headers: {
					"content-type": "application/json",
					...getUpstreamAuthHeaders(),
				},
			});

			if (!upstream.ok) {
				return NextResponse.json(
					{ error: "Unable to remove team member on the backend" },
					{ status: upstream.status || 502 },
				);
			}

			return NextResponse.json({ ok: true });
		} catch {
			return NextResponse.json(
				{ error: "Unable to reach the team backend" },
				{ status: 502 },
			);
		}
	}

	if (!isMockFallbackAllowed()) {
		return NextResponse.json(
			{
				error: "backend_unavailable",
				message:
					"No team backend is configured for this production deployment. Set NEXT_PUBLIC_API_URL.",
			},
			{ status: 503 },
		);
	}

	// --- Mock fallback (no NEXT_PUBLIC_API_URL set, non-production only) ---
	const removed = removeTeamMember(id);
	if (!removed) {
		return NextResponse.json({ error: "Member not found" }, { status: 404 });
	}
	return NextResponse.json({ ok: true });
}
