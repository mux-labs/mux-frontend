"use client";

interface QRDownloadButtonProps {
	address: string;
	onDownload?: (address: string) => void;
	className?: string;
}

/**
 * Stub action for downloading the receive address QR code. Wiring to a
 * real QR image renderer/export lands later; for now it exposes the
 * action surface (button + callback) so callers can integrate it.
 */
export function QRDownloadButton({
	address,
	onDownload,
	className,
}: QRDownloadButtonProps) {
	const handleClick = () => {
		onDownload?.(address);
	};

	return (
		<button
			type="button"
			onClick={handleClick}
			disabled={!address}
			className={className}
			aria-label="Download receive address QR code"
		>
			Download QR
		</button>
	);
}
