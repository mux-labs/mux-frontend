"use client";

import { useCallback, useEffect, useState } from "react";
import { useRecoveryStatus } from "@/hooks/useRecoveryStatus";

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
	initiateRecovery: () => void;
	confirmRecovery: () => Promise<void>;
	cancelRecovery: () => void;
	resetRecovery: () => void;
}

/**
 * Hook for driving the wallet recovery state machine.
 *
 * When a real `walletId` is provided (#455), recovery status is fetched from
 * the backend via `useRecoveryStatus`. The loading and error states produced
 * by that fetch are surfaced through this hook (#459).
 *
 * When `walletId` is `null` (no wallet selected / demo mode) the hook falls
 * back to a short simulated bootstrap so the page still renders a loading
 * skeleton before transitioning to idle.
 *
 * State machine:
 *   loading   – initial API/stub fetch in progress
 *   idle      – status loaded; no recovery in-flight
 *   confirming – user clicked "Initiate"; awaiting explicit confirmation (#457)
 *   pending   – confirmation submitted; waiting for API response
 *   success   – recovery request accepted by backend
 *   error     – bootstrap fetch failed OR CTA submission failed
 */
export function useRecovery(walletId: string | null = null): UseRecoveryReturn {
	// ── Stub bootstrap (walletId === null / demo mode) ────────────────────────
	const [stubLoaded, setStubLoaded] = useState(false);
	const [stubError, setStubError] = useState<string | null>(null);

	useEffect(() => {
		if (walletId !== null) return; // Real API path — skip stub

		let cancelled = false;
		const run = async () => {
			try {
				await new Promise<void>((resolve) => setTimeout(resolve, 1200));
				if (!cancelled) setStubLoaded(true);
			} catch {
				if (!cancelled) {
					setStubError("Failed to load recovery status.");
				}
			}
		};
		run();
		return () => {
			cancelled = true;
		};
	}, [walletId]);

	// ── Real API fetch (#455) ─────────────────────────────────────────────────
	const {
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
		// Stub / demo path
		if (!stubLoaded && stubError === null) {
			state = "loading";
		} else if (stubError !== null && ctaState === "idle") {
			state = "error";
		} else {
			state = ctaState;
		}
	}

	const errorMessage: string | null =
		state === "error"
			? (ctaError ??
				(walletId !== null ? apiError : stubError) ??
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
	 */
	const confirmRecovery = useCallback(async () => {
		if (ctaState !== "confirming") return;
		setCtaState("pending");
		try {
			// TODO: replace stub with real API call once backend endpoint is ready:
			//   await recoveryApi.initiateRecovery(walletId);
			await new Promise<void>((resolve) => setTimeout(resolve, 1500));
			setCtaState("success");
		} catch (err) {
			const message =
				err instanceof Error ? err.message : "An unexpected error occurred.";
			setCtaError(message);
			setCtaState("error");
		}
	}, [ctaState]);

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
		initiateRecovery,
		confirmRecovery,
		cancelRecovery,
		resetRecovery,
	};
}
