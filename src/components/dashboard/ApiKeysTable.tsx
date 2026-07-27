"use client";

import { Key, Shield, ShieldOff } from "lucide-react";
import { useEffect, useState } from "react";
import APIKeyModal from "@/components/APIKeyModal";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmRevokeDialog } from "@/components/ui/ConfirmRevokeDialog";
import { CopyButton } from "@/components/ui/CopyButton";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { useApiKeys } from "@/hooks/useApiKeys";
import { useRevokeApiKey } from "@/hooks/useRevokeApiKey";
import { createApiKey } from "@/lib/api/index";
import { cn } from "@/lib/utils";
import type { ApiKey, CreatedApiKey } from "@/mock-data/api-keys";

interface ApiKeysTableProps {
	/** Override keys list for focused component tests and storybook. */
	initialKeys?: ApiKey[];
}

function toTableApiKey({ secret: _secret, ...apiKey }: CreatedApiKey): ApiKey {
	return apiKey;
}

export function ApiKeysTable({ initialKeys }: ApiKeysTableProps) {
	const usesFetchedData = initialKeys === undefined;
	const fetchedKeys = useApiKeys(usesFetchedData);
	const revokeApiKey = useRevokeApiKey();
	const [keys, setKeys] = useState<ApiKey[]>(initialKeys ?? []);
	const [pendingRevokeId, setPendingRevokeId] = useState<string | null>(null);
	const [isModalOpen, setIsModalOpen] = useState(false);
	const [statusFilter, setStatusFilter] = useState<
		"all" | "Active" | "Revoked"
	>("all");

	useEffect(() => {
		if (usesFetchedData && fetchedKeys.data) {
			setKeys(fetchedKeys.data);
		}
	}, [fetchedKeys.data, usesFetchedData]);

	const pendingKey = keys.find((key) => key.id === pendingRevokeId);
	const filteredKeys =
		statusFilter === "all"
			? keys
			: keys.filter((key) => key.status === statusFilter);

	const handleCreateKey = async (name: string) => {
		if (!usesFetchedData) {
			const secret = `mux_sk_${Date.now()}`;
			const newKey: CreatedApiKey = {
				id: `key-${Date.now()}`,
				name,
				key: `${secret.slice(0, 8)}••••${secret.slice(-4)}`,
				secret,
				status: "Active",
				createdAt: new Date().toISOString(),
			};
			setKeys((currentKeys) => [toTableApiKey(newKey), ...currentKeys]);
			return newKey;
		}

		const newKey = await createApiKey(name);
		setKeys((currentKeys) => [toTableApiKey(newKey), ...currentKeys]);
		return newKey;
	};

	const handleKeyCreated = (newKey: CreatedApiKey) => {
		const tableKey = toTableApiKey(newKey);
		setKeys((currentKeys) =>
			currentKeys.some((key) => key.id === tableKey.id)
				? currentKeys
				: [tableKey, ...currentKeys],
		);
	};

	const handleConfirmRevoke = async () => {
		if (!pendingRevokeId) return;

		if (!usesFetchedData) {
			setKeys((currentKeys) =>
				currentKeys.map((key) =>
					key.id === pendingRevokeId
						? { ...key, status: "Revoked" as const }
						: key,
				),
			);
			setPendingRevokeId(null);
			return;
		}

		const revoked = await revokeApiKey.revoke(pendingRevokeId);
		if (revoked) {
			setKeys((currentKeys) =>
				currentKeys.map((key) => (key.id === revoked.id ? revoked : key)),
			);
			setPendingRevokeId(null);
		}
	};

	const renderKeyRows = () => (
		<Table aria-label="API keys">
			<caption className="sr-only">
				List of API keys with masked secret values, status, and creation date
			</caption>
			<TableHeader className="bg-zinc-50/50 dark:bg-zinc-900/50">
				<TableRow>
					<TableHead className="w-[200px] pl-6">Name</TableHead>
					<TableHead>Secret Key</TableHead>
					<TableHead>Status</TableHead>
					<TableHead>Created</TableHead>
					<TableHead className="text-right pr-6">Action</TableHead>
				</TableRow>
			</TableHeader>
			<TableBody>
				{filteredKeys.map((apiKey) => (
					<TableRow key={apiKey.id} className="group transition-colors">
						<TableCell className="pl-6 font-medium text-zinc-900 dark:text-zinc-100">
							{apiKey.name}
						</TableCell>
						<TableCell>
							<div className="flex w-fit items-center gap-2 rounded bg-zinc-100 px-2 py-1 font-mono text-xs text-zinc-500 dark:bg-zinc-900/50 dark:text-zinc-400">
								<span>{apiKey.key}</span>
								<CopyButton
									text={apiKey.key}
									type="key"
									iconOnly
									size="sm"
									className="h-6 w-6 p-0"
									successMessage="API key copied"
									data-testid={`copy-key-${apiKey.id}`}
								/>
							</div>
						</TableCell>
						<TableCell>
							<Badge
								variant={apiKey.status === "Active" ? "default" : "outline"}
								className={cn(
									"gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold",
									apiKey.status === "Active"
										? "border-green-200 bg-green-50 text-green-700 dark:border-green-500/20 dark:bg-green-500/10 dark:text-green-400"
										: "border-zinc-200 bg-zinc-50 text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-500",
								)}
							>
								{apiKey.status === "Active" ? (
									<Shield className="size-3" />
								) : (
									<ShieldOff className="size-3" />
								)}
								{apiKey.status}
							</Badge>
						</TableCell>
						<TableCell className="text-zinc-500 dark:text-zinc-400">
							{new Date(apiKey.createdAt).toLocaleDateString()}
						</TableCell>
						<TableCell className="pr-6 text-right">
							{apiKey.status === "Active" ? (
								<Button
									variant="ghost"
									size="sm"
									className="h-8 rounded-lg px-3 text-zinc-500 hover:text-red-600 dark:hover:text-red-400"
									onClick={() => setPendingRevokeId(apiKey.id)}
									data-testid={`revoke-btn-${apiKey.id}`}
								>
									Revoke
								</Button>
							) : (
								<span className="pr-1 text-xs text-zinc-400 dark:text-zinc-600">
									Revoked
								</span>
							)}
						</TableCell>
					</TableRow>
				))}
			</TableBody>
		</Table>
	);

	return (
		<>
			<ConfirmRevokeDialog
				open={Boolean(pendingRevokeId && pendingKey)}
				keyLabel={pendingKey?.name}
				isPending={revokeApiKey.loading}
				onConfirm={handleConfirmRevoke}
				onCancel={() => setPendingRevokeId(null)}
			/>

			<APIKeyModal
				isOpen={isModalOpen}
				onClose={() => setIsModalOpen(false)}
				onCreateKey={handleCreateKey}
				onKeyCreated={handleKeyCreated}
			/>

			<div className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
				<div className="flex flex-col gap-4 border-b border-zinc-200 p-6 dark:border-zinc-800 sm:flex-row sm:items-center sm:justify-between">
					<div className="flex items-center gap-3">
						<div className="rounded-lg bg-zinc-100 p-2 dark:bg-zinc-900">
							<Key className="size-5 text-zinc-600 dark:text-zinc-400" />
						</div>
						<div>
							<h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
								API Keys
							</h2>
							<p className="text-sm text-zinc-500 dark:text-zinc-400">
								Manage your application keys and masked secrets
							</p>
						</div>
					</div>
					<Button
						size="sm"
						className="rounded-full px-4"
						onClick={() => setIsModalOpen(true)}
						data-testid="create-key-btn"
					>
						Create new key
					</Button>
				</div>

				<div
					className="flex items-center gap-1 overflow-x-auto border-b border-zinc-200 px-6 py-3 dark:border-zinc-800"
					role="group"
					aria-label="Filter by status"
				>
					{(["all", "Active", "Revoked"] as const).map((filter) => (
						<button
							key={filter}
							type="button"
							onClick={() => setStatusFilter(filter)}
							aria-pressed={statusFilter === filter}
							className={cn(
								"rounded-full px-3 py-1 text-xs font-medium transition-colors",
								statusFilter === filter
									? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
									: "text-zinc-500 hover:bg-zinc-100 hover:text-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-200",
							)}
						>
							{filter === "all" ? "All" : filter}
						</button>
					))}
				</div>

				{usesFetchedData && fetchedKeys.loading ? (
					<div
						className="space-y-3 p-6"
						role="status"
						aria-label="Loading API keys"
					>
						{[0, 1, 2].map((row) => (
							<div
								key={row}
								className="h-12 animate-pulse rounded-lg bg-zinc-100 dark:bg-zinc-900"
							/>
						))}
					</div>
				) : usesFetchedData && fetchedKeys.error ? (
					<div className="p-6">
						<ErrorState
							title="Unable to load API keys"
							description={fetchedKeys.error.message}
							retry={{ label: "Retry", onRetry: fetchedKeys.refetch }}
						/>
					</div>
				) : revokeApiKey.error ? (
					<div className="p-6">
						<ErrorState
							title="Unable to revoke API key"
							description={revokeApiKey.error.message}
							retry={{
								label: "Dismiss",
								onRetry: () => {
									revokeApiKey.reset();
									setPendingRevokeId(null);
								},
							}}
						/>
					</div>
				) : keys.length === 0 ? (
					<div className="p-6">
						<EmptyState
							icon={
								<Key className="h-10 w-10 text-zinc-400 dark:text-zinc-500" />
							}
							title="No API keys yet"
							description="Create your first API key to start integrating with the Mux Protocol."
							action={{
								label: "Create new key",
								onClick: () => setIsModalOpen(true),
							}}
						/>
					</div>
				) : filteredKeys.length === 0 ? (
					<div className="p-6">
						<EmptyState
							icon={
								<Key className="h-10 w-10 text-zinc-400 dark:text-zinc-500" />
							}
							title={`No ${statusFilter} keys`}
							description={`You have no ${statusFilter.toLowerCase()} API keys.`}
						/>
					</div>
				) : (
					renderKeyRows()
				)}
			</div>
		</>
	);
}
