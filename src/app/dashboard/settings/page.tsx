"use client";

import { Check, Loader2, UserRound } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/AuthContext";
import { loadSession } from "@/lib/session";

type Preferences = {
	displayName: string;
	emailUpdates: boolean;
	compactWallets: boolean;
};

/**
 * Returns the stored bearer token from sessionStorage (via `src/lib/session.js`)
 * so `fetch` calls to `/api/settings` can include the Authorization header.
 */
function getAccessToken(): string | null {
	try {
		const session = loadSession() as { accessToken?: string } | null;
		return session?.accessToken ?? null;
	} catch {
		return null;
	}
}

function buildAuthHeaders(): Record<string, string> {
	const token = getAccessToken();
	return token
		? { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }
		: { "Content-Type": "application/json" };
}

export default function SettingsPage() {
	const { user, isLoading } = useAuth();
	const [preferences, setPreferences] = useState<Preferences>({
		displayName: "",
		emailUpdates: true,
		compactWallets: false,
	});
	const [loadingPrefs, setLoadingPrefs] = useState(false);
	const [saved, setSaved] = useState(false);
	const [isSaving, setIsSaving] = useState(false);
	const [error, setError] = useState<string | null>(null);

	/**
	 * Load saved preferences from the backend via `/api/settings`.
	 * Falls back to defaults derived from the auth user when the backend
	 * returns no settings (e.g. first-time load or 404).
	 */
	const loadPreferences = useCallback(async () => {
		if (!user) return;

		setLoadingPrefs(true);
		setError(null);

		try {
			const res = await fetch("/api/settings", {
				cache: "no-store",
				headers: buildAuthHeaders(),
			});

			if (res.ok) {
				const data = (await res.json()) as {
					settings?: Partial<Preferences>;
				};
				const remote = data.settings ?? {};
				setPreferences({
					displayName: remote.displayName || user.name,
					emailUpdates: remote.emailUpdates ?? true,
					compactWallets: remote.compactWallets ?? false,
				});
			} else if (res.status === 404 || res.status === 503) {
				// No settings persisted yet or backend unavailable — use defaults.
				setPreferences({
					displayName: user.name,
					emailUpdates: true,
					compactWallets: false,
				});
			} else {
				const body = await res.json().catch(() => ({}));
				const msg =
					typeof (body as { message?: string }).message === "string"
						? (body as { message: string }).message
						: `Failed to load settings (${res.status})`;
				setError(msg);
				// Apply defaults so the UI still renders.
				setPreferences({
					displayName: user.name,
					emailUpdates: true,
					compactWallets: false,
				});
			}
		} catch {
			setError(
				"Could not connect to the settings service. Your changes will not be persisted.",
			);
			setPreferences({
				displayName: user.name,
				emailUpdates: true,
				compactWallets: false,
			});
		} finally {
			setLoadingPrefs(false);
		}
	}, [user]);

	useEffect(() => {
		void loadPreferences();
	}, [loadPreferences]);

	async function savePreferences(event: React.FormEvent) {
		event.preventDefault();
		setError(null);

		if (!preferences.displayName.trim()) {
			setError("Display name is required.");
			return;
		}

		setIsSaving(true);
		try {
			const res = await fetch("/api/settings", {
				method: "PATCH",
				headers: buildAuthHeaders(),
				body: JSON.stringify({
					...preferences,
					displayName: preferences.displayName.trim(),
				}),
			});

			if (!res.ok) {
				const body = await res.json().catch(() => ({}));
				const msg =
					typeof (body as { message?: string }).message === "string"
						? (body as { message: string }).message
						: typeof (body as { error?: string }).error === "string"
							? (body as { error: string }).error
							: `Could not save preferences (${res.status}).`;
				setError(msg);
				return;
			}

			setSaved(true);
			window.setTimeout(() => setSaved(false), 2500);
		} catch {
			setError(
				"Could not reach the settings service. Please try again.",
			);
		} finally {
			setIsSaving(false);
		}
	}

	if (isLoading || loadingPrefs) {
		return (
			<div
				role="status"
				className="flex min-h-64 items-center justify-center gap-2 text-zinc-500"
			>
				<Loader2
					className="h-5 w-5 animate-spin motion-reduce:animate-none"
					aria-hidden="true"
				/>
				Loading profile preferences…
			</div>
		);
	}

	if (!user) {
		return (
			<EmptyState
				title="Profile unavailable"
				description="Sign in to view and update your profile preferences."
			/>
		);
	}

	return (
		<div className="space-y-8">
			<PageHeader
				title="Settings"
				description="Manage your profile and developer console preferences."
			/>
			<div className="grid gap-6 lg:grid-cols-[220px_minmax(0,1fr)]">
				<nav
					aria-label="Settings sections"
					className="h-fit rounded-xl border border-zinc-200 bg-white p-2 dark:border-zinc-800 dark:bg-zinc-900"
				>
					<a
						href="#profile"
						aria-current="page"
						className="flex items-center gap-2 rounded-lg bg-blue-50 px-3 py-2 text-sm font-medium text-blue-700 dark:bg-blue-950/40 dark:text-blue-300"
					>
						<UserRound className="h-4 w-4" aria-hidden="true" />
						Profile preferences
					</a>
				</nav>
				<form
					id="profile"
					onSubmit={savePreferences}
					className="rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900"
				>
					<div className="border-b border-zinc-200 p-5 sm:p-6 dark:border-zinc-800">
						<h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
							Profile preferences
						</h2>
						<p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
							Personalize how the console presents your account and wallet data.
						</p>
					</div>
					<div className="space-y-6 p-5 sm:p-6">
						<div>
							<label
								htmlFor="display-name"
								className="block text-sm font-medium text-zinc-800 dark:text-zinc-200"
							>
								Display name
							</label>
							<input
								id="display-name"
								value={preferences.displayName}
								onChange={(event) =>
									setPreferences((current) => ({
										...current,
										displayName: event.target.value,
									}))
								}
								className="mt-2 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-900 sm:max-w-md dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50"
							/>
							<p className="mt-1 text-xs text-zinc-500">
								Signed in as {user.email}
							</p>
						</div>
						{(
							[
								[
									"emailUpdates",
									"Product email updates",
									"Receive occasional platform and security announcements.",
								],
								[
									"compactWallets",
									"Compact wallet rows",
									"Show more wallets at once on narrow screens.",
								],
							] as const
						).map(([key, label, description]) => (
							<label key={key} className="flex items-start gap-3">
								<input
									type="checkbox"
									checked={preferences[key]}
									onChange={(event) =>
										setPreferences((current) => ({
											...current,
											[key]: event.target.checked,
										}))
									}
									className="mt-1 h-4 w-4 rounded border-zinc-300"
								/>
								<span>
									<span className="block text-sm font-medium text-zinc-800 dark:text-zinc-200">
										{label}
									</span>
									<span className="block text-sm text-zinc-500 dark:text-zinc-400">
										{description}
									</span>
								</span>
							</label>
						))}
						{error && (
							<p role="alert" className="text-sm text-red-600 dark:text-red-400">
								{error}
							</p>
						)}
					</div>
					<div className="flex items-center justify-end gap-3 border-t border-zinc-200 p-4 sm:px-6 dark:border-zinc-800">
						{saved && (
							<span
								role="status"
								className="flex items-center gap-1 text-sm text-green-700 dark:text-green-400"
							>
								<Check className="h-4 w-4" /> Saved
							</span>
						)}
						<Button type="submit" disabled={isSaving}>
							{isSaving ? (
								<>
									<Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
									Saving…
								</>
							) : (
								"Save preferences"
							)}
						</Button>
					</div>
				</form>
			</div>
		</div>
	);
}
