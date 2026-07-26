import { describe, expect, it } from "vitest";
import { shellLabels } from "../shellLabels";

describe("shellLabels", () => {
	it("exposes nav labels", () => {
		expect(shellLabels.nav.dashboard).toBe("Dashboard");
		expect(shellLabels.nav.wallets).toBe("Wallets");
	});

	it("exposes header and footer labels", () => {
		expect(shellLabels.header.testnet).toBe("Testnet");
		expect(shellLabels.footer.docs).toBe("Documentation");
	});
});
