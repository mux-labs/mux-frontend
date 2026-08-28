import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ReactQueryTestProvider } from "@/test/reactQueryWrapper";
import { SendDraftScreen } from "../SendDraftScreen";

const wallet = {
	id: "1",
	name: "Main Wallet",
	network: "testnet",
} as never;

function renderScreen(
	props: Partial<Parameters<typeof SendDraftScreen>[0]> = {},
) {
	return render(
		<ReactQueryTestProvider>
			<SendDraftScreen wallet={wallet} {...props} />
		</ReactQueryTestProvider>,
	);
}

describe("SendDraftScreen — send flow backend wiring (#616)", () => {
	beforeEach(() => {
		vi.restoreAllMocks();
	});

	afterEach(() => {
		vi.unstubAllGlobals();
	});

	it("renders destination and amount fields", () => {
		renderScreen();
		expect(screen.getByTestId("send-draft-screen")).toBeInTheDocument();
		expect(screen.getByLabelText("Destination")).toBeInTheDocument();
		expect(screen.getByLabelText("Amount")).toBeInTheDocument();
	});

	it("posts the draft to /api/send/draft and calls onContinue with the backend preview", async () => {
		const preview = {
			valid: true,
			destination: "GABC",
			amount: "10",
			fee: "0.00001",
			estimatedArrival: "a few seconds",
		};
		const fetchMock = vi.fn().mockResolvedValue({
			ok: true,
			status: 200,
			json: () => Promise.resolve(preview),
		});
		vi.stubGlobal("fetch", fetchMock);

		const onContinue = vi.fn();
		renderScreen({ onContinue });

		await userEvent.type(screen.getByLabelText("Destination"), "GABC");
		await userEvent.type(screen.getByLabelText("Amount"), "10");
		await userEvent.click(screen.getByRole("button", { name: "Continue" }));

		await waitFor(() => expect(onContinue).toHaveBeenCalled());

		expect(fetchMock).toHaveBeenCalledWith(
			"/api/send/draft",
			expect.objectContaining({ method: "POST" }),
		);
		expect(onContinue).toHaveBeenCalledWith(
			expect.objectContaining({
				destination: "GABC",
				amount: "10",
				preview,
			}),
		);
		expect(screen.getByTestId("send-draft-preview")).toBeInTheDocument();
	});

	it("surfaces a backend error and does NOT call onContinue (no silent success)", async () => {
		const fetchMock = vi.fn().mockResolvedValue({
			ok: false,
			status: 400,
			json: () => Promise.resolve({ error: "Destination account not found." }),
		});
		vi.stubGlobal("fetch", fetchMock);

		const onContinue = vi.fn();
		renderScreen({ onContinue });

		await userEvent.type(screen.getByLabelText("Destination"), "GBAD");
		await userEvent.type(screen.getByLabelText("Amount"), "5");
		await userEvent.click(screen.getByRole("button", { name: "Continue" }));

		await waitFor(() =>
			expect(screen.getByTestId("send-draft-error")).toHaveTextContent(
				"Destination account not found.",
			),
		);
		expect(onContinue).not.toHaveBeenCalled();
	});

	it("validates required fields client-side before hitting the network", async () => {
		const fetchMock = vi.fn();
		vi.stubGlobal("fetch", fetchMock);

		renderScreen();
		await userEvent.click(screen.getByRole("button", { name: "Continue" }));

		expect(
			await screen.findByText("Destination address is required."),
		).toBeInTheDocument();
		expect(fetchMock).not.toHaveBeenCalled();
	});

	it("demo mode resolves locally without touching /api/send/draft", async () => {
		const fetchMock = vi.fn();
		vi.stubGlobal("fetch", fetchMock);

		const onContinue = vi.fn();
		renderScreen({ demo: true, onContinue });

		await userEvent.type(screen.getByLabelText("Destination"), "GDEMO");
		await userEvent.type(screen.getByLabelText("Amount"), "3");
		await userEvent.click(screen.getByRole("button", { name: "Continue" }));

		await waitFor(() => expect(onContinue).toHaveBeenCalled());
		expect(fetchMock).not.toHaveBeenCalled();
		expect(onContinue).toHaveBeenCalledWith(
			expect.objectContaining({
				preview: expect.objectContaining({ mock: true }),
			}),
		);
	});
});
