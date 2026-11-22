/**
 * Shared upstream-envelope parsing (issue #952).
 *
 * API routes that proxy a backend resource (wallet detail, activity, …)
 * normalize whatever the upstream returns into one stable envelope shape
 * instead of letting each route decode a bespoke response on its own:
 *
 *   { data, error, correlationId, status?, configuredNetwork? }
 *
 *  - `data` / `error` are mutually exclusive: exactly one carries the
 *    result. A route that sees both or neither must fail closed rather than
 *    guess.
 *  - `status`, when present, is the HTTP status the route should return for
 *    an error envelope (e.g. a 404 from the backend stays a 404, not a
 *    blanket 500). When absent, the route falls back to a code→status map.
 *  - `configuredNetwork`, when present, is this deployment's expected
 *    Stellar network, resolved server-side — never trusted from the client.
 */

export type EnvelopeError = {
	code: string;
	message: string;
};

export type Envelope<T = unknown> = {
	data: T | null;
	error: EnvelopeError | null;
	correlationId: string;
	/** HTTP status to use for an error envelope, if the caller should preserve it. */
	status?: number;
	/** This deployment's expected Stellar network, if the route needs to check it. */
	configuredNetwork?: "testnet" | "mainnet";
};

/**
 * Resolves the configured Stellar network from the environment.
 *
 * Returns the HTTP status to use for an error envelope, if the caller should
 * preserve it: a recognised network value returns `{ network, status: 200 }`;
 * an absent or unrecognised value returns `{ network: undefined, status: 200 }`
 * so the caller can decide whether to fail closed.
 *
 * Exported for regression testing (issue #1163).
 */
export function resolveConfiguredNetwork(): {
	network: "testnet" | "mainnet" | undefined;
	status: number;
} {
	const raw = process.env.NEXT_PUBLIC_STELLAR_NETWORK;
	const network =
		raw === "testnet" || raw === "mainnet" ? raw : undefined;
	return { network, status: 200 };
}

/**
 * Fetch `path` from the wallet service and normalize the response into an
 * `Envelope`. Fails closed: a network error or non-JSON body throws rather
 * than returning an optimistic/empty envelope.
 */
export async function parseEnvelope<T = unknown>(
	path: string,
	correlationId: string,
	init: RequestInit = {},
): Promise<Envelope<T>> {
	const baseUrl = process.env.WALLET_SERVICE_URL;
	const response = await fetch(`${baseUrl}${path}`, {
		...init,
		headers: { "x-correlation-id": correlationId, ...init.headers },
		cache: "no-store",
	});

	const body = (await response.json()) as unknown;

	if (response.ok) {
		return {
			data: body as T,
			error: null,
			correlationId,
			configuredNetwork: resolveConfiguredNetwork().network,
		};
	}

	const errorBody = body as Partial<EnvelopeError> | null;
	return {
		data: null,
		error: {
			code:
				typeof errorBody?.code === "string" ? errorBody.code : "UPSTREAM_ERROR",
			message:
				typeof errorBody?.message === "string"
					? errorBody.message
					: "Upstream request failed.",
		},
		correlationId,
		status: response.status,
		configuredNetwork: resolveConfiguredNetwork().network,
	};
}
