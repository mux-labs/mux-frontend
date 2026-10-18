'use client';

import { useEffect, useState } from 'react';

interface OfflineBannerProps {
  onRetry?: () => void;
  className?: string;
  /** Force the offline state (useful for stories/tests). */
  forceOffline?: boolean;
  /** Force an error message to display (useful for stories/tests). */
  forceError?: string | null;
}

export function OfflineBanner({
  onRetry,
  className = '',
  forceOffline,
  forceError,
}: OfflineBannerProps) {
  const [isOffline, setIsOffline] = useState(
    forceOffline ?? (typeof navigator !== 'undefined' ? !navigator.onLine : false)
  );
  const [error, setError] = useState<string | null>(forceError ?? null);

  useEffect(() => {
    if (typeof navigator !== 'undefined') {
      setIsOffline(!navigator.onLine);
    }

    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (!isOffline) {
    return null;
  }

  return (
    <div
      role="status"
      className="fixed inset-x-0 bottom-0 z-50 bg-amber-500 px-4 py-2 text-center text-sm font-medium text-white"
    >
      You are offline. Some features may be unavailable.
    </div>
  );
}
