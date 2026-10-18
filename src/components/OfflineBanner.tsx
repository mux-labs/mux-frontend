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
      className={`flex items-center justify-between gap-3 bg-orange-500 px-4 py-2 text-sm text-white ${className ?? ''}`}
      role="status"
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
