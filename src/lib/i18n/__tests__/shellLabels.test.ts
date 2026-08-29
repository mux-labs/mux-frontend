import { describe, expect, it } from "vitest";
import { shellLabels } from "../shellLabels";

describe("shellLabels", () => {
	it("exposes nav labels", () => {
		expect(shellLabels.nav.dashboard).toBe("Dashboard");
		expect(shellLabels.nav.wallets).toBe("Wallets");
	});

	it("exposes a nav label for every dashboard route the Sidebar links to", () => {
		expect(shellLabels.nav.users).toBe("Users");
		expect(shellLabels.nav.analytics).toBe("Analytics");
		expect(shellLabels.nav.apiKeys).toBe("API Keys");
		expect(shellLabels.nav.spendingLimits).toBe("Spending Limits");
		expect(shellLabels.nav.settings).toBe("Settings");
	});

	it("exposes header and footer labels", () => {
		expect(shellLabels.header.testnet).toBe("Testnet");
		expect(shellLabels.header.mainnet).toBe("Mainnet");
		expect(shellLabels.header.breadcrumbHome).toBe("Home");
		expect(shellLabels.header.logout).toBe("Sign out");
		expect(shellLabels.footer.docs).toBe("Documentation");
	});
});
