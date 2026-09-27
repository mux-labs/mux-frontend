'use client';

import React from 'react';
import { useWallets } from '@/hooks/useWallets';

export function NoMockWallets() {
  const { wallets } = useWallets();

  const hasMock = wallets.some((w) => w.type === 'mock');

  if (!hasMock) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-red-900/80">
      <div className="bg-red-900 border border-red-500 rounded-lg p-6 max-w-md text-center">
        <h2 className="text-xl font-bold text-white mb-4">
          ⛔ Mock Wallets Blocked in Production
        </h2>
        <p className="text-red-200 mb-4">
          Mock wallets are not allowed in production builds. Please use a real wallet provider.
        </p>
        <div className="space-y-2 text-left">
          <p className="text-sm text-red-300">Accepted providers:</p>
          <ul className="text-sm text-red-200 list-disc list-inside">
            <li>Ledger (Hardware)</li>
            <li>Trezor (Hardware)</li>
            <li>Freighter (Stellar)</li>
            <li>MetaMask (EVM chains)</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
