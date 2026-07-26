interface ToastProps {
	open: boolean;
	message: string;
	title?: string;
	tone?: "success" | "error" | "info";
}

export function Toast({
	open,
	message,
	title = "Success",
	tone = "success",
}: ToastProps) {
	if (!open) {
		return null;
	}

	const isError = tone === "error";

	return (
		<div
			role={isError ? "alert" : "status"}
			aria-live={isError ? "assertive" : "polite"}
			aria-atomic="true"
			className="fixed right-4 bottom-4 z-50 max-w-xs rounded-2xl bg-zinc-950/95 p-4 text-white shadow-2xl ring-1 ring-white/10 backdrop-blur-md dark:bg-white/95 dark:text-zinc-950 dark:ring-zinc-950/10"
		>
			<p className="text-sm font-semibold">{title}</p>
			<p className="text-sm text-zinc-200 dark:text-zinc-700">{message}</p>
		</div>
	);
}
