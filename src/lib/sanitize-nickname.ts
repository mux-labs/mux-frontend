const HTML_ESCAPE_MAP: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
};

const MAX_NICKNAME_LENGTH = 32;

/**
 * Strips control characters and HTML-escapes a user-supplied wallet nickname
 * before it is rendered, so a nickname like `<img src=x onerror=...>` can
 * never execute in the DOM.
 */
export function sanitizeNickname(input: string): string {
  const trimmed = input
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0000-\u001F\u007F]/g, '')
    .trim()
    .slice(0, MAX_NICKNAME_LENGTH);

  return trimmed.replace(/[&<>"']/g, (char) => HTML_ESCAPE_MAP[char] ?? char);
}

export function isValidNickname(input: string): boolean {
  return input.trim().length > 0 && input.trim().length <= MAX_NICKNAME_LENGTH;
}
