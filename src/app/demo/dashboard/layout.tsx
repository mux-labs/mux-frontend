import type { Metadata } from "next";
import { Inter } from "next/font/google";
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
	return <DashboardLayout>{children}</DashboardLayout>;
}
