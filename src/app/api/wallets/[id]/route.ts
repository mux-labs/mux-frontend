import { NextResponse } from "next/server";
import {
	getApiBaseUrl,
	getApiKey,
	isMockFallbackAllowed,
} from "@/lib/api/config";
import { dummyWallets } from "@/mock-data/wallets";

/** 503 returned instead of mock data when no backend is configured in production. */
function backendUnavailableResponse() {
	return NextResponse.json(
		{
			error: "backend_unavailable",
			message:
				"No wallets backend is configured for this production deployment. Set NEXT_PUBLIC_API_URL.",
		},
		{ status: 503 },
	);
}

type RouteContext = {
	params:
		| {
				id: string;
		  }
		| Promise<{
				id: string;
		  }>;
};

function backendHeaders(request: Request) {
	const apiKey = getApiKey();
	const authorization = request.headers.get("authorization");
	return {
		"content-type": "application/json",
		...(apiKey ? { "x-api-key": apiKey } : {}),
		...(authorization ? { authorization } : {}),
	};
}

/**
 * GET /api/wallets/[id]
 *
 * Proxies a single wallet to the configured backend (NEXT_PUBLIC_API_URL or
 * legacy aliases). Falls back to the in-memory mock when no backend URL is
 * configured so local development / demo still works.
 */
export async function GET(request: Request, { params }: RouteContext) {
	const { id } = await params;
	const walletId = id.trim();
	const backendUrl = getApiBaseUrl();

	if (backendUrl) {
		try {
			const upstream = await fetch(
				`${backendUrl}/wallets/${encodeURIComponent(walletId)}`,
				{
					headers: backendHeaders(request),
					cache: "no-store",
				},
			);

			const data = await upstream.json().catch(() => ({}));

			if (!upstream.ok) {
				return NextResponse.json(data, { status: upstream.status });
			}

			return NextResponse.json(data, { status: 200 });
		} catch {
			return NextResponse.json(
				{ error: "Unable to reach wallets service" },
				{ status: 502 },
			);
		}
	}

	if (!isMockFallbackAllowed()) {
		return backendUnavailableResponse();
	}

	// --- Mock fallback (no NEXT_PUBLIC_API_URL set, non-production only) ---
	const wallet = dummyWallets.find((candidate) => candidate.id === walletId);

	if (!wallet) {
		return NextResponse.json({ error: "not_found" }, { status: 404 });
	}

	return NextResponse.json(wallet);
}

/**
 * PATCH /api/wallets/[id]
 *
 * Proxies label/archive updates to the configured backend. Falls back to
 * mutating the in-memory mock when no backend URL is configured.
 */
export async function PATCH(request: Request, { params }: RouteContext) {
	const { id } = await params;
	const walletId = id.trim();

	let body: unknown;
	try {
		body = await request.json();
	} catch {
		return NextResponse.json({ error: "invalid_json" }, { status: 400 });
	}

	const backendUrl = getApiBaseUrl();

	if (backendUrl) {
		try {
			const upstream = await fetch(
				`${backendUrl}/wallets/${encodeURIComponent(walletId)}`,
				{
					method: "PATCH",
					headers: backendHeaders(request),
					body: JSON.stringify(body),
				},
			);

			const data = await upstream.json().catch(() => ({}));

			if (!upstream.ok) {
				return NextResponse.json(data, { status: upstream.status });
			}

			return NextResponse.json(data, { status: 200 });
		} catch {
			return NextResponse.json(
				{ error: "Unable to reach wallets service" },
				{ status: 502 },
			);
		}
	}

	if (!isMockFallbackAllowed()) {
		return backendUnavailableResponse();
	}

	// --- Mock fallback (no NEXT_PUBLIC_API_URL set, non-production only) ---
	const wallet = dummyWallets.find((candidate) => candidate.id === walletId);
	if (!wallet) {
		return NextResponse.json({ error: "not_found" }, { status: 404 });
	}

	const hasArchived =
		typeof body === "object" && body !== null && "archived" in body;
	if (hasArchived) {
		const archived = (body as { archived: unknown }).archived;
		if (typeof archived !== "boolean") {
			return NextResponse.json({ error: "invalid_archived" }, { status: 400 });
		}
		wallet.archived = archived;
		return NextResponse.json(wallet);
	}

	const label =
		typeof body === "object" && body !== null && "label" in body
			? (body as { label: unknown }).label
			: undefined;
	if (typeof label !== "string") {
		return NextResponse.json({ error: "label_required" }, { status: 400 });
	}

	const normalized = label.trim();
	if (normalized.length > 30 || /[<>"'&]/.test(normalized)) {
		return NextResponse.json({ error: "invalid_label" }, { status: 422 });
	}

	wallet.label = normalized || undefined;
	return NextResponse.json(wallet);
}
