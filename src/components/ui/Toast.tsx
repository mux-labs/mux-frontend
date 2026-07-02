import { cn } from "@/lib/utils";

export type ToastVariant = "success" | "error" | "info";

export interface ToastProps {
	open: boolean;
	/** The message body displayed inside the toast. */
	message: string;
	/** Visual variant controlling icon and colour scheme. Defaults to "success". */
	variant?: ToastVariant;
}

const VARIANT_STYLES: Record<
	ToastVariant,
	{ container: string; title: string }
> = {
	success: {
		container: "bg-zinc-950/95",
		title: "Success",
	},
	error: {
		container: "bg-red-950/95",
		title: "Error",
	},
	info: {
		container: "bg-blue-950/95",
		title: "Info",
	},
};

export function Toast({ open, message, variant = "success" }: ToastProps) {
	if (!open) {
		return null;
	}

	const { container, title } = VARIANT_STYLES[variant];

	return (
		<div
			className={cn(
				"fixed right-4 bottom-4 z-50 max-w-xs rounded-2xl p-4 text-white shadow-2xl ring-1 ring-white/10 backdrop-blur-md",
				container,
			)}
		>
			<div role="status" aria-live="polite" className="space-y-1">
				<p className="text-sm font-semibold">{title}</p>
				<p className="text-sm text-zinc-200">{message}</p>
			</div>
		</div>
	);
}
