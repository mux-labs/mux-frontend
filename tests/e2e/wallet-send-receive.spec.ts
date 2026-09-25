import { test, expect, type Page } from '@playwright/test';

/**
 * E2E coverage for Wallet send/receive guarded UX (issue #768).
 *
 * Invariants exercised here (see docs/security-ux-guards.md):
 *  - Send/receive entrypoints are deny-by-default: unauthenticated users are
 *    redirected to login and never reach the money path.
 *  - Send requires an explicit confirmation step; the confirm control stays
 *    disabled until a valid amount + recipient are provided.
 *  - Receive surfaces the account address and never renders raw key material.
 *  - Failures surface stable, actionable error codes with a correlation id.
 *  - Replayed/concurrent submits are idempotent (single in-flight request).
 */

const SEND_PATH = '/dashboard/wallet/send';
const RECEIVE_PATH = '/dashboard/wallet/receive';

// Stable error codes the wallet UI is expected to surface.
const ERROR_CODES = {
  UNAUTHENTICATED: 'WALLET_UNAUTHENTICATED',
  INVALID_AMOUNT: 'WALLET_INVALID_AMOUNT',
  INVALID_RECIPIENT: 'WALLET_INVALID_RECIPIENT',
  RPC_UNAVAILABLE: 'WALLET_RPC_UNAVAILABLE',
} as const;

async function gotoWallet(page: Page, path: string) {
  await page.goto(path, { waitUntil: 'domcontentloaded' });
}

test.describe('wallet send/receive guarded UX', () => {
  test('unauthenticated send is denied by default', async ({ page }) => {
    await gotoWallet(page, SEND_PATH);

    // Deny-by-default: the money path must not render for anonymous users.
    await expect(page).toHaveURL(/\/login/);
    await expect(page.getByTestId('wallet-send-form')).toHaveCount(0);
  });

  test('unauthenticated receive is denied by default', async ({ page }) => {
    await gotoWallet(page, RECEIVE_PATH);

    await expect(page).toHaveURL(/\/login/);
    await expect(page.getByTestId('wallet-receive-panel')).toHaveCount(0);
  });

  test('send confirm stays disabled until amount and recipient are valid', async ({
    page,
  }) => {
    await gotoWallet(page, SEND_PATH);
    test.skip(
      !(await page.getByTestId('wallet-send-form').isVisible().catch(() => false)),
      'requires an authenticated wallet session',
    );

    const confirm = page.getByTestId('wallet-send-confirm');
    await expect(confirm).toBeDisabled();

    await page.getByTestId('wallet-send-amount').fill('0');
    await page.getByTestId('wallet-send-recipient').fill('not-a-stellar-address');
    await expect(confirm).toBeDisabled();

    await page.getByTestId('wallet-send-amount').fill('1.5');
    await page.getByTestId('wallet-send-recipient').fill('G'.padEnd(56, 'A'));
    await expect(confirm).toBeEnabled();
  });

  test('invalid amount surfaces a stable error code with correlation id', async ({
    page,
  }) => {
    await gotoWallet(page, SEND_PATH);
    test.skip(
      !(await page.getByTestId('wallet-send-form').isVisible().catch(() => false)),
      'requires an authenticated wallet session',
    );

    await page.getByTestId('wallet-send-amount').fill('-1');
    await page.getByTestId('wallet-send-recipient').fill('G'.padEnd(56, 'A'));
    await page.getByTestId('wallet-send-confirm').click();

    const error = page.getByTestId('wallet-send-error');
    await expect(error).toBeVisible();
    await expect(error).toContainText(ERROR_CODES.INVALID_AMOUNT);
    await expect(error).toContainText(/correlation[_-]?id/i);
  });

  test('replayed submit is idempotent (single in-flight request)', async ({ page }) => {
    await gotoWallet(page, SEND_PATH);
    test.skip(
      !(await page.getByTestId('wallet-send-form').isVisible().catch(() => false)),
      'requires an authenticated wallet session',
    );

    let submits = 0;
    await page.route('**/api/wallet/send', async (route) => {
      submits += 1;
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ ok: true, correlationId: 'test-correlation-id' }),
      });
    });

    await page.getByTestId('wallet-send-amount').fill('1.5');
    await page.getByTestId('wallet-send-recipient').fill('G'.padEnd(56, 'A'));

    const confirm = page.getByTestId('wallet-send-confirm');
    await confirm.click();
    await confirm.click({ force: true }).catch(() => {});

    await expect(page.getByTestId('wallet-send-success')).toBeVisible();
    expect(submits).toBe(1);
  });

  test('RPC outage fails closed on send', async ({ page }) => {
    await gotoWallet(page, SEND_PATH);
    test.skip(
      !(await page.getByTestId('wallet-send-form').isVisible().catch(() => false)),
      'requires an authenticated wallet session',
    );

    await page.route('**/api/wallet/send', (route) =>
      route.fulfill({
        status: 503,
        contentType: 'application/json',
        body: JSON.stringify({
          error: ERROR_CODES.RPC_UNAVAILABLE,
          correlationId: 'test-correlation-id',
        }),
      }),
    );

    await page.getByTestId('wallet-send-amount').fill('1.5');
    await page.getByTestId('wallet-send-recipient').fill('G'.padEnd(56, 'A'));
    await page.getByTestId('wallet-send-confirm').click();

    const error = page.getByTestId('wallet-send-error');
    await expect(error).toBeVisible();
    await expect(error).toContainText(ERROR_CODES.RPC_UNAVAILABLE);
    // Fail-closed: no success state on a dependency outage.
    await expect(page.getByTestId('wallet-send-success')).toHaveCount(0);
  });

  test('receive shows address and never leaks key material', async ({ page }) => {
    await gotoWallet(page, RECEIVE_PATH);
    test.skip(
      !(await page.getByTestId('wallet-receive-panel').isVisible().catch(() => false)),
      'requires an authenticated wallet session',
    );

    const address = page.getByTestId('wallet-receive-address');
    await expect(address).toBeVisible();
    await expect(address).toHaveText(/^G[A-Z2-7]{55}$/);

    // No raw secret/key material should ever be rendered.
    const body = await page.locator('body').innerText();
    expect(body).not.toMatch(/S[A-Z2-7]{55}/);
    expect(body).not.toMatch(/secret/i);
  });
});
