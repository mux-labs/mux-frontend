/**
 * Tests for ReactQueryProvider (issue #619 — install and use TanStack Query).
 *
 * Guards against regression to the old shim that rendered children only with
 * no QueryClient in context: a `useQuery` / `useMutation` call inside the
 * provider must actually work.
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { ReactQueryProvider } from "../ReactQueryProvider";

function QueryConsumer() {
	const client = useQueryClient();
	const { data } = useQuery({
		queryKey: ["greeting"],
		queryFn: () => Promise.resolve("hello from query"),
	});
	return (
		<div>
			<span data-testid="has-client">{client ? "yes" : "no"}</span>
			<span data-testid="query-data">{data ?? "…"}</span>
		</div>
	);
}

function MutationConsumer() {
	const mutation = useMutation({
		mutationFn: (name: string) => Promise.resolve(`mutated ${name}`),
	});
	return (
		<button type="button" onClick={() => mutation.mutate("x")}>
			{mutation.data ?? "run"}
		</button>
	);
}

describe("ReactQueryProvider (#619)", () => {
	it("provides a QueryClient to descendants", () => {
		render(
			<ReactQueryProvider>
				<QueryConsumer />
			</ReactQueryProvider>,
		);
		expect(screen.getByTestId("has-client")).toHaveTextContent("yes");
	});

	it("runs useQuery inside the provider", async () => {
		render(
			<ReactQueryProvider>
				<QueryConsumer />
			</ReactQueryProvider>,
		);
		await waitFor(() =>
			expect(screen.getByTestId("query-data")).toHaveTextContent(
				"hello from query",
			),
		);
	});

	it("runs useMutation inside the provider", async () => {
		render(
			<ReactQueryProvider>
				<MutationConsumer />
			</ReactQueryProvider>,
		);
		await userEvent.click(screen.getByRole("button", { name: "run" }));
		await waitFor(() =>
			expect(screen.getByRole("button")).toHaveTextContent("mutated x"),
		);
	});
});
