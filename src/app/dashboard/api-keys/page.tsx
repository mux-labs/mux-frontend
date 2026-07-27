import { ApiKeysTable } from "@/components/dashboard/ApiKeysTable";
import { PageHeader } from "@/components/ui/PageHeader";

export default function ApiKeysPage() {
	return (
		<div className="space-y-8">
			<PageHeader
				title="API Keys"
				description="Manage API keys and developer access for your Mux account."
			/>

			<div className="grid gap-8">
				<ApiKeysTable />

				<div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
					<h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50 mb-2">
						Usage Policy
					</h3>
					<p className="text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed mb-4">
						All API keys are subject to our developer usage policy. Please
						ensure you keep your secret keys secure and never share them in
						client-side code or public repositories.
					</p>
					<a
						href="#"
						className="text-sm font-medium text-zinc-900 dark:text-zinc-50 hover:underline inline-flex items-center gap-1"
					>
						Read documentation
					</a>
				</div>
			</div>
		</div>
	);
}
