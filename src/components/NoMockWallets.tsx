'use client';

import { useWallets } from '@/hooks/useWallets';

interface NoMockWalletsProps {
  enabled?: boolean;
}

export function NoMockWallets({ enabled = process.env.NODE_ENV === 'production' }: NoMockWalletsProps) {
  const { wallets } = useWallets();

  const hasMock = wallets.some((w) => w.type === 'mock');

  if (!enabled || !hasMock) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-red-600/90 p-6 text-white">
      <div className="max-w-lg rounded-lg bg-red-700 p-6 shadow-xl">
        <h2 className="mb-3 text-xl font-bold">⛔ Mock Wallets Blocked in Production</h2>
        <p className="mb-3 text-sm">
          One or more wallets with <code>type: &apos;mock&apos;</code> were detected. Mock wallets are not
          allowed in production builds.
        </p>
        <ul className="list-disc pl-5 text-sm">
          {wallets
            .filter((w) => w.type === 'mock')
            .map((w) => (
              <li key={w.id}>{w.name ?? w.id}</li>
            ))}
        </ul>
      </div>
    </div>
  );
}
