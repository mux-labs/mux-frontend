"use client";

import { Check, Copy, Key, RefreshCw, Shield, ShieldOff } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import APIKeyModal from "@/components/APIKeyModal";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/EmptyState";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { useCopyToClipboard } from "@/hooks/useCopyToClipboard";
import { cn } from "@/lib/utils";
import { type ApiKey, mockApiKeys } from "@/mock-data/api-keys";
import { createFocusTrapHandler } from "@/utils/keyboardNavigation";

// ---------------------------------------------------------------------------
// Revoke confirmation — inline per-row
// ---------------------------------------------------------------------------
interface RevokeConfirmProps {
	keyName: string;
	onConfirm: () => void;
	onCancel: () => void;
}

function RevokeConfirm({ keyName, onConfirm, onCancel }: RevokeConfirmProps) {
	const dialogRef = useRef<HTMLDivElement>(null);
	const confirmRef = useRef<HTMLButtonElement>(null);

	useEffect(() => {
		confirmRef.current?.focus();
	}, []);

	return (
		<div
			role="alertdialog"
			aria-modal="true"
			aria-labelledby="revoke-title"
			aria-describedby="revoke-desc"
			ref={dialogRef}
			onKeyDown={(event) => {
				createFocusTrapHandler(dialogRef)(event);
				if (event.key === "Escape") {
					event.preventDefault();
					onCancel();
				}
			}}
			className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
		>
			<div className="w-full max-w-sm rounded-xl border border-zinc-200 bg-white p-6 shadow-xl dark:border-zinc-800 dark:bg-zinc-950">
				<div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30">
					<ShieldOff className="size-6 text-red-600 dark:text-red-400" />
				</div>
				<h3
					id="revoke-title"
					className="mb-1 text-base font-semibold text-zinc-900 dark:text-zinc-50"
				>
					Revoke API key?
				</h3>
				<p
					id="revoke-desc"
					className="mb-6 text-sm text-zinc-500 dark:text-zinc-400"
				>
					<span className="font-medium text-zinc-700 dark:text-zinc-300">
						{keyName}
					</span>{" "}
					will be permanently revoked. Any applications using this key will lose
					access immediately. This action cannot be undone.
				</p>
				<div className="flex justify-end gap-3">
					<Button variant="outline" size="sm" onClick={onCancel}>
						Cancel
					</Button>
					<Button
						ref={confirmRef}
						variant="destructive"
						size="sm"
						onClick={onConfirm}
						data-testid="confirm-revoke"
					>
						Revoke key
					</Button>
				</div>
			</div>
		</div>
	);
}

// ---------------------------------------------------------------------------
// Rotate confirmation — inline per-row
// ---------------------------------------------------------------------------
interface RotateConfirmProps {
	keyName: string;
	onConfirm: () => void;
	onCancel: () => void;
}

function RotateConfirm({ keyName, onConfirm, onCancel }: RotateConfirmProps) {
	const dialogRef = useRef<HTMLDivElement>(null);
	const confirmRef = useRef<HTMLButtonElement>(null);

	useEffect(() => {
		confirmRef.current?.focus();
	}, []);

	return (
		<div
			role="alertdialog"
			aria-modal="true"
			aria-labelledby="rotate-title"
			aria-describedby="rotate-desc"
			ref={dialogRef}
			onKeyDown={(event) => {
				createFocusTrapHandler(dialogRef)(event);
				if (event.key === "Escape") {
					event.preventDefault();
					onCancel();
				}
			}}
			className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
		>
			<div className="w-full max-w-sm rounded-xl border border-zinc-200 bg-white p-6 shadow-xl dark:border-zinc-800 dark:bg-zinc-950">
				<div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/30">
					<RefreshCw className="size-6 text-amber-600 dark:text-amber-400" />
				</div>
				<h3
					id="rotate-title"
					className="mb-1 text-base font-semibold text-zinc-900 dark:text-zinc-50"
				>
					Rotate API key?
				</h3>
				<p
					id="rotate-desc"
					className="mb-6 text-sm text-zinc-500 dark:text-zinc-400"
				>
					<span className="font-medium text-zinc-700 dark:text-zinc-300">
						{keyName}
					</span>{" "}
					will be replaced with a new key. The old key will stop working
					immediately. This action cannot be undone.
				</p>
				<div className="flex justify-end gap-3">
					<Button variant="outline" size="sm" onClick={onCancel}>
						Cancel
					</Button>
					<Button
						ref={confirmRef}
						size="sm"
						onClick={onConfirm}
						data-testid="confirm-rotate"
					>
						Rotate key
					</Button>
				</div>
			</div>
		</div>
	);
}

// ---------------------------------------------------------------------------
// Copy button with feedback — uses useCopyToClipboard hook
// ---------------------------------------------------------------------------
function CopyKeyButton({ apiKey }: { apiKey: ApiKey }) {
	const { copy, copied } = useCopyToClipboard();

	return (
		<div className="flex items-center gap-2 font-mono text-xs text-zinc-500 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-900/50 px-2 py-1 rounded w-fit">
			<span>{apiKey.key}</span>
			<button
				type="button"
				onClick={() => copy(apiKey.key)}
				className="rounded p-1 transition-colors hover:text-zinc-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 dark:hover:text-zinc-100 dark:focus-visible:ring-offset-zinc-950"
				title={copied ? "Copied!" : "Copy to clipboard"}
				aria-label={copied ? "Copied!" : `Copy key ${apiKey.name}`}
				data-testid={`copy-key-${apiKey.id}`}
			>
				{copied ? (
					<Check className="size-3 text-green-500" aria-hidden="true" />
				) : (
					<Copy className="size-3" aria-hidden="true" />
				)}
			</button>
			{copied && (
				<span role="status" aria-live="polite" className="sr-only">
					Copied to clipboard
				</span>
			)}
		</div>
	);
}

// ---------------------------------------------------------------------------
// Main table
// ---------------------------------------------------------------------------
interface ApiKeysTableProps {
	/** Override keys list (useful for testing / storybook). Defaults to mockApiKeys. */
	initialKeys?: ApiKey[];
}

export function ApiKeysTable({ initialKeys = mockApiKeys }: ApiKeysTableProps) {
	const [keys, setKeys] = useState<ApiKey[]>(initialKeys);
	const [pendingRevokeId, setPendingRevokeId] = useState<string | null>(null);
	const [pendingRotateId, setPendingRotateId] = useState<string | null>(null);
	const [isModalOpen, setIsModalOpen] = useState(false);
	const [statusFilter, setStatusFilter] = useState<"all" | "Active" | "Revoked">("all");

	const filteredKeys =
		statusFilter === "all" ? keys : keys.filter((k) => k.status === statusFilter);

	const pendingKey = keys.find((k) => k.id === pendingRevokeId);
	const pendingRotateKey = keys.find((k) => k.id === pendingRotateId);

	const handleRevoke = (id: string) => {
		setKeys((prev) =>
			prev.map((k) => (k.id === id ? { ...k, status: "Revoked" as const } : k)),
		);
		setPendingRevokeId(null);
	};

	const handleRotate = (id: string) => {
		const chars =
			"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
		const suffix = Array.from(
			{ length: 12 },
			() => chars[Math.floor(Math.random() * chars.length)],
		).join("");
		setKeys((prev) =>
			prev.map((k) =>
				k.id === id ? { ...k, key: `sk_live_${suffix}...` } : k,
			),
		);
		setPendingRotateId(null);
	};

	const handleKeyCreated = ({
		name,
		value,
	}: {
		name: string;
		value: string;
	}) => {
		const newKey: ApiKey = {
			id: `key-${Date.now()}`,
			name,
			// Show only a masked preview in the table; the full key was shown once in the modal
			key: `${value.slice(0, 16)}...`,
			status: "Active",
			createdAt: new Date().toISOString(),
		};
		setKeys((prev) => [newKey, ...prev]);
	};

	const getStatusClassName = (status: "Active" | "Revoked") =>
		`gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${
			status === "Active"
				? "bg-green-50 text-green-700 border-green-200 dark:bg-green-500/10 dark:text-green-400 dark:border-green-500/20"
				: "bg-zinc-50 text-zinc-600 border-zinc-200 dark:bg-zinc-900 dark:text-zinc-500 dark:border-zinc-800"
		}`;

	return (
		<>
			{/* Revoke confirmation modal */}
			{pendingRevokeId && pendingKey && (
				<RevokeConfirm
					keyName={pendingKey.name}
					onConfirm={() => handleRevoke(pendingRevokeId)}
					onCancel={() => setPendingRevokeId(null)}
				/>
			)}

			{/* Rotate confirmation modal */}
			{pendingRotateId && pendingRotateKey && (
				<RotateConfirm
					keyName={pendingRotateKey.name}
					onConfirm={() => handleRotate(pendingRotateId)}
					onCancel={() => setPendingRotateId(null)}
				/>
			)}

			{/* Create key modal */}
			<APIKeyModal
				isOpen={isModalOpen}
				onClose={() => setIsModalOpen(false)}
				onKeyCreated={handleKeyCreated}
			/>

			<div className="rounded-xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-950 overflow-hidden">
				{/* Header */}
				<div className="p-6 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
					<div className="flex items-center gap-3">
						<div className="p-2 rounded-lg bg-zinc-100 dark:bg-zinc-900">
							<Key className="size-5 text-zinc-600 dark:text-zinc-400" />
						</div>
						<div>
							<h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
								API Keys
							</h2>
							<p className="text-sm text-zinc-500 dark:text-zinc-400">
								Manage your application keys and secrets
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

				{/* Status filter */}
				<div
					className="flex items-center gap-1 border-b border-zinc-200 dark:border-zinc-800 px-6 py-3"
					role="group"
					aria-label="Filter by status"
				>
					{(["all", "Active", "Revoked"] as const).map((f) => (
						<button
							key={f}
							type="button"
							onClick={() => setStatusFilter(f)}
							aria-pressed={statusFilter === f}
							className={cn(
								"rounded-full px-3 py-1 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-zinc-950",
								statusFilter === f
									? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
									: "text-zinc-500 hover:bg-zinc-100 hover:text-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-200",
							)}
						>
							{f === "all" ? "All" : f}
						</button>
					))}
				</div>

				{/* Empty state */}
				{keys.length === 0 ? (
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
					<Table aria-label="API keys">
						<caption className="sr-only">List of API keys with status and creation date</caption>
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
							{filteredKeys.map((key) => (
								<TableRow key={key.id} className="group transition-colors">
									<TableCell className="font-medium pl-6 text-zinc-900 dark:text-zinc-100">
										{key.name}
									</TableCell>
									<TableCell>
										<CopyKeyButton apiKey={key} />
									</TableCell>
									<TableCell>
										<Badge
											variant={key.status === "Active" ? "default" : "outline"}
											className={`
												gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border
												${
													key.status === "Active"
														? "bg-green-50 text-green-700 border-green-200 dark:bg-green-500/10 dark:text-green-400 dark:border-green-500/20"
														: "bg-zinc-50 text-zinc-600 border-zinc-200 dark:bg-zinc-900 dark:text-zinc-500 dark:border-zinc-800"
												}
											`}
										>
											{key.status === "Active" ? (
												<Shield className="size-3" />
											) : (
												<ShieldOff className="size-3" />
											)}
											{key.status}
										</Badge>
									</TableCell>
									<TableCell className="text-zinc-500 dark:text-zinc-400">
										{new Date(key.createdAt).toLocaleDateString()}
									</TableCell>
									<TableCell className="text-right pr-6">
										{key.status === "Active" ? (
											<div className="flex items-center justify-end gap-1">
												<Button
													variant="ghost"
													size="sm"
													className="text-zinc-500 hover:text-amber-600 dark:hover:text-amber-400 h-8 px-3 rounded-lg"
													onClick={() => setPendingRotateId(key.id)}
													data-testid={`rotate-btn-${key.id}`}
												>
													Rotate
												</Button>
												<Button
													variant="ghost"
													size="sm"
													className="text-zinc-500 hover:text-red-600 dark:hover:text-red-400 h-8 px-3 rounded-lg"
													onClick={() => setPendingRevokeId(key.id)}
													data-testid={`revoke-btn-${key.id}`}
												>
													Revoke
												</Button>
											</div>
										) : (
											<span className="text-xs text-zinc-400 dark:text-zinc-600 pr-1">
												Revoked
											</span>
										)}
									</TableCell>
								</TableRow>
							))}
						</TableBody>
					</Table>
				)}
			</div>
		</>
	);
}
