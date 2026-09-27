'use client';

import React, { useState, useEffect, useCallback } from 'react';

interface OfflineBannerProps {
  onRetry?: () => void;
  className?: string;
}

export function OfflineBanner({ onRetry, className = '' }: OfflineBannerProps) {
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const handleRetry = useCallback(() => {
    if (onRetry) {
      onRetry();
    } else {
      window.location.reload();
    }
  }, [onRetry]);

  if (!isOffline && !error) return null;

  return (
    <div className={`fixed top-0 left-0 right-0 z-50 ${className}`}>
      {error ? (
        <div className="bg-red-600 text-white px-4 py-3 flex justify-between items-center">
          <span>{error}</span>
          <button onClick={handleRetry} className="underline hover:no-underline">Retry</button>
        </div>
      ) : (
        <div className="bg-orange-600 text-white px-4 py-3 flex justify-between items-center">
          <span>📡 You are offline. Changes will sync when reconnected.</span>
          {onRetry && (
            <button onClick={handleRetry} className="underline hover:no-underline">Retry</button>
          )}
        </div>
      )}
    </div>
  );
}
