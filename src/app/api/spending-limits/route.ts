import { NextResponse } from "next/server";
import {
	getBackendApiBaseUrl,
	getServerApiKey,
	isMockFallbackAllowed,
} from "@/lib/api/config";

export interface SpendingLimitsData {
	dailyLimit: number;
	transactionLimit: number;
}

export interface SpendingLimitsResponse {
	limits: SpendingLimitsData;
	todayUsage: number;
}

function backendHeaders(request: Request): Record<string, string> {
	const headers: Record<string, string> = { "content-type": "application/json" };
	const apiKey = getServerApiKey();
	const authorization = request.headers.get("authorization");

	if (apiKey) headers["x-api-key"] = apiKey;
	if (authorization) headers.authorization = authorization;

	return headers;
}

async function proxy(request: Request, init?: RequestInit) {
	const backendUrl = getBackendApiBaseUrl();
	if (!backendUrl) {
		return NextResponse.json(
			{ error: "Spending limits backend is not configured" },
			{ status: 503 },
		);
	}

	try {
		const upstream = await fetch(`${backendUrl}/spending-limits`, {
			...init,
			headers: backendHeaders(request),
			cache: "no-store",
		});
		const data = await upstream.json().catch(() => ({
			error: "Invalid response from spending limits backend",
		}));

		return NextResponse.json(data, { status: upstream.status });
	} catch {
		return NextResponse.json(
			{ error: "Unable to reach spending limits backend" },
			{ status: 502 },
		);
	}
}

export async function GET(request: Request) {
	// Require a bearer token so the route is never accessible without auth.
	const authorization = request.headers.get("authorization");
	if (!authorization?.startsWith("Bearer ")) {
		return NextResponse.json({ error: "missing_auth" }, { status: 401 });
	}

	const backendUrl = getBackendApiBaseUrl();
	if (!backendUrl) {
		if (!isMockFallbackAllowed()) {
			return NextResponse.json(
				{
					error: "backend_unavailable",
					message:
						"No spending-limits backend is configured for this production deployment. Set MUX_BACKEND_URL.",
				},
				{ status: 503 },
			);
		}
		// Non-production mock fallback — return default limits with zero usage.
		return NextResponse.json(
			{
				limits: { dailyLimit: 5000, transactionLimit: 1000 },
				todayUsage: 0,
			},
			{ status: 200 },
		);
	}

	return proxy(request);
}

export async function PUT(request: Request) {
	// Require a bearer token so the route is never accessible without auth.
	const authorization = request.headers.get("authorization");
	if (!authorization?.startsWith("Bearer ")) {
		return NextResponse.json({ error: "missing_auth" }, { status: 401 });
	}

	let body: unknown;
	try {
		body = await request.json();
	} catch {
		return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
	}

	if (
		!body ||
		typeof body !== "object" ||
		!("dailyLimit" in body) ||
		!("transactionLimit" in body)
	) {
		return NextResponse.json(
			{ error: "Missing required fields: dailyLimit, transactionLimit" },
			{ status: 400 },
		);
	}

	const { dailyLimit, transactionLimit } = body as Record<string, unknown>;
	if (
		typeof dailyLimit !== "number" ||
		!Number.isFinite(dailyLimit) ||
		typeof transactionLimit !== "number" ||
		!Number.isFinite(transactionLimit)
	) {
		return NextResponse.json(
			{ error: "dailyLimit and transactionLimit must be finite numbers" },
			{ status: 400 },
		);
	}

	if (dailyLimit < 1 || transactionLimit < 1) {
		return NextResponse.json({ error: "Limits must be at least 1" }, { status: 400 });
	}
	if (dailyLimit > 1000000 || transactionLimit > 1000000) {
		return NextResponse.json(
			{ error: "Limits must not exceed 1,000,000" },
			{ status: 400 },
		);
	}

	return proxy(request, {
		method: "PUT",
		body: JSON.stringify({ dailyLimit, transactionLimit }),
	});
}