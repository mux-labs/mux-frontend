'use client';

import React, { useState, useCallback } from 'react';

interface PrivacyModeProps {
  balances: { name: string; amount: number; symbol: string }[];
  isAuthenticated: boolean;
}

export function PrivacyMode({ balances, isAuthenticated }: PrivacyModeProps) {
  const [isHidden, setIsHidden] = useState(false);

  const togglePrivacy = useCallback(() => {
    setIsHidden((prev) => !prev);
  }, []);

  return (
    <div className="privacy-mode-container">
      <button
        onClick={togglePrivacy}
        className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 transition-colors"
        aria-label="Toggle balance privacy"
      >
        {isHidden ? 'Show Balances' : 'Hide Balances'}
      </button>

      <div className="mt-2 space-y-2">
        {balances.map((balance) => (
          <div key={balance.name} className="flex justify-between items-center p-2 rounded bg-gray-800">
            <span className="text-gray-300">{balance.name}</span>
            <span className="text-white font-mono">
              {isHidden ? '****' : `${balance.amount} ${balance.symbol}`}
            </span>
          </div>
        ))}
      </div>

      {isHidden && (
        <p className="mt-2 text-xs text-gray-500">
          Balances are hidden for privacy. Click to reveal.
        </p>
      )}
    </div>
  );
}
