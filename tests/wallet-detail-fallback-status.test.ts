import { describe, it, expect } from 'vitest';
import { fallbackStatusFor } from '../src/app/api/wallets/[id]/route';

/**
 * Regression test for `fallbackStatusFor` (issue #1182).
 *
 * Contract from the function's comment: map a *known* upstream error code to
 * a status when the envelope omits `status`. Unknown codes must fail closed
 * to 500 rather than being guessed.
 */
describe('fallbackStatusFor', () => {
  it('maps WALLET_NOT_FOUND to 404', () => {
    expect(fallbackStatusFor('WALLET_NOT_FOUND')).toBe(404);
  });

  it('maps UPSTREAM_ERROR to 502', () => {
    expect(fallbackStatusFor('UPSTREAM_ERROR')).toBe(502);
  });

  it('fails closed to 500 for an unknown code', () => {
    expect(fallbackStatusFor('SOMETHING_UNMAPPED')).toBe(500);
    expect(fallbackStatusFor('')).toBe(500);
  });
});
