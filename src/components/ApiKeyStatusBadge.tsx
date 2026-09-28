'use client';

import React from 'react';

export type ApiKeyStatus = 'active' | 'revoked';

interface ApiKeyRowProps {
  name: string;
  /** Masked prefix only — never pass raw key material. */
  maskedKey: string;
  status: ApiKeyStatus;
}

/**
 * Renders an API key row. Revoked keys are visually distinct (muted,
 * struck-through, "Revoked" badge) and not relying on color alone so the
 * state is clear to screen readers and color-blind users.
 */
export function ApiKeyRow({ name, maskedKey, status }: ApiKeyRowProps) {
  const revoked = status === 'revoked';

  return (
    <div
      data-testid="api-key-row"
      data-status={status}
      aria-disabled={revoked || undefined}
      className={`flex items-center justify-between p-2 rounded border ${
        revoked ? 'border-red-900 bg-gray-900 opacity-60' : 'border-gray-700 bg-gray-800'
      }`}
    >
      <div className="flex flex-col">
        <span className={revoked ? 'text-gray-500 line-through' : 'text-white'}>{name}</span>
        <span className={`font-mono text-xs ${revoked ? 'text-gray-600 line-through' : 'text-gray-400'}`}>
          {maskedKey}
        </span>
      </div>
      <span
        className={`px-2 py-0.5 text-xs rounded font-semibold ${
          revoked ? 'bg-red-950 text-red-400 border border-red-800' : 'bg-green-950 text-green-400'
        }`}
        aria-label={revoked ? 'Key status: revoked' : 'Key status: active'}
      >
        {revoked ? 'Revoked' : 'Active'}
      </span>
    </div>
  );
}
