import { NextResponse } from "next/server";
import { getApiBaseUrl, getApiKey } from "@/lib/api/config";
import { mockTransactions } from "@/mock-data/transactions";

/**
 * GET /api/transactions
 *
 * Proxies transaction history to the configured backend
 * (NEXT_PUBLIC_API_URL or legacy aliases), forwarding query params such as
 * `address` and `network`. If no backend URL is set, falls back to mock
 * data filtered locally so local development / demo still honors filters.
 */
export async function GET(request: Request) {
	const { searchParams } = new URL(request.url);
	const backendUrl = getApiBaseUrl();

	if (backendUrl) {
		try {
			const apiKey = getApiKey();
			const upstream = await fetch(
				`${backendUrl}/transactions?${searchParams.toString()}`,
				{
					headers: {
						"content-type": "application/json",
						...(apiKey ? { "x-api-key": apiKey } : {}),
						...(request.headers.get("authorization")
							? {
									authorization: request.headers.get(
										"authorization",
									) as string,
								}
							: {}),
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
				{ error: "Unable to reach transactions service" },
				{ status: 502 },
			);
		}
	}

	// --- Mock fallback (no NEXT_PUBLIC_API_URL set) ---
	const address = searchParams.get("address")?.trim();
	const network = searchParams.get("network");

	let filtered = mockTransactions;
	if (address) {
		filtered = filtered.filter(
			(tx) => tx.from === address || tx.to === address,
		);
	}
	if (network === "mainnet" || network === "testnet") {
		filtered = filtered.filter((tx) => tx.network === network);
	}

	return NextResponse.json(filtered);
}
