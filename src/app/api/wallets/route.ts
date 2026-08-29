import { NextResponse } from "next/server";
import {
	getApiBaseUrl,
	getUpstreamAuthHeaders,
	isMockFallbackAllowed,
} from "@/lib/api/config";
import { dummyWallets } from "@/mock-data/wallets";
import type { Wallet, WalletNetwork } from "@/types/wallet";

const VALID_ACCESS_TOKEN = "mock-access-token";

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

/**
 * GET /api/wallets
 *
 * Proxies the wallet list to the configured backend (NEXT_PUBLIC_API_URL or
 * legacy aliases), forwarding the caller's bearer token and query params
 * (e.g. `network`). If no backend URL is set, falls back to a mock
 * implementation (with the legacy mock bearer check) so local development /
 * demo still works without a running API server.
 *
 * In a production build (`NODE_ENV=production`) the mock fallback never
 * runs — a missing backend URL there means the deployment is misconfigured,
 * so we fail loudly with a 503 instead of silently serving fabricated
 * wallets and accepting the mock bearer token as valid auth. See
 * `isMockFallbackAllowed()`.
 */
export async function GET(request: Request) {
	const authorization = request.headers.get("authorization");
	if (!authorization?.startsWith("Bearer ")) {
		return NextResponse.json({ error: "missing_auth" }, { status: 401 });
	}

	const { searchParams } = new URL(request.url);
	const backendUrl = getApiBaseUrl();

	if (backendUrl) {
		try {
			const upstream = await fetch(
				`${backendUrl}/wallets?${searchParams.toString()}`,
				{
					headers: {
						"content-type": "application/json",
						authorization,
						...getUpstreamAuthHeaders(),
					},
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
		return NextResponse.json(
			{
				error: "backend_unavailable",
				message:
					"No wallets backend is configured for this production deployment. Set NEXT_PUBLIC_API_URL.",
			},
			{ status: 503 },
		);
	}

	// --- Mock fallback (no NEXT_PUBLIC_API_URL set, non-production only) ---
	const token = authorization.slice("Bearer ".length).trim();
	if (token !== VALID_ACCESS_TOKEN) {
		return NextResponse.json({ error: "invalid_token" }, { status: 401 });
	}

	const network = searchParams.get("network");
	if (network === "mainnet" || network === "testnet") {
		return NextResponse.json(
			dummyWallets.filter((wallet) => wallet.network === network),
		);
	}

	return NextResponse.json(dummyWallets);
}

function generateMockWalletId(): string {
	return `wallet-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

/**
 * POST /api/wallets
 *
 * Proxies wallet creation to the configured backend so added wallets persist
 * server-side (previously `AddWalletModal` only faked a delay and callers
 * kept the result in local React state, which was lost on refresh). Falls
 * back to appending to the in-memory mock when no backend URL is
 * configured, same as GET.
 */
export async function POST(request: Request) {
	const authorization = request.headers.get("authorization");
	if (!authorization?.startsWith("Bearer ")) {
		return NextResponse.json({ error: "missing_auth" }, { status: 401 });
	}

	let body: unknown;
	try {
		body = await request.json();
	} catch {
		return NextResponse.json({ error: "invalid_json" }, { status: 400 });
	}

	const address =
		typeof body === "object" && body !== null && "address" in body
			? (body as { address: unknown }).address
			: undefined;
	const network =
		typeof body === "object" && body !== null && "network" in body
			? (body as { network: unknown }).network
			: undefined;
	const label =
		typeof body === "object" && body !== null && "label" in body
			? (body as { label: unknown }).label
			: undefined;

	if (typeof address !== "string" || !address.trim()) {
		return NextResponse.json({ error: "address_required" }, { status: 400 });
	}
	if (network !== "mainnet" && network !== "testnet") {
		return NextResponse.json({ error: "invalid_network" }, { status: 400 });
	}
	if (label !== undefined && typeof label !== "string") {
		return NextResponse.json({ error: "invalid_label" }, { status: 400 });
	}

	const backendUrl = getApiBaseUrl();

	if (backendUrl) {
		try {
			const upstream = await fetch(`${backendUrl}/wallets`, {
				method: "POST",
				headers: {
					"content-type": "application/json",
					authorization,
					...getUpstreamAuthHeaders(),
				},
				body: JSON.stringify({ address: address.trim(), network, label }),
			});

			const data = await upstream.json().catch(() => ({}));

			if (!upstream.ok) {
				return NextResponse.json(data, { status: upstream.status });
			}

			return NextResponse.json(data, { status: 201 });
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
	const token = authorization.slice("Bearer ".length).trim();
	if (token !== VALID_ACCESS_TOKEN) {
		return NextResponse.json({ error: "invalid_token" }, { status: 401 });
	}

	const trimmedLabel = typeof label === "string" ? label.trim() : "";
	const wallet: Wallet = {
		id: generateMockWalletId(),
		address: address.trim(),
		label: trimmedLabel || undefined,
		network: network as WalletNetwork,
		status: "pending",
		createdAt: new Date(),
	};

	dummyWallets.unshift(wallet);
	return NextResponse.json(wallet, { status: 201 });
}
