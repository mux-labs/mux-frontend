/**
 * Tests for #633: the demo wallets page must stay behaviourally aligned with
 * the production `/dashboard/wallets` page — same `useWallets` hook, the same
 * network filter, and the same archived toggle. These assertions fail if the
 * demo page regresses to a bare mock list without those controls.
 */
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import WalletsPage from "@/app/demo/dashboard/wallets/page";
import { NetworkProvider } from "@/context/NetworkContext";
import { dummyWallets } from "@/mock-data/wallets";

function renderPage() {
	return render(
		<NetworkProvider>
			<WalletsPage />
		</NetworkProvider>,
	);
}

// NetworkProvider defaults to "mainnet", so useWallets({ demo: true }) sources
// the mainnet slice of the mock wallets.
const mainnetWallets = dummyWallets.filter((w) => w.network === "mainnet");
const mainnetArchived = mainnetWallets.filter((w) => w.archived).length;
const mainnetVisible = mainnetWallets.length - mainnetArchived;

afterEach(() => {
	vi.restoreAllMocks();
	localStorage.clear();
});

describe("demo wallets page — aligned with production", () => {
	it("renders the shared network filter control", async () => {
		renderPage();
		await waitFor(() => expect(screen.getByRole("table")).toBeInTheDocument());
		expect(
			screen.getByRole("group", { name: /network filter/i }),
		).toBeInTheDocument();
	});

	it("hides archived wallets by default but exposes the toggle", async () => {
		renderPage();
		await waitFor(() => expect(screen.getByRole("table")).toBeInTheDocument());

		expect(screen.getByText(`${mainnetVisible} wallets`)).toBeInTheDocument();
		const toggle = screen.getByTestId("show-archived-toggle");
		expect(toggle).not.toBeChecked();
		expect(
			screen.getByText(`Show archived (${mainnetArchived})`),
		).toBeInTheDocument();
	});

	it("shows archived wallets once the toggle is checked", async () => {
		const user = userEvent.setup();
		renderPage();
		await waitFor(() => expect(screen.getByRole("table")).toBeInTheDocument());

		await user.click(screen.getByTestId("show-archived-toggle"));

		expect(
			screen.getByText(`${mainnetWallets.length} wallets`),
		).toBeInTheDocument();
	});

	it("narrows the list through the network filter", async () => {
		const user = userEvent.setup();
		renderPage();
		await waitFor(() => expect(screen.getByRole("table")).toBeInTheDocument());

		// The mainnet-scoped fetch has no testnet wallets to show.
		await user.click(
			screen.getByRole("button", { name: /filter by testnet/i }),
		);

		expect(screen.getByText(/no wallets on this network/i)).toBeInTheDocument();
	});
});
