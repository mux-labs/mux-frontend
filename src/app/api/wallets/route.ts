import { NextResponse } from "next/server";
import {
	getApiBaseUrl,
	getApiKey,
	isMockFallbackAllowed,
} from "@/lib/api/config";
import { dummyWallets } from "@/mock-data/wallets";

const VALID_ACCESS_TOKEN = "mock-access-token";

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
			const apiKey = getApiKey();
			const upstream = await fetch(
				`${backendUrl}/wallets?${searchParams.toString()}`,
				{
					headers: {
						"content-type": "application/json",
						authorization,
						...(apiKey ? { "x-api-key": apiKey } : {}),
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
