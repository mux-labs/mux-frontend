'use client';

import { useEffect, useState } from 'react';

interface OfflineBannerProps {
  onRetry?: () => void;
  className?: string;
  error?: string | null;
}

export function OfflineBanner({ onRetry, className, error: errorProp }: OfflineBannerProps) {
  const [isOffline, setIsOffline] = useState(
    typeof navigator !== 'undefined' ? !navigator.onLine : false
  );
  const [localError, setLocalError] = useState<string | null>(null);

  const error = errorProp ?? localError;

  useEffect((
import { useEffect, useState } from 'react';

interface OfflineBannerProps {
  onRetry?: () => void;
  className?: string;
  /** Force the offline state (useful for stories/tests). */
  forceOffline?: boolean;
  /** Force an error message to display (useful for stories/tests). */
  forceError?: string | null;
  error?: string | null;
}

export function OfflineBanner({
  onRetry,
  className = '',
  forceOffline,
  forceError,
  error: errorProp,
}: OfflineBannerProps) {
  const [isOffline, setIsOffline] = useState(
    forceOffline ?? (typeof navigator !== 'undefined' ? !navigator.onLine : false)
  );
  const [localError, setLocalError] = useState<string | null>(null);

  const error = forceError ?? errorProp ?? localError;

  useEffect(() => {
    const handleOffline = () => setIsOffline(true);
    const handleOnline = () => {
      setIsOffline(false);
      setLocalError(null);
    };

    window.addEventListener('offline', handleOffline);
    window.addEventListener('online', handleOnline);

    return () => {
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('online', handleOnline);
    };
  }, []);

  const handleRetry = () => {
    if (onRetry) {
      onRetry();
    } else {
      window.location.reload();
    }
  };

  if (!isOffline && !error) return null;

  if (error) {
    return (
      <div
        className={`flex items-center justify-between gap-3 bg-red-600 px-4 py-2 text-sm text-white ${className ?? ''}`}
        role="alert"
      >
        <span>{error}</span>
        <button
          type="button"
          onClick={handleRetry}
          className="rounded bg-white/20 px-3 py-1 font-medium hover:bg-white/30"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div
      role="status"
      className={`fixed inset-x-0 bottom-0 z-50 flex items-center justify-between gap-3 bg-amber-500 px-4 py-2 text-sm font-medium text-white ${className ?? ''}`}
    >
      <span>You are offline. Some features may be unavailable.</span>
      <button
        type="button"
        onClick={handleRetry}
        className="rounded bg-white/20 px-3 py-1 font-medium hover:bg-white/30"
      >
        Retry
      </button>
    </div>
  );
}
