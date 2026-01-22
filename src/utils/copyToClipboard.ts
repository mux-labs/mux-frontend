/**
 * Copies text to the clipboard.
 * Returns a promise that resolves when the text is copied.
 */
export function copyToClipboard(text: string): Promise<void> {
	return navigator.clipboard.writeText(text);
}
