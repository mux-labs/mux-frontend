"use client";

import { useMutation } from "@tanstack/react-query";
import type {
	SendDraftPreview,
	SendDraftRequest,
} from "@/app/api/send/draft/route";

/**
 * Mock preview returned by the demo/mock code path. Demo dashboard routes
 * have no authenticated backend session, so they resolve the draft locally
 * instead of calling `/api/send/draft`.
 */
export function buildMockDraftPreview(
	input: Pick<SendDraftRequest, "destination" | "amount">,
): SendDraftPreview {
	return {
		valid: true,
		destination: input.destination.trim(),
		amount: input.amount.trim(),
		fee: "0.00001",
		estimatedArrival: "a few seconds",
		mock: true,
	};
}

async function postSendDraft(
	input: SendDraftRequest,
): Promise<SendDraftPreview> {
	const res = await fetch("/api/send/draft", {
		method: "POST",
		headers: { "content-type": "application/json" },
		body: JSON.stringify(input),
	});

	const data = (await res.json().catch(() => ({}))) as
		| SendDraftPreview
		| { error?: string };

	if (!res.ok) {
		throw new Error(
			("error" in data && data.error) || `Send draft failed (${res.status}).`,
		);
	}

	return data as SendDraftPreview;
}

export interface UseSendDraftOptions {
	/**
	 * Demo mode: resolve the draft from local mock data instead of hitting the
	 * real (auth-gated) `/api/send/draft` route. Demo dashboard routes pass
	 * `demo: true`; production callers must not.
	 */
	demo?: boolean;
	onSuccess?: (preview: SendDraftPreview) => void;
}

/**
 * `useMutation` wrapper for the send-flow draft step (issue #616 / #619).
 *
 * In production this always round-trips through `/api/send/draft`, which
 * proxies to `mux-backend` and never returns a fabricated success.
 */
export function useSendDraft({
	demo = false,
	onSuccess,
}: UseSendDraftOptions = {}) {
	return useMutation<SendDraftPreview, Error, SendDraftRequest>({
		mutationKey: ["send-draft", demo ? "demo" : "live"],
		mutationFn: async (input) => {
			if (demo) {
				return buildMockDraftPreview(input);
			}
			return postSendDraft(input);
		},
		onSuccess,
	});
}
