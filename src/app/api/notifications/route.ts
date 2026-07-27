import { NextResponse } from "next/server";
import { dummyNotifications } from "@/mock-data/notifications";

export async function GET() {
	return NextResponse.json(dummyNotifications);
}
