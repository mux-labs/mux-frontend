import { NextResponse } from "next/server";
import { getApiBaseUrl, getApiKey } from "@/lib/api/config";
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

	// --- Mock fallback (no NEXT_PUBLIC_API_URL set) ---
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
