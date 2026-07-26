import { NextResponse } from "next/server";
import { mockOverview } from "@/mock-data/overview";

export async function GET() {
	return NextResponse.json({ data: mockOverview });
}
