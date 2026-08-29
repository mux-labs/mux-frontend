import Link from "next/link";
import { ApiKeyUsageAnalytics } from "@/components/dashboard/ApiKeyUsageAnalytics";
import { PageHeader } from "@/components/ui/PageHeader";

export default async function ApiKeyUsagePage({
	params,
}: {
	params: Promise<{ id: string }>;
}) {
	const { id } = await params;

	return (
		<div className="space-y-6">
			<PageHeader
				title="API Key Usage"
				description="Per-key request volume and activity"
				actions={
					<Link
						href="/dashboard/api-keys"
						className="text-sm font-medium text-blue-700 hover:underline dark:text-blue-400"
					>
						← Back to API keys
					</Link>
				}
			/>
			<ApiKeyUsageAnalytics apiKeyId={id} />
		</div>
	);
}
