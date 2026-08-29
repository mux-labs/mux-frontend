import { NextResponse } from "next/server";
import { getApiBaseUrl, getUpstreamAuthHeaders, isMockFallbackAllowed } from "@/lib/api/config";
import { appendAuditLog, getAuditLog } from "@/lib/audit/log";
import { mockTransactions } from "@/mock-data/transactions";
import type { Transaction } from "@/types/transaction";

/**
 * Transform mock transaction data into activity items expected by RecentActivityFeed.
 * This mapping is only used as a local/dev fallback when no backend is
 * configured — see GET() below. In production the activity feed is sourced
 * from the backend's real SDK/event stream, not this heuristic.
 */
function mapTransactionToActivity(tx: Transaction) {
	// Determine activity type based on transaction status and direction (simplified)
	const type =
		tx.from === "GBZXN7PIRZGNMHGA7MUUUF4GWPY5AYPV6LY4UV2GL6VJGIQRXFDNMADI"
			? "wallet_created"
			: "transaction";

	return {
		id: tx.hash,
		type,
		description: `${tx.from.slice(0, 4)} → ${tx.to.slice(0, 4)}: ${tx.amountXlm} XLM`,
		timestamp: tx.createdAt,
		network: tx.network,
		status:
			tx.status === "completed"
				? "success"
				: tx.status === "pending"
					? "pending"
					: "error",
	};
}

/**
 * GET /api/activity
 *
 * Proxies to the configured backend's real activity/event feed
 * (NEXT_PUBLIC_API_URL or legacy aliases). If no backend URL is set, falls
 * back to a heuristic derived from mock transactions so local development
 * works without a running API server.
 */
export async function GET() {
	const backendUrl = getApiBaseUrl();

	if (backendUrl) {
		// Real path: the backend derives activity items from actual on-chain
		// SDK/events rather than a client-side heuristic over mock data.
		try {
			const upstream = await fetch(`${backendUrl}/activity`, {
				headers: {
					"content-type": "application/json",
					...getUpstreamAuthHeaders(),
				},
				cache: "no-store",
			});

			const data = await upstream.json().catch(() => null);

			if (!upstream.ok || data === null) {
				return NextResponse.json(
					{ error: "Unable to load activity feed from the backend" },
					{ status: upstream.status || 502 },
				);
			}

			return NextResponse.json(data);
		} catch {
			return NextResponse.json(
				{ error: "Unable to reach the activity backend" },
				{ status: 502 },
			);
		}
	}

	if (!isMockFallbackAllowed()) {
		return NextResponse.json(
			{
				error: "backend_unavailable",
				message:
					"No activity backend is configured for this production deployment. Set NEXT_PUBLIC_API_URL.",
			},
			{ status: 503 },
		);
	}

	// --- Mock fallback (no NEXT_PUBLIC_API_URL set, non-production only) ---
	// Synthesizes activity items from mock transaction data and records them
	// into the in-memory audit log; used for local dev / CI only when no
	// backend is configured. See src/lib/audit/log.ts.
	if (getAuditLog().length === 0) {
		for (const activity of mockTransactions.map(mapTransactionToActivity)) {
			appendAuditLog(activity);
		}
	}

	return NextResponse.json({ data: getAuditLog() });
}
