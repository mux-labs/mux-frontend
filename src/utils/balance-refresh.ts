import { useCallback, useEffect, useReducer, useRef } from "react";

// Stale-while-revalidate balance state: a refresh keeps the last known balance
// on screen (no flicker to a skeleton/zero) and out-of-order responses are
// dropped so an older request can never overwrite a newer balance.

export type BalanceState = {
	balance: string | null;
	refreshing: boolean;
	error: string | null;
	requestId: number;
};

export type BalanceAction =
	| { type: "start"; requestId: number }
	| { type: "success"; requestId: number; balance: string }
	| { type: "failure"; requestId: number; error: string };

export const initialBalanceState: BalanceState = {
	balance: null,
	refreshing: false,
	error: null,
	requestId: 0,
};

export function balanceReducer(state: BalanceState, action: BalanceAction): BalanceState {
	switch (action.type) {
		case "start":
			return { ...state, refreshing: true, requestId: action.requestId };
		case "success":
			if (action.requestId !== state.requestId) return state;
			return { ...state, balance: action.balance, refreshing: false, error: null };
		case "failure":
			// Keep the last known balance; surface the error without blanking it.
			if (action.requestId !== state.requestId) return state;
			return { ...state, refreshing: false, error: action.error };
	}
}

export function useBalanceRefresh(fetchBalance: () => Promise<string>) {
	const [state, dispatch] = useReducer(balanceReducer, initialBalanceState);
	const counter = useRef(0);

	const refresh = useCallback(async () => {
		const requestId = ++counter.current;
		dispatch({ type: "start", requestId });
		try {
			const balance = await fetchBalance();
			dispatch({ type: "success", requestId, balance });
		} catch {
			dispatch({ type: "failure", requestId, error: "BALANCE_REFRESH_FAILED" });
		}
	}, [fetchBalance]);

	useEffect(() => {
		void refresh();
	}, [refresh]);

	return { ...state, refresh };
}
