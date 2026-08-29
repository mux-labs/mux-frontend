import { NextResponse } from "next/server";
import {
	getApiBaseUrl,
	getUpstreamAuthHeaders,
	isMockFallbackAllowed,
} from "@/lib/api/config";
import { addTeamMember, getTeamMembers } from "@/mock-data/team";
import type { TeamMember } from "@/types/team";

function backendHeaders(): Record<string, string> {
	return {
		"content-type": "application/json",
		...getUpstreamAuthHeaders(),
	};
}

/**
 * GET /api/team
 *
 * Proxies to the configured backend's real team/membership store
 * (NEXT_PUBLIC_API_URL or legacy aliases). Falls back to an in-repo mock
 * store only when no backend is configured and this is not a production
 * build — see isMockFallbackAllowed().
 */
export async function GET() {
	const backendUrl = getApiBaseUrl();

	if (backendUrl) {
		try {
			const upstream = await fetch(`${backendUrl}/team`, {
				headers: backendHeaders(),
				cache: "no-store",
			});
			const data = await upstream.json().catch(() => null);

			if (!upstream.ok || data === null) {
				return NextResponse.json(
					{ error: "Unable to load team members from the backend" },
					{ status: upstream.status || 502 },
				);
			}

			return NextResponse.json({ data });
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
	return NextResponse.json({ data: getTeamMembers() });
}

/**
 * POST /api/team
 *
 * Adds a team member. Body: { name, email, role: "admin" | "developer" }.
 * There is no invite email flow — a member is added directly, matching the
 * current single-org, no-invites scope.
 */
export async function POST(request: Request) {
	const body = (await request.json().catch(() => null)) as {
		name?: string;
		email?: string;
		role?: TeamMember["role"];
	} | null;

	const name = body?.name?.trim();
	const email = body?.email?.trim();
	const role = body?.role;

	if (!name || !email) {
		return NextResponse.json(
			{ error: "Name and email are required" },
			{ status: 400 },
		);
	}
	if (role !== "admin" && role !== "developer") {
		return NextResponse.json(
			{ error: "role must be 'admin' or 'developer'" },
			{ status: 400 },
		);
	}

	const backendUrl = getApiBaseUrl();

	if (backendUrl) {
		try {
			const upstream = await fetch(`${backendUrl}/team`, {
				method: "POST",
				headers: backendHeaders(),
				body: JSON.stringify({ name, email, role }),
			});
			const data = await upstream.json().catch(() => null);

			if (!upstream.ok || data === null) {
				return NextResponse.json(
					{ error: "Unable to add team member on the backend" },
					{ status: upstream.status || 502 },
				);
			}

			return NextResponse.json({ data }, { status: 201 });
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
	const member = addTeamMember(name, email, role);
	return NextResponse.json({ data: member }, { status: 201 });
}
