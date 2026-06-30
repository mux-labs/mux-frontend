"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { type FormEvent, Suspense, useEffect, useState } from "react";
import { AuthLoadingSkeleton } from "@/components/layouts/AuthLoadingSkeleton";
import { useAuth } from "@/context/AuthContext";
import { ToastContainer, useToast } from "@/components/ui/Toast";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface LoginFormState {
	email: string;
	password: string;
}

interface FieldErrors {
	email?: string;
	password?: string;
}

// ---------------------------------------------------------------------------
// API call — #325: wire to backend via POST /api/auth/login
// ---------------------------------------------------------------------------

/**
 * Sends login credentials to the backend and returns the authenticated user.
 *
 * @param email - The user's email address.
 * @param password - The user's password (plaintext; HTTPS in production).
 * @returns The authenticated user record `{ name, email, role }`.
 * @throws {Error} When the response is not OK or the user payload is missing.
 */
async function authenticateUser(
	email: string,
	password: string,
): Promise<{ name: string; email: string; role: string }> {
	const res = await fetch("/api/auth/login", {
		method: "POST",
		headers: { "content-type": "application/json" },
		body: JSON.stringify({ email, password }),
	});

	const data = await res.json().catch(() => ({}));

	if (!res.ok) {
		throw new Error(
			(data as { error?: string }).error ||
				"Sign in failed. Please check your credentials and try again.",
		);
	}

	const user = (
		data as { user?: { name: string; email: string; role: string } }
	).user;
	if (!user) {
		throw new Error("Unexpected response from authentication server.");
	}

	return user;
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

function validate(fields: LoginFormState): FieldErrors {
	const errors: FieldErrors = {};
	if (!fields.email.trim()) {
		errors.email = "Email is required.";
	} else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(fields.email)) {
		errors.email = "Enter a valid email address.";
	}
	if (!fields.password) {
		errors.password = "Password is required.";
	} else if (fields.password.length < 6) {
		errors.password = "Password must be at least 6 characters.";
	}
	return errors;
}

// ---------------------------------------------------------------------------
// #327: Styled error card component
// ---------------------------------------------------------------------------

/**
 * Inline error banner displayed below the page header when a submit error occurs.
 *
 * @param message - The error text to display.
 * @param onDismiss - Callback invoked when the user clicks the dismiss (×) button.
 */
function LoginErrorCard({
	message,
	onDismiss,
}: {
	message: string;
	onDismiss: () => void;
}) {
	return (
		<div
			role="alert"
			className="mb-4 flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
			data-testid="login-error"
		>
			<svg
				className="mt-0.5 h-4 w-4 shrink-0 text-red-500"
				fill="none"
				viewBox="0 0 24 24"
				strokeWidth={2}
				stroke="currentColor"
				aria-hidden="true"
			>
				<path
					strokeLinecap="round"
					strokeLinejoin="round"
					d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
				/>
			</svg>
			<span className="flex-1">{message}</span>
			<button
				type="button"
				onClick={onDismiss}
				aria-label="Dismiss error"
				className="text-red-400 hover:text-red-600"
			>
				<svg
					className="h-4 w-4"
					fill="none"
					viewBox="0 0 24 24"
					strokeWidth={2}
					stroke="currentColor"
					aria-hidden="true"
				>
					<path
						strokeLinecap="round"
						strokeLinejoin="round"
						d="M6 18L18 6M6 6l12 12"
					/>
				</svg>
			</button>
		</div>
	);
}

// ---------------------------------------------------------------------------
// #326: Empty/welcome state shown before the user starts typing
// ---------------------------------------------------------------------------

/**
 * Informational banner shown when the login form is in its pristine (untouched) state.
 * Disappears as soon as the user begins entering credentials or a submit error appears.
 */
function LoginWelcomeHint() {
	return (
		<div
			className="mb-4 rounded-lg border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-700"
			data-testid="login-empty-state"
		>
			<p className="font-medium">Welcome to Mux Protocol</p>
			<p className="mt-0.5 text-blue-600">
				Enter your credentials to access your developer console.
			</p>
		</div>
	);
}

// ---------------------------------------------------------------------------
// Page content
// ---------------------------------------------------------------------------

function LoginPageContent() {
	const { isAuthenticated, isLoading, signIn } = useAuth();
	const router = useRouter();
	const searchParams = useSearchParams();
	const { toasts, addToast, dismissToast } = useToast();

	const [fields, setFields] = useState<LoginFormState>({
		email: "",
		password: "",
	});
	const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
	const [submitError, setSubmitError] = useState<string | null>(null);
	const [isSubmitting, setIsSubmitting] = useState(false);

	const callbackUrl = searchParams.get("callbackUrl") ?? "/dashboard";

	// Derived: true when the user hasn't interacted with the form yet (#326)
	const isPristine = !fields.email && !fields.password;

	// Redirect already-authenticated users away from the login page
	useEffect(() => {
		if (!isLoading && isAuthenticated) {
			router.replace(callbackUrl);
		}
	}, [isAuthenticated, isLoading, callbackUrl, router]);

	function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
		const { name, value } = e.target;
		setFields((prev) => ({ ...prev, [name]: value }));
		if (fieldErrors[name as keyof FieldErrors]) {
			setFieldErrors((prev) => ({ ...prev, [name]: undefined }));
		}
		setSubmitError(null);
	}

	async function handleSubmit(e: FormEvent<HTMLFormElement>) {
		e.preventDefault();
		setSubmitError(null);

		const errors = validate(fields);
		if (Object.keys(errors).length > 0) {
			setFieldErrors(errors);
			return;
		}

		setIsSubmitting(true);
		try {
			const user = await authenticateUser(fields.email, fields.password);
			signIn(user);
			addToast({
				type: "success",
				message: "Signed in successfully!",
				description: `Welcome back, ${user.name}.`,
			});
			router.replace(callbackUrl);
		} catch (err) {
			const message =
				err instanceof Error
					? err.message
					: "Sign in failed. Please check your credentials and try again.";
			setSubmitError(message);
			addToast({
				type: "error",
				message: "Sign in failed",
				description: message,
			});
		} finally {
			setIsSubmitting(false);
		}
	}

	// #328: While auth state is being rehydrated, show the AuthLoadingSkeleton
	// instead of a bare spinner so the page does not flash.
	if (isLoading) {
		return <AuthLoadingSkeleton />;
	}

	return (
		<div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
			<ToastContainer
				toasts={toasts}
				onDismiss={dismissToast}
				position="top-right"
			/>
			<div className="w-full max-w-md">
				{/* Logo / brand */}
				<div className="mb-8 text-center">
					<div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-purple-600">
						<svg
							className="h-6 w-6 text-white"
							fill="none"
							viewBox="0 0 24 24"
							strokeWidth={2}
							stroke="currentColor"
							aria-hidden="true"
						>
							<path
								strokeLinecap="round"
								strokeLinejoin="round"
								d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z"
							/>
						</svg>
					</div>
					<h1 className="text-2xl font-bold tracking-tight text-gray-900">
						Mux Protocol
					</h1>
					<p className="mt-1 text-sm text-gray-500">
						Sign in to your developer console
					</p>
				</div>

				{/* Login card */}
				<div className="rounded-2xl border border-gray-200 bg-white px-8 py-10 shadow-sm">
					<h2 className="mb-6 text-lg font-semibold text-gray-900">Sign in</h2>

					{/* #326: Empty/welcome state — shown before the user types anything */}
					{isPristine && !submitError && <LoginWelcomeHint />}

					{/* #327: Styled error card for submit errors */}
					{submitError && (
						<LoginErrorCard
							message={submitError}
							onDismiss={() => setSubmitError(null)}
						/>
					)}

					<form
						onSubmit={handleSubmit}
						noValidate
						aria-label="Sign in form"
						data-testid="login-form"
					>
						{/* Email field */}
						<div className="mb-4">
							<label
								htmlFor="email"
								className="mb-1.5 block text-sm font-medium text-gray-700"
							>
								Email address
							</label>
							<input
								id="email"
								name="email"
								type="email"
								autoComplete="email"
								value={fields.email}
								onChange={handleChange}
								disabled={isSubmitting}
								aria-invalid={!!fieldErrors.email}
								aria-describedby={fieldErrors.email ? "email-error" : undefined}
								className={[
									"block w-full rounded-lg border px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400",
									"focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-0",
									"disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-500",
									fieldErrors.email
										? "border-red-400 bg-red-50 focus:ring-red-400"
										: "border-gray-300 bg-white",
								].join(" ")}
								placeholder="you@example.com"
							/>
							{fieldErrors.email && (
								<p
									id="email-error"
									role="alert"
									className="mt-1.5 text-xs text-red-600"
									data-testid="email-error"
								>
									{fieldErrors.email}
								</p>
							)}
						</div>

						{/* Password field */}
						<div className="mb-6">
							<label
								htmlFor="password"
								className="mb-1.5 block text-sm font-medium text-gray-700"
							>
								Password
							</label>
							<input
								id="password"
								name="password"
								type="password"
								autoComplete="current-password"
								value={fields.password}
								onChange={handleChange}
								disabled={isSubmitting}
								aria-invalid={!!fieldErrors.password}
								aria-describedby={
									fieldErrors.password ? "password-error" : undefined
								}
								className={[
									"block w-full rounded-lg border px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400",
									"focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-0",
									"disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-500",
									fieldErrors.password
										? "border-red-400 bg-red-50 focus:ring-red-400"
										: "border-gray-300 bg-white",
								].join(" ")}
								placeholder="••••••••"
							/>
							{fieldErrors.password && (
								<p
									id="password-error"
									role="alert"
									className="mt-1.5 text-xs text-red-600"
									data-testid="password-error"
								>
									{fieldErrors.password}
								</p>
							)}
						</div>

						{/* Submit button */}
						<button
							type="submit"
							disabled={isSubmitting}
							className={[
								"flex w-full items-center justify-center gap-2 rounded-lg px-4 py-2.5",
								"text-sm font-semibold text-white transition-colors",
								"focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2",
								"disabled:cursor-not-allowed disabled:opacity-60",
								isSubmitting ? "bg-blue-400" : "bg-blue-600 hover:bg-blue-700",
							].join(" ")}
							data-testid="login-submit"
						>
							{isSubmitting ? (
								<>
									<svg
										className="h-4 w-4 animate-spin"
										fill="none"
										viewBox="0 0 24 24"
										aria-hidden="true"
									>
										<circle
											className="opacity-25"
											cx="12"
											cy="12"
											r="10"
											stroke="currentColor"
											strokeWidth="4"
										/>
										<path
											className="opacity-75"
											fill="currentColor"
											d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
										/>
									</svg>
									Signing in…
								</>
							) : (
								"Sign in"
							)}
						</button>
					</form>
				</div>

				{/* Footer note */}
				<p className="mt-6 text-center text-xs text-gray-400">
					Mux Protocol developer console — internal use only
				</p>
			</div>
		</div>
	);
}

export default function LoginPage() {
	return (
		<Suspense fallback={<AuthLoadingSkeleton />}>
			<LoginPageContent />
		</Suspense>
	);
}
