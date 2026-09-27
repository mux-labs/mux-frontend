'use client';

import React, { useState, useCallback } from 'react';
import { z } from 'zod';

const DangerActionSchema = z.object({
  action: z.string(),
  target: z.string(),
  amount: z.number().positive(),
  confirmPhrase: z.string().min(6),
  riskLevel: z.enum(['low', 'medium', 'high', 'critical']),
});

export function DangerousActionModal({
  isOpen,
  onConfirm,
  onCancel,
  action,
}: {
  isOpen: boolean;
  onConfirm: (data: z.infer<typeof DangerActionSchema>) => void;
  onCancel: () => void;
  action: { name: string; type: string; target: string };
}) {
  const [confirmPhrase, setConfirmPhrase] = useState('');
  const [riskLevel, setRiskLevel] = useState<'low' | 'medium' | 'high' | 'critical'>('low');
  const [isProcessing, setIsProcessing] = useState(false);

  const handleConfirm = useCallback(() => {
    const result = DangerActionSchema.safeParse({
      action: action.name,
      target: action.target,
      amount: 0,
      confirmPhrase,
      riskLevel,
    });

    if (!result.success) return;

    setIsProcessing(true);
    onConfirm(result.data);
    setIsProcessing(false);
  }, [confirmPhrase, riskLevel, action]);

  if (!isOpen) return null;

  const getBorderColor = () => {
    switch (riskLevel) {
      case 'critical': return 'border-red-500 bg-red-900/20';
      case 'high': return 'border-orange-500 bg-orange-900/20';
      case 'medium': return 'border-yellow-500 bg-yellow-900/20';
      default: return 'border-gray-500 bg-gray-900/20';
    }
  };

  const getIcon = () => {
    switch (riskLevel) {
      case 'critical': return '⚠️';
      case 'high': return '🔴';
      case 'medium': return '🟡';
      default: return 'ℹ️';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className={`border rounded-lg p-6 max-w-md w-full mx-4 ${getBorderColor()}`}>
        <div className="flex items-center gap-3 mb-4">
          <span className="text-2xl">{getIcon()}</span>
          <h3 className="text-lg font-bold text-white">
            Dangerous Action Confirmation
          </h3>
        </div>

        <div className="mb-4 p-3 bg-black/30 rounded-md">
          <p className="text-sm text-gray-300">
            Action: <span className="text-white font-medium">{action.name}</span>
          </p>
          <p className="text-sm text-gray-300">
            Target: <span className="text-white font-medium">{action.target}</span>
          </p>
          <p className="text-sm text-gray-300">
            Risk Level: <span className="text-yellow-400 font-medium">{riskLevel.toUpperCase()}</span>
          </p>
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Type <span className="text-red-400">CONFIRM</span> to proceed:
          </label>
          <input
            type="text"
            value={confirmPhrase}
            onChange={(e) => setConfirmPhrase(e.target.value)}
            placeholder="Type CONFIRM"
            className="w-full rounded-md border border-gray-600 bg-gray-800 px-3 py-2 text-white focus:border-red-500 focus:outline-none"
          />
        </div>

        <div className="flex gap-3">
          <button
            onClick={handleConfirm}
            disabled={confirmPhrase !== 'CONFIRM' || isProcessing}
            className="flex-1 py-2 px-4 bg-red-600 hover:bg-red-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-md transition-colors"
          >
            {isProcessing ? 'Processing...' : 'Confirm Dangerous Action'}
          </button>
          <button
            onClick={onCancel}
            disabled={isProcessing}
            className="flex-1 py-2 px-4 bg-gray-600 hover:bg-gray-700 disabled:opacity-50 text-white rounded-md transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
