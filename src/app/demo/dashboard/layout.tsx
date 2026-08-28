import type { Metadata } from "next";
import "../../globals.css";
import { DashboardLayout } from "@/components/layouts/DashboardLayout";

export const metadata: Metadata = {
	title: "Dashboard Demo",
	description: "Relocated dashboard implementation",
};

export default function DashboardDemoLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	// Demo tree renders mock data with no authenticated session — never
	// gate it behind AuthGuard (issue #623).
	return <DashboardLayout requireAuth={false}>{children}</DashboardLayout>;
}
