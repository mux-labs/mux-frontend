"use client";

import { Loader2, Trash2, UsersRound } from "lucide-react";
import { useEffect, useState } from "react";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/button";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { useAuth } from "@/context/AuthContext";
import type { TeamMember } from "@/types/team";

/**
 * Team access management. Adding/removing members is restricted to the
 * "admin" role — a "developer" sees a read-only member list. There is no
 * invite-by-email flow: members are added directly by an admin.
 */
export default function TeamSettingsPage() {
	const { user, isLoading: authLoading } = useAuth();
	const isAdmin = user?.role === "admin";

	const [members, setMembers] = useState<TeamMember[]>([]);
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [name, setName] = useState("");
	const [email, setEmail] = useState("");
	const [role, setRole] = useState<TeamMember["role"]>("developer");
	const [isSubmitting, setIsSubmitting] = useState(false);

	async function loadMembers() {
		setIsLoading(true);
		setError(null);
		try {
			const res = await fetch("/api/team");
			const body = await res.json().catch(() => null);
			if (!res.ok || !body) {
				setError(body?.message || "Unable to load team members.");
				setMembers([]);
				return;
			}
			setMembers(body.data ?? []);
		} catch {
			setError("Unable to reach the team service.");
		} finally {
			setIsLoading(false);
		}
	}

	useEffect(() => {
		if (!user) return;
		loadMembers();
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [user]);

	async function addMember(event: React.FormEvent) {
		event.preventDefault();
		if (!name.trim() || !email.trim()) {
			setError("Name and email are required.");
			return;
		}
		setIsSubmitting(true);
		setError(null);
		try {
			const res = await fetch("/api/team", {
				method: "POST",
				headers: { "content-type": "application/json" },
				body: JSON.stringify({ name, email, role }),
			});
			const body = await res.json().catch(() => null);
			if (!res.ok || !body) {
				setError(body?.message || "Unable to add team member.");
				return;
			}
			setName("");
			setEmail("");
			setRole("developer");
			await loadMembers();
		} catch {
			setError("Unable to reach the team service.");
		} finally {
			setIsSubmitting(false);
		}
	}

	async function removeMember(id: string) {
		setError(null);
		try {
			const res = await fetch(`/api/team/${id}`, { method: "DELETE" });
			if (!res.ok) {
				const body = await res.json().catch(() => null);
				setError(body?.message || "Unable to remove team member.");
				return;
			}
			await loadMembers();
		} catch {
			setError("Unable to reach the team service.");
		}
	}

	if (authLoading) {
		return (
			<div role="status" className="flex min-h-64 items-center justify-center gap-2 text-zinc-500">
				<Loader2 className="h-5 w-5 animate-spin motion-reduce:animate-none" aria-hidden="true" />
				Loading team…
			</div>
		);
	}

	if (!user) {
		return (
			<EmptyState
				title="Team unavailable"
				description="Sign in to view and manage project team access."
			/>
		);
	}

	return (
		<div className="space-y-8">
			<PageHeader
				title="Team access"
				description="Members with access to this project's dashboard and API keys."
			/>
			<div className="rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
				<div className="flex items-center gap-2 border-b border-zinc-200 p-5 sm:p-6 dark:border-zinc-800">
					<UsersRound className="h-5 w-5 text-zinc-500" aria-hidden="true" />
					<h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">Members</h2>
				</div>

				{error && (
					<p role="alert" className="px-5 pt-4 text-sm text-red-600 sm:px-6 dark:text-red-400">
						{error}
					</p>
				)}

				{isLoading ? (
					<div className="flex items-center justify-center gap-2 p-8 text-zinc-500">
						<Loader2 className="h-5 w-5 animate-spin motion-reduce:animate-none" aria-hidden="true" />
						Loading members…
					</div>
				) : members.length === 0 ? (
					<div className="p-6">
						<EmptyState title="No team members yet" description="Add a member below to get started." />
					</div>
				) : (
					<Table>
						<TableHeader>
							<TableRow>
								<TableHead>Name</TableHead>
								<TableHead>Email</TableHead>
								<TableHead>Role</TableHead>
								{isAdmin && <TableHead className="text-right">Actions</TableHead>}
							</TableRow>
						</TableHeader>
						<TableBody>
							{members.map((member) => (
								<TableRow key={member.id}>
									<TableCell>{member.name}</TableCell>
									<TableCell>{member.email}</TableCell>
									<TableCell className="capitalize">{member.role}</TableCell>
									{isAdmin && (
										<TableCell className="text-right">
											<Button
												type="button"
												variant="ghost"
												size="icon-sm"
												aria-label={`Remove ${member.name}`}
												onClick={() => removeMember(member.id)}
											>
												<Trash2 className="h-4 w-4" />
											</Button>
										</TableCell>
									)}
								</TableRow>
							))}
						</TableBody>
					</Table>
				)}

				{isAdmin && (
					<form onSubmit={addMember} className="space-y-4 border-t border-zinc-200 p-5 sm:p-6 dark:border-zinc-800">
						<h3 className="text-sm font-medium text-zinc-800 dark:text-zinc-200">Add a member</h3>
						<div className="grid gap-3 sm:grid-cols-3">
							<input
								aria-label="Name"
								placeholder="Name"
								value={name}
								onChange={(event) => setName(event.target.value)}
								className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50"
							/>
							<input
								aria-label="Email"
								type="email"
								placeholder="Email"
								value={email}
								onChange={(event) => setEmail(event.target.value)}
								className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50"
							/>
							<select
								aria-label="Role"
								value={role}
								onChange={(event) => setRole(event.target.value as TeamMember["role"])}
								className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50"
							>
								<option value="developer">Developer</option>
								<option value="admin">Admin</option>
							</select>
						</div>
						<Button type="submit" disabled={isSubmitting}>
							{isSubmitting ? "Adding…" : "Add member"}
						</Button>
					</form>
				)}
			</div>
		</div>
	);
}
