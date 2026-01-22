"use client";

import { Check, Copy, Key, Shield, ShieldOff } from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { type ApiKey, mockApiKeys } from "@/mock-data/api-keys";

export function ApiKeysTable() {
	const [copiedId, setCopiedId] = useState<string | null>(null);

	const handleCopy = (id: string, text: string) => {
		navigator.clipboard.writeText(text);
		setCopiedId(id);
		setTimeout(() => setCopiedId(null), 2000);
	};

	return (
		<div className="rounded-xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-950 overflow-hidden">
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
				<Button size="sm" className="rounded-full px-4">
					Create new key
				</Button>
			</div>
			<Table>
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
					{mockApiKeys.map((key) => (
						<TableRow key={key.id} className="group transition-colors">
							<TableCell className="font-medium pl-6 text-zinc-900 dark:text-zinc-100">
								{key.name}
							</TableCell>
							<TableCell>
								<div className="flex items-center gap-2 font-mono text-xs text-zinc-500 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-900/50 px-2 py-1 rounded w-fit">
									<span>{key.key}</span>
									<button
										onClick={() => handleCopy(key.id, key.key)}
										className="p-1 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors"
										title="Copy to clipboard"
										type="button"
									>
										{copiedId === key.id ? (
											<Check className="size-3 text-green-500" />
										) : (
											<Copy className="size-3" />
										)}
									</button>
								</div>
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
								<Button
									variant="ghost"
									size="sm"
									className="text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 h-8 px-3 rounded-lg"
								>
									Revoke
								</Button>
							</TableCell>
						</TableRow>
					))}
				</TableBody>
			</Table>
		</div>
	);
}
