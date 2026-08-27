"use client";

import { useState } from "react";
import { generateQrSvgDataUrl } from "@/utils/qrCode";

interface QRDownloadButtonProps {
	address: string;
	onDownload?: (address: string) => void;
	className?: string;
}

function triggerDownload(dataUrl: string, filename: string) {
	const link = document.createElement("a");
	link.href = dataUrl;
	link.download = filename;
	document.body.appendChild(link);
	link.click();
	link.remove();
}

/**
 * Generates a real QR code encoding `address` and downloads it as an SVG
 * file, then notifies `onDownload` (if provided) that the export happened.
 */
export function QRDownloadButton({
	address,
	onDownload,
	className,
}: QRDownloadButtonProps) {
	const [isDownloading, setIsDownloading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const handleClick = async () => {
		if (!address || isDownloading) return;

		setIsDownloading(true);
		setError(null);
		try {
			const dataUrl = await generateQrSvgDataUrl(address, { size: 512 });
			triggerDownload(dataUrl, `${address}-qr.svg`);
			onDownload?.(address);
		} catch {
			setError("Unable to generate the QR code for download.");
		} finally {
			setIsDownloading(false);
		}
	};

	return (
		<>
			<button
				type="button"
				onClick={handleClick}
				disabled={!address || isDownloading}
				className={className}
				aria-label="Download receive address QR code"
			>
				{isDownloading ? "Preparing…" : "Download QR"}
			</button>
			{error && (
				<p role="alert" className="mt-1 text-xs text-red-600">
					{error}
				</p>
			)}
		</>
	);
}
