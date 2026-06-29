import { NextResponse } from "next/server";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface SpendingLimitsData {
	dailyLimit: number;
	transactionLimit: number;
}

export interface SpendingLimitsResponse {
	limits: SpendingLimitsData;
	todayUsage: number;
}

// ---------------------------------------------------------------------------
// In-memory store (will be replaced by a database in production)
// ---------------------------------------------------------------------------

let spendingLimitsStore: SpendingLimitsData = {
	dailyLimit: 5000,
	transactionLimit: 1000,
};

// ---------------------------------------------------------------------------
// GET /api/spending-limits
// ---------------------------------------------------------------------------

export async function GET() {
	const todayUsage = 750;

	return NextResponse.json<SpendingLimitsResponse>({
		limits: spendingLimitsStore,
		todayUsage,
	});
}

// ---------------------------------------------------------------------------
// PUT /api/spending-limits
// ---------------------------------------------------------------------------

export async function PUT(request: Request) {
	try {
		const body: unknown = await request.json();

		if (
			!body ||
			typeof body !== "object" ||
			!("dailyLimit" in (body as Record<string, unknown>)) ||
			!("transactionLimit" in (body as Record<string, unknown>))
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
			return NextResponse.json(
				{ error: "Limits must be at least 1" },
				{ status: 400 },
			);
		}

		if (dailyLimit > 1000000 || transactionLimit > 1000000) {
			return NextResponse.json(
				{ error: "Limits must not exceed 1,000,000" },
				{ status: 400 },
			);
		}

		spendingLimitsStore = { dailyLimit, transactionLimit };

		return NextResponse.json<SpendingLimitsResponse>({
			limits: spendingLimitsStore,
			todayUsage: 750,
		});
	} catch {
		return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
	}
}
