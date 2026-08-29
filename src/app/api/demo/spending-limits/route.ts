import { NextResponse } from "next/server";
import type {
	SpendingLimitsData,
	SpendingLimitsResponse,
} from "@/app/api/spending-limits/route";
import { computeTodayUsage } from "@/lib/spending-limits/todayUsage";
import { mockTransactions } from "@/mock-data/transactions";

let spendingLimitsStore: SpendingLimitsData = {
	dailyLimit: 5000,
	transactionLimit: 1000,
};

/**
 * Demo-only usage figure, derived from the mock transaction store so it
 * reflects actual (fake) activity instead of a fixed constant. The real
 * dashboard gets `todayUsage` from mux-backend via `/api/spending-limits`.
 */
function demoTodayUsage(): number {
	return computeTodayUsage(mockTransactions);
}

export async function GET() {
	return NextResponse.json<SpendingLimitsResponse>({
		limits: spendingLimitsStore,
		todayUsage: demoTodayUsage(),
	});
}

export async function PUT(request: Request) {
	try {
		const body = (await request.json()) as Partial<SpendingLimitsData>;
		if (
			typeof body.dailyLimit !== "number" ||
			!Number.isFinite(body.dailyLimit) ||
			typeof body.transactionLimit !== "number" ||
			!Number.isFinite(body.transactionLimit) ||
			body.dailyLimit < 1 ||
			body.transactionLimit < 1 ||
			body.dailyLimit > 1000000 ||
			body.transactionLimit > 1000000
		) {
			return NextResponse.json(
				{ error: "Invalid spending limits" },
				{ status: 400 },
			);
		}

		spendingLimitsStore = {
			dailyLimit: body.dailyLimit,
			transactionLimit: body.transactionLimit,
		};
		return NextResponse.json<SpendingLimitsResponse>({
			limits: spendingLimitsStore,
			todayUsage: demoTodayUsage(),
		});
	} catch {
		return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
	}
}
