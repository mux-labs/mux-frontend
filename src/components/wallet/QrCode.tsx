"use client";

import { useEffect, useState } from "react";
import { generateQrSvgDataUrl } from "@/utils/qrCode";

interface QrCodeProps {
	/** The data to encode, typically a wallet address. */
	value: string;
	/** Pixel width/height of the rendered QR code. */
	size?: number;
	className?: string;
}

export function QrCode({ value, size = 240, className }: QrCodeProps) {
	const [dataUrl, setDataUrl] = useState<string | null>(null);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		let cancelled = false;

		generateQrSvgDataUrl(value, { size })
			.then((url) => {
				if (cancelled) return;
				setDataUrl(url);
				setError(null);
			})
			.catch(() => {
				if (cancelled) return;
				setDataUrl(null);
				setError("Unable to generate the QR code.");
			});

		return () => {
			cancelled = true;
		};
	}, [value, size]);

	if (error) {
		return (
			<div
				role="alert"
				className="flex items-center justify-center rounded-3xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-950/40 dark:text-red-200"
				style={{ width: size, height: size }}
			>
				{error}
			</div>
		);
	}

	if (!dataUrl) {
		return (
			<div
				aria-label="Generating QR code"
				className="animate-pulse rounded-3xl border border-zinc-200 bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-900"
				style={{ width: size, height: size }}
			/>
		);
	}

	return (
		<img
			src={dataUrl}
			alt={`QR code for wallet address ${value}`}
			width={size}
			height={size}
			className={className}
		/>
	);
}
