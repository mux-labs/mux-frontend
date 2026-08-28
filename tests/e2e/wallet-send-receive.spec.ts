import { expect, test } from "@playwright/test";

/**
 * Smoke coverage for the wallet detail page's Send and Receive flows
 * (`/wallet`), which do not sit behind the `/dashboard` auth gate. The
 * wallet list is stubbed via `page.route` (this page's `/api/wallets`
 * bearer-token check is a separate concern covered by
 * `tests/e2e/wallets.spec.ts`) so these specs can focus on:
 *
 * - the receive QR code being a real, scannable image (not a stub) with a
 *   working file download
 * - the send form actually submitting to the real `/api/transactions`
 *   route handler (mock-backed in this environment) instead of just
 *   closing the modal with no request
 */

const FUNDED_WALLET = {
	id: "wallet-e2e-1",
	address: "GBZXN7PIRZGNMHGA7MUUUF4GWPY5AYPV6LY4UV2GL6VJGIQRXFDNMADI",
	network: "mainnet",
	status: "active",
	createdAt: "2024-01-15T10:30:00Z",
	balance: "1,250.50 XLM",
};

async function stubWallets(page: import("@playwright/test").Page) {
	await page.route("**/api/wallets", (route) =>
		route.fulfill({
			status: 200,
			contentType: "application/json",
			body: JSON.stringify([FUNDED_WALLET]),
		}),
	);
}

test.describe("Wallet send/receive smoke", () => {
	test("shows a real QR code for the receive address and downloads it", async ({
		page,
	}) => {
		await stubWallets(page);
		await page.goto("/wallet");

		await page.getByRole("button", { name: "Receive funds" }).click();

		const dialog = page.getByRole("dialog");
		await expect(dialog).toBeVisible();

		const qrImage = dialog.getByRole("img", {
			name: `QR code for wallet address ${FUNDED_WALLET.address}`,
		});
		await expect(qrImage).toBeVisible();
		await expect(qrImage).toHaveAttribute(
			"src",
			/^data:image\/svg\+xml;base64,/,
		);

		const downloadPromise = page.waitForEvent("download");
		await dialog
			.getByRole("button", { name: "Download receive address QR code" })
			.click();
		const download = await downloadPromise;
		expect(download.suggestedFilename()).toBe(
			`${FUNDED_WALLET.address}-qr.svg`,
		);
	});

	test("submits a send transaction to the real transactions API", async ({
		page,
	}) => {
		await stubWallets(page);
		await page.goto("/wallet");

		await page.getByRole("button", { name: "Send funds" }).click();

		const dialog = page.getByRole("dialog");
		await expect(dialog).toBeVisible();

		const transactionRequest = page.waitForResponse(
			(response) =>
				response.url().includes("/api/transactions") &&
				response.request().method() === "POST",
		);

		await page
			.getByLabel("Destination address")
			.fill("GCXKG6RN4ONIEPCMNFB732A436Z5PNDSRLGWK7GBLCMQLIFO4S7EYWVU");
		await page.getByLabel("Amount (XLM)").fill("25");
		await page.getByRole("button", { name: "Submit send transaction" }).click();

		const response = await transactionRequest;
		expect(response.status()).toBe(201);

		await expect(dialog).not.toBeVisible();
	});
});
