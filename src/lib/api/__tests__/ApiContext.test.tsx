import { render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ApiProvider, useApi } from "../ApiContext";

function Probe() {
	const client = useApi();
	client.get("/probe").catch(() => {});
	return <div>probe</div>;
}

describe("ApiProvider", () => {
	beforeEach(() => {
		vi.unstubAllEnvs();
	});

	afterEach(() => {
		vi.unstubAllEnvs();
		vi.restoreAllMocks();
	});

	it("never attaches a server-only credential to client-side requests (#636)", async () => {
		// Even if MUX_API_KEY leaked into the browser bundle, ApiProvider must
		// not read or forward it — the browser has no business holding Mux
		// credentials at all.
		vi.stubEnv("MUX_API_KEY", "server-secret-key");
		vi.stubEnv("NEXT_PUBLIC_MUX_API_KEY", "legacy-public-key");

		const fetchSpy = vi
			.spyOn(global, "fetch")
			.mockResolvedValue(new Response(JSON.stringify({}), { status: 200 }));

		render(
			<ApiProvider>
				<Probe />
			</ApiProvider>,
		);

		await screen.findByText("probe");
		await waitFor(() => expect(fetchSpy).toHaveBeenCalled());

		const [, init] = fetchSpy.mock.calls[0];
		const headers = (init?.headers as Record<string, string>) ?? {};
		expect(headers["x-api-key"]).toBeUndefined();
	});
});
