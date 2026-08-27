import { NextResponse } from "next/server";
import { getApiBaseUrl, getApiKey } from "@/lib/api/config";
import { isValidStellarAddress } from "@/utils/addressValidation";

/**
 * POST /api/send/draft
 *
 * Backend wiring for the send-flow draft step (issue #616).
 *
 * The draft step takes a `{ destination, amount }` pair and asks the backend
 * to validate it and return a preview (normalized destination, fee, arrival
 * estimate) before the user commits to the full send in `SendWalletModal`.
 *
 * Production vs demo/mock split:
 *   - When a backend URL is configured (`NEXT_PUBLIC_API_URL` / aliases), the
 *     request is proxied to `${backend}/send/draft`. Upstream errors are
 *     surfaced verbatim; a network failure is a 502.
 *   - When no backend URL is configured AND the app is NOT running a
 *     production build, a local mock preview is returned so `pnpm dev` / CI
 *     work offline.
 *   - When no backend URL is configured in a production build, the route
 *     fails with 501 — there is deliberately NO silent mock success in
 *     production.
 */

export interface SendDraftRequest {
	destination: string;
	amount: string;
	/** Optional source wallet id / address, forwarded to the backend. */
	walletId?: string;
	network?: "testnet" | "mainnet";
}

export interface SendDraftPreview {
	valid: true;
	destination: string;
	amount: string;
	/** Estimated network fee in XLM. */
	fee: string;
	/** Human-readable arrival estimate. */
	estimatedArrival: string;
	/** True when the mock fallback produced this preview (never in production). */
	mock?: boolean;
}

function badRequest(error: string) {
	return NextResponse.json({ error }, { status: 400 });
}

export async function POST(request: Request) {
	let body: Partial<SendDraftRequest>;
	try {
		body = (await request.json()) as Partial<SendDraftRequest>;
	} catch {
		return badRequest("Invalid request body");
	}

	const destination = body.destination?.trim() ?? "";
	const amount = body.amount?.trim() ?? "";

	if (!destination) {
		return badRequest("Destination address is required.");
	}
	if (!amount) {
		return badRequest("Amount is required.");
	}

	const parsedAmount = Number.parseFloat(amount);
	if (Number.isNaN(parsedAmount) || parsedAmount <= 0) {
		return badRequest("Enter a positive amount.");
	}

	const backendUrl = getApiBaseUrl();

	if (backendUrl) {
		try {
			const apiKey = getApiKey();
			const authorization = request.headers.get("authorization");
			const upstream = await fetch(`${backendUrl}/send/draft`, {
				method: "POST",
				headers: {
					"content-type": "application/json",
					...(apiKey ? { "x-api-key": apiKey } : {}),
					...(authorization ? { authorization } : {}),
				},
				body: JSON.stringify({
					destination,
					amount,
					walletId: body.walletId,
					network: body.network,
				}),
				cache: "no-store",
			});

			const data = await upstream.json().catch(() => ({}));

			if (!upstream.ok) {
				return NextResponse.json(data, { status: upstream.status });
			}

			return NextResponse.json(data, { status: 200 });
		} catch {
			return NextResponse.json(
				{ error: "Unable to reach the send service." },
				{ status: 502 },
			);
		}
	}

	// --- No backend configured ---

	if (process.env.NODE_ENV === "production") {
		// Never fabricate a successful send draft in production.
		return NextResponse.json(
			{
				error:
					"Send service is not configured. Set NEXT_PUBLIC_API_URL to a mux-backend URL.",
			},
			{ status: 501 },
		);
	}

	// --- Mock fallback (local dev / CI only) ---
	if (!isValidStellarAddress(destination)) {
		return badRequest(
			"Enter a valid Stellar address (starts with G, 56 characters).",
		);
	}

	const preview: SendDraftPreview = {
		valid: true,
		destination,
		amount,
		fee: "0.00001",
		estimatedArrival: "a few seconds",
		mock: true,
	};

	return NextResponse.json(preview, { status: 200 });
}
