"use client";

import {
	isServer,
	QueryClient,
	QueryClientProvider,
} from "@tanstack/react-query";
import React from "react";

/**
 * Creates a QueryClient with defaults tuned for a dashboard that proxies
 * every request through the Next.js API routes to `mux-backend`:
 *
 * - `staleTime` of 30s keeps the UI from hammering the backend on every
 *   remount / tab focus while still feeling live.
 * - `retry: 1` — the API routes already translate upstream failures into
 *   4xx/5xx; a single retry covers a transient network blip without
 *   masking a real outage.
 * - Mutations never retry: a send/transfer must not be silently repeated.
 */
function makeQueryClient(): QueryClient {
	return new QueryClient({
		defaultOptions: {
			queries: {
				staleTime: 30_000,
				retry: 1,
				refetchOnWindowFocus: false,
			},
			mutations: {
				retry: 0,
			},
		},
	});
}

let browserQueryClient: QueryClient | undefined;

/**
 * On the server every request gets a fresh client. In the browser we reuse
 * a single client across renders (but create it lazily so React Strict Mode
 * double-invoke during the initial render doesn't throw the first one away).
 */
export function getQueryClient(): QueryClient {
	if (isServer) {
		return makeQueryClient();
	}
	if (!browserQueryClient) {
		browserQueryClient = makeQueryClient();
	}
	return browserQueryClient;
}

/**
 * App-wide TanStack Query provider. Mounted once in `src/app/layout.tsx`
 * above `ApiProvider` so every client component can call `useQuery` /
 * `useMutation` (see `src/hooks/useSendDraft.ts`, `src/hooks/useApiKeysQuery.ts`).
 */
export function ReactQueryProvider({
	children,
}: {
	children: React.ReactNode;
}) {
	const queryClient = getQueryClient();

	return (
		<QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
	);
}

export default ReactQueryProvider;
