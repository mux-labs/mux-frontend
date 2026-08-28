"use client";

import React, { createContext, useContext } from "react";
import ApiClient from "./client";
import createApiClient from "./index";

const ApiContext = createContext<ApiClient | null>(null);

/**
 * Server-only Mux credentials (MUX_API_KEY / MUX_API_SECRET) must never be
 * read here — this is a client component and anything it touches ships to
 * the browser. `apiKey` and `authToken` are only for a caller-supplied,
 * non-secret, per-session value; leave them unset to make unauthenticated
 * requests through the same-origin /api/* routes, which attach real
 * credentials server-side.
 */
export function ApiProvider({
	children,
	apiKey,
	authToken,
}: {
	children: React.ReactNode;
	apiKey?: string;
	authToken?: string;
}) {
	const client = createApiClient(undefined, apiKey, authToken);
	return <ApiContext.Provider value={client}>{children}</ApiContext.Provider>;
}

export function useApi() {
	const ctx = useContext(ApiContext);
	if (!ctx) throw new Error("useApi must be used within ApiProvider");
	return ctx;
}

export default ApiProvider;
