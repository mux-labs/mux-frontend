/**
 * Centralized dictionary for critical, user-facing strings (wallet, payment,
 * and auth flows) so they have a single lookup point ahead of wiring in a
 * full i18n library, instead of being hardcoded inline across components.
 */
export const criticalStrings = {
  wallet: {
    connectPrompt: 'Connect your wallet to continue',
    connectionFailed: 'Wallet connection failed. Please try again.',
    balanceUnavailable: 'Balance unavailable',
  },
  payment: {
    processing: 'Processing payment...',
    success: 'Payment sent successfully',
    failed: 'Payment failed. No funds were moved.',
    insufficientFunds: 'Insufficient funds for this transaction',
  },
  auth: {
    sessionExpired: 'Your session has expired. Please sign in again.',
    unauthorized: 'You are not authorized to perform this action',
  },
} as const;

type Section = keyof typeof criticalStrings;

export function getCriticalString<S extends Section>(
  section: S,
  key: keyof (typeof criticalStrings)[S]
): string {
  return criticalStrings[section][key] as string;
}
