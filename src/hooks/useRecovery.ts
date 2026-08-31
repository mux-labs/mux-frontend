"use client";

import { useCallback, useState } from "react";
import { useRecoveryStatus } from "@/hooks/useRecoveryStatus";
import { initiateRecovery as initiateRecoveryApi } from "@/services/recoveryApi";
import type { RecoveryTimeline } from "@/types/recovery";

export type RecoveryState =
	| "loading"
	| "idle"
	| "confirming"
	| "pending"
	| "success"
	| "error";

export interface UseRecoveryReturn {
	state: RecoveryState;
	errorMessage: string | null;
	/**
	 * The recovery timeline fetched from the backend for `walletId`. `null`
	 * when running in demo mode (`walletId === null`) or before the fetch has
	 * resolved — callers should fall back to demo/mock data explicitly in
	 * that case rather than assuming this is always populated.
	 */
	timeline: RecoveryTimeline | null;
	initiateRecovery: () => void;
	confirmRecovery: () => Promise<void>;
	cancelRecovery: () => void;
	resetRecovery: () => void;
}

export interface UseRecoveryOptions {
	/**
	 * Whether the upstream wallet list is still loading. Only consulted when
	 * `walletId === null`: the hook stays in `loading` until the wallets fetch
	 * settles, then resolves to `idle` because there is no wallet to fetch a
	 * per-wallet recovery status for.
	 *
	 * This replaces the old simulated `setTimeout` bootstrap (#620) — the
	 * loading skeleton now tracks a real fetch instead of a fake delay.
	 */
	walletsLoading?: boolean;
}

/**
 * Hook for driving the wallet recovery state machine.
 *
 * When a real `walletId` is provided (#455), recovery status is fetched from
 * the backend via `useRecoveryStatus`. The loading and error states produced
 * by that fetch are surfaced through this hook (#459).
 *
 * When `walletId` is `null` there is no wallet to fetch a per-wallet recovery
 * status for, so the hook does not fabricate one (#620). Instead it mirrors
 * the caller's real wallet-list fetch via `options.walletsLoading`: `loading`
 * while that fetch is in flight, then `idle` once it settles. No simulated
 * delay, in any environment.
 *
 * State machine:
 *   loading   – per-wallet status fetch (or the upstream wallets fetch) in progress
 *   idle      – status loaded; no recovery in-flight
 *   confirming – user clicked "Initiate"; awaiting explicit confirmation (#457)
 *   pending   – confirmation submitted; waiting for API response
 *   success   – recovery request accepted by backend
 *   error     – bootstrap fetch failed OR CTA submission failed
 */
export function useRecovery(
	walletId: string | null = null,
	options: UseRecoveryOptions = {},
): UseRecoveryReturn {
	const { walletsLoading = false } = options;

	// ── Real API fetch (#455) ─────────────────────────────────────────────────
	const {
		timeline: apiTimeline,
		loading: apiLoading,
		error: apiError,
		refetch,
	} = useRecoveryStatus(walletId, {
		autoFetch: walletId !== null,
	});

	// ── CTA flow state machine ────────────────────────────────────────────────
	const [ctaState, setCtaState] = useState<
		"idle" | "confirming" | "pending" | "success" | "error"
	>("idle");
	const [ctaError, setCtaError] = useState<string | null>(null);

	// ── Derive unified state ──────────────────────────────────────────────────
	let state: RecoveryState;

	if (walletId !== null) {
		// Real API path
		if (apiLoading === "loading" || apiLoading === "idle") {
			state = "loading";
		} else if (apiLoading === "error" && ctaState === "idle") {
			// Bootstrap failure: API fetch failed before any CTA interaction.
			state = "error";
		} else {
			state = ctaState;
		}
	} else {
		// No wallet selected (#620): there is nothing to fetch a per-wallet
		// recovery status for, so mirror the caller's real wallet-list fetch
		// rather than a simulated delay. `loading` while that fetch is in
		// flight, then straight to the CTA state machine (`idle` initially).
		if (walletsLoading) {
			state = "loading";
		} else {
			state = ctaState;
		}
	}

	const errorMessage: string | null =
		state === "error"
			? (ctaError ??
				(walletId !== null ? apiError : null) ??
				"An unexpected error occurred.")
			: null;

	// ── CTA actions ───────────────────────────────────────────────────────────

	/** Transitions from idle/error → confirming (shows the confirm step). */
	const initiateRecovery = useCallback(() => {
		if (ctaState !== "idle" && ctaState !== "error") return;
		setCtaError(null);
		setCtaState("confirming");
	}, [ctaState]);

	/**
	 * #457 – submits the recovery request after the user confirms the step.
	 * Transitions: confirming → pending → success | error.
	 *
	 * Real API path (`walletId !== null`) calls `recoveryApi.initiateRecovery`.
	 * With no wallet selected (`walletId === null`) there is nothing to submit:
	 * production rejects with an explicit "select a wallet" error, while
	 * non-production keeps a short simulated delay so the demo dashboards don't
	 * depend on a live backend. Only the wallet identifier is ever sent —
	 * never a private key, seed phrase, or other custody secret.
	 */
	const confirmRecovery = useCallback(async () => {
		if (ctaState !== "confirming") return;
		setCtaState("pending");
		try {
			if (walletId !== null) {
				const result = await initiateRecoveryApi(walletId);
				if (!result.success) {
					throw new Error(result.error ?? "Failed to initiate recovery.");
				}
			} else if (process.env.NODE_ENV === "production") {
				// No wallet selected and no backend to call — never fake a
				// success in production (#620).
				throw new Error("Select a wallet before initiating recovery.");
			} else {
				// Demo mode stub — no backend to call.
				await new Promise<void>((resolve) => setTimeout(resolve, 1500));
			}
			setCtaState("success");
		} catch (err) {
			const message =
				err instanceof Error ? err.message : "An unexpected error occurred.";
			setCtaError(message);
			setCtaState("error");
		}
	}, [ctaState, walletId]);

	/** Cancels the confirmation step and returns to idle. */
	const cancelRecovery = useCallback(() => {
		if (ctaState !== "confirming") return;
		setCtaState("idle");
		setCtaError(null);
	}, [ctaState]);

	/**
	 * Resets the CTA back to idle and, if the previous failure was a bootstrap
	 * API error, retries the status fetch so the user can recover without a full
	 * page reload (#459).
	 */
	const resetRecovery = useCallback(() => {
		setCtaState("idle");
		setCtaError(null);
		if (walletId !== null && apiLoading === "error") {
			refetch();
		}
	}, [walletId, apiLoading, refetch]);

	return {
		state,
		errorMessage,
		// Only surface the fetched timeline on the real API path; demo mode has
		// no backend-derived timeline to offer.
		timeline: walletId !== null ? (apiTimeline ?? null) : null,
		initiateRecovery,
		confirmRecovery,
		cancelRecovery,
		resetRecovery,
	};
}
