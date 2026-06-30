import { NextResponse } from "next/server";
import { mockApiKeys } from "@/mock-data/api-keys";

export async function GET() {
	// In real integration, replace with DB or upstream service call.
	return NextResponse.json({ data: mockApiKeys });
}
