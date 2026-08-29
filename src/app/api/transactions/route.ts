import { NextResponse } from "next/server";
import { getApiBaseUrl, getApiKey } from "@/lib/api/config";
import { canUseMockFallback } from "@/lib/api/runtimeMode";
import { mockTransactions } from "@/mock-data/transactions";
import type { Transaction, TransactionNetwork } from "@/types/transaction";
import { isValidStellarAddress } from "@/utils/addressValidation";

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
 * GET /api/transactions
 *
 * Proxies transaction history to the configured backend
 * (NEXT_PUBLIC_API_URL or legacy aliases), forwarding query params such as
 * `address` and `network`. If no backend URL is set, falls back to mock
 * data filtered locally so local development / demo still honors filters.
 *
 * The mock fallback never runs in a production build (`NODE_ENV=production`):
 * a missing backend URL there is a misconfiguration, so we return a 503
 * instead of silently serving fabricated transaction history. See
 * `canUseMockFallback()`.
 */
export async function GET(request: Request) {
	const { searchParams } = new URL(request.url);
	const backendUrl = getApiBaseUrl();

	if (backendUrl) {
		try {
			const upstream = await fetch(
				`${backendUrl}/transactions?${searchParams.toString()}`,
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
				{ error: "Unable to reach transactions service" },
				{ status: 502 },
			);
		}
	}

	// --- Mock fallback (no NEXT_PUBLIC_API_URL set, non-production only) ---
	if (!canUseMockFallback()) {
		return NextResponse.json(
			{
				error: "backend_unavailable",
				message:
					"No transactions backend is configured for this production deployment. Set NEXT_PUBLIC_API_URL.",
			},
			{ status: 503 },
		);
	}

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

interface CreateTransactionBody {
	from?: string;
	to?: string;
	amountXlm?: string;
	memo?: string;
	network?: TransactionNetwork;
}

function randomHash(): string {
	const bytes = new Uint8Array(32);
	crypto.getRandomValues(bytes);
	return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * POST /api/transactions
 *
 * Submits a new send transaction to the configured backend
 * (NEXT_PUBLIC_API_URL or legacy aliases). If no backend URL is set, falls
 * back to appending a synthetic pending transaction to the in-memory mock
 * store so local development / demo still works without a running API.
 */
export async function POST(request: Request) {
	const body = (await request
		.json()
		.catch(() => null)) as CreateTransactionBody | null;

	const to = body?.to?.trim();
	const amountXlm = body?.amountXlm?.trim();
	const network = body?.network;

	if (!to || !isValidStellarAddress(to)) {
		return NextResponse.json(
			{ error: "A valid destination address is required" },
			{ status: 400 },
		);
	}

	const parsedAmount = amountXlm ? Number.parseFloat(amountXlm) : Number.NaN;
	if (!amountXlm || Number.isNaN(parsedAmount) || parsedAmount <= 0) {
		return NextResponse.json(
			{ error: "A positive amount is required" },
			{ status: 400 },
		);
	}

	if (network !== "mainnet" && network !== "testnet") {
		return NextResponse.json(
			{ error: "A valid network (mainnet or testnet) is required" },
			{ status: 400 },
		);
	}

	const from = body?.from?.trim();
	const memo = body?.memo?.trim() || undefined;
	const backendUrl = getApiBaseUrl();

	if (backendUrl) {
		try {
			const upstream = await fetch(`${backendUrl}/transactions`, {
				method: "POST",
				headers: backendHeaders(request),
				body: JSON.stringify({ from, to, amountXlm, memo, network }),
			});

			const data = await upstream.json().catch(() => ({}));

			if (!upstream.ok) {
				return NextResponse.json(data, { status: upstream.status });
			}

			return NextResponse.json(data, { status: 201 });
		} catch {
			return NextResponse.json(
				{ error: "Unable to reach transactions service" },
				{ status: 502 },
			);
		}
	}

	// --- Mock fallback (no NEXT_PUBLIC_API_URL set) ---
	const transaction: Transaction = {
		hash: randomHash(),
		from: from && isValidStellarAddress(from) ? from : to,
		to,
		amountXlm: parsedAmount.toFixed(7),
		memo,
		ledger: mockTransactions[0] ? mockTransactions[0].ledger + 1 : 1,
		fee: "0.0000100",
		network,
		status: "pending",
		createdAt: new Date().toISOString(),
	};

	mockTransactions.unshift(transaction);

	return NextResponse.json(transaction, { status: 201 });
}
