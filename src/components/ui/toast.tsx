import { X } from "lucide-react";
import { cn } from "@/lib/utils";

export type ToastVariant = "success" | "error" | "info";

export interface ToastProps {
	open: boolean;
	/** The message body displayed inside the toast. */
	message: string;
	/** Visual variant controlling icon and colour scheme. Defaults to "success". */
	variant?: ToastVariant;
	/** Custom title. If not provided, uses the variant default. */
	title?: string;
	/** Callback fired when the dismiss button is clicked. If not provided, no dismiss button is shown. */
	onClose?: () => void;
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

export function Toast({ open, message, variant = "success", title, onClose }: ToastProps) {
	if (!open) {
		return null;
	}

	const { container, title: defaultTitle } = VARIANT_STYLES[variant];
	const displayTitle = title ?? defaultTitle;

	return (
		<div
			className={cn(
				"fixed right-4 bottom-4 z-50 max-w-xs rounded-2xl p-4 text-white shadow-2xl ring-1 ring-white/10 backdrop-blur-md",
				container,
			)}
		>
			<div className="flex items-start gap-3">
				<div role="status" aria-live="polite" className="flex-1 space-y-1">
					<p className="text-sm font-semibold">{displayTitle}</p>
					<p className="text-sm text-zinc-200">{message}</p>
				</div>
				{onClose && (
					<button
						type="button"
						onClick={onClose}
						className="mt-0.5 shrink-0 text-white/60 hover:text-white transition-colors"
						aria-label="Dismiss notification"
					>
						<X className="w-4 h-4" />
					</button>
				)}
			</div>
		</div>
	);
}
