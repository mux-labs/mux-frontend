import { useCallback, useEffect, useRef, useState } from "react";

export interface BalanceRefreshState<T> {
  balance: T | null;
  refreshing: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
}

/**
 * Stale-while-revalidate balance hook.
 *
 * Keeps the last known balance visible while a fresh request is in flight so
 * the UI never flickers to a skeleton or zero. The latest `fetchBalance` is
 * held in a ref so the returned `refresh` stays stable across renders — an
 * inline arrow callback will not cause a fetch per render. The mount effect
 * runs once; subsequent fetches happen only when `refresh` is called.
 */
export function useBalanceRefresh<T>(
  fetchBalance: () => Promise<T>,
): BalanceRefreshState<T> {
  const [balance, setBalance] = useState<T | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchRef = useRef(fetchBalance);
  fetchRef.current = fetchBalance;

  const requestIdRef = useRef(0);

  const refresh = useCallback(async () => {
    const requestId = ++requestIdRef.current;
    setRefreshing(true);
    try {
      const next = await fetchRef.current();
      if (requestId !== requestIdRef.current) return;
      setBalance(next);
      setError(null);
    } catch (err) {
      if (requestId !== requestIdRef.current) return;
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      if (requestId === requestIdRef.current) {
        setRefreshing(false);
      }
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { balance, refreshing, error, refresh };
}
