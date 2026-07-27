import { DashboardOverview } from "@/components/dashboard/DashboardOverview";
import { RecentActivityFeed } from "@/components/dashboard/RecentActivityFeed";
import { PageHeader } from "@/components/ui/PageHeader";

export default function DashboardPage() {
	return (
		<div className="space-y-6">
			<PageHeader
				title="Dashboard"
				description="Welcome to your Mux Protocol developer console."
			/>
			<DashboardOverview />
			<RecentActivityFeed />
		</div>
	);
}
