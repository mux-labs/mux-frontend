import { NextResponse } from "next/server";
import { mockTransactions } from "@/mock-data/transactions";

export async function GET() {
	return NextResponse.json(mockTransactions);
}
