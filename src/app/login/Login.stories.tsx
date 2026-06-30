import type { Meta, StoryObj } from "@storybook/react";
import { ToastContainer } from "@/components/ui/Toast";
import type { ToastMessage } from "@/components/ui/Toast";

// ---------------------------------------------------------------------------
// LoginErrorCard — extracted for isolated story rendering
// ---------------------------------------------------------------------------

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
			className="flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
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
// LoginWelcomeHint
// ---------------------------------------------------------------------------

function LoginWelcomeHint() {
	return (
		<div className="rounded-lg border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-700">
			<p className="font-medium">Welcome to Mux Protocol</p>
			<p className="mt-0.5 text-blue-600">
				Enter your credentials to access your developer console.
			</p>
		</div>
	);
}

// ---------------------------------------------------------------------------
// Composed login card shell for story use
// ---------------------------------------------------------------------------

function LoginCard({ children }: { children: React.ReactNode }) {
	return (
		<div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
			<div className="w-full max-w-md">
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
				<div className="rounded-2xl border border-gray-200 bg-white px-8 py-10 shadow-sm">
					<h2 className="mb-6 text-lg font-semibold text-gray-900">Sign in</h2>
					{children}
				</div>
				<p className="mt-6 text-center text-xs text-gray-400">
					Mux Protocol developer console — internal use only
				</p>
			</div>
		</div>
	);
}

// ---------------------------------------------------------------------------
// Meta
// ---------------------------------------------------------------------------

/**
 * Stories for the auth/login page components.
 *
 * Covers:
 * - Default (empty/pristine) state with welcome hint
 * - Error state with inline error card
 * - Submitting state with loading button
 * - Toast feedback on success and on failure
 */
const meta = {
	title: "Auth/Login",
	component: LoginCard,
	parameters: { layout: "fullscreen" },
	tags: ["autodocs"],
} satisfies Meta<typeof LoginCard>;

export default meta;
type Story = StoryObj<typeof LoginCard>;

// ---------------------------------------------------------------------------
// Stories
// ---------------------------------------------------------------------------

/** Pristine form: user hasn't typed anything yet. Shows the welcome hint. */
export const Default: Story = {
	render: () => (
		<LoginCard>
			<LoginWelcomeHint />
			<form noValidate aria-label="Sign in form">
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
						placeholder="you@example.com"
						className="block w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
					/>
				</div>
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
						placeholder="••••••••"
						className="block w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
					/>
				</div>
				<button
					type="submit"
					className="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
				>
					Sign in
				</button>
			</form>
		</LoginCard>
	),
};

/** Form with a submit error displayed via the inline error card. */
export const WithError: Story = {
	render: () => (
		<LoginCard>
			<LoginErrorCard
				message="Sign in failed. Please check your credentials and try again."
				onDismiss={() => {}}
			/>
			<form noValidate aria-label="Sign in form">
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
						defaultValue="wrong@example.com"
						className="block w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
					/>
				</div>
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
						placeholder="••••••••"
						className="block w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
					/>
				</div>
				<button
					type="submit"
					className="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
				>
					Sign in
				</button>
			</form>
		</LoginCard>
	),
};

/** Submitting state — button disabled with spinner. */
export const Submitting: Story = {
	render: () => (
		<LoginCard>
			<form noValidate aria-label="Sign in form">
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
						defaultValue="dev@muxprotocol.io"
						disabled
						className="block w-full rounded-lg border border-gray-300 bg-gray-50 px-3 py-2.5 text-sm text-gray-500 cursor-not-allowed"
					/>
				</div>
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
						defaultValue="••••••••"
						disabled
						className="block w-full rounded-lg border border-gray-300 bg-gray-50 px-3 py-2.5 text-sm text-gray-500 cursor-not-allowed"
					/>
				</div>
				<button
					type="submit"
					disabled
					className="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-400 px-4 py-2.5 text-sm font-semibold text-white cursor-not-allowed opacity-60"
				>
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
				</button>
			</form>
		</LoginCard>
	),
};

/** Toast feedback — success notification after sign-in. */
export const ToastSuccess: Story = {
	render: () => {
		const toasts: ToastMessage[] = [
			{
				id: "1",
				type: "success",
				message: "Signed in successfully!",
				description: "Welcome back, Alex.",
			},
		];
		return (
			<div className="relative">
				<ToastContainer
					toasts={toasts}
					onDismiss={() => {}}
					position="top-right"
				/>
				<LoginCard>
					<div className="py-4 text-center text-sm text-gray-500">
						Redirecting to dashboard…
					</div>
				</LoginCard>
			</div>
		);
	},
};

/** Toast feedback — error notification after failed sign-in. */
export const ToastError: Story = {
	render: () => {
		const toasts: ToastMessage[] = [
			{
				id: "1",
				type: "error",
				message: "Sign in failed",
				description: "Invalid email or password.",
			},
		];
		return (
			<div className="relative">
				<ToastContainer
					toasts={toasts}
					onDismiss={() => {}}
					position="top-right"
				/>
				<LoginCard>
					<LoginErrorCard
						message="Invalid email or password."
						onDismiss={() => {}}
					/>
					<form noValidate>
						<div className="mb-4">
							<input
								type="email"
								placeholder="you@example.com"
								className="block w-full rounded-lg border border-red-400 bg-red-50 px-3 py-2.5 text-sm"
							/>
						</div>
						<div className="mb-6">
							<input
								type="password"
								placeholder="••••••••"
								className="block w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm"
							/>
						</div>
						<button
							type="submit"
							className="flex w-full justify-center rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white"
						>
							Sign in
						</button>
					</form>
				</LoginCard>
			</div>
		);
	},
};
