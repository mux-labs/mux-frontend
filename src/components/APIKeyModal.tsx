'use client';

import { useState } from 'react';

interface APIKeyModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function APIKeyModal({ isOpen, onClose }: APIKeyModalProps) {
  const [showWarning, setShowWarning] = useState(true);
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const generateApiKey = () => {
    // Generate a mock API key for UI purposes
    const newKey = `mux_${Math.random().toString(36).substring(2, 15)}${Math.random().toString(36).substring(2, 15)}`;
    setApiKey(newKey);
    setShowWarning(false);
  };

  const copyToClipboard = async () => {
    if (apiKey) {
      await navigator.clipboard.writeText(apiKey);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleClose = () => {
    setShowWarning(true);
    setApiKey(null);
    setCopied(false);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-zinc-900 rounded-lg shadow-lg max-w-md w-full mx-4">
        <div className="border-b border-zinc-200 dark:border-zinc-800 p-6">
          <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
            Create API Key
          </h2>
        </div>

        <div className="p-6 space-y-6">
          {showWarning && !apiKey && (
            <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
              <div className="flex gap-3">
                <div className="text-amber-600 dark:text-amber-500 text-xl leading-none mt-0.5">
                  ⚠️
                </div>
                <div>
                  <h3 className="font-semibold text-amber-900 dark:text-amber-200 mb-1">
                    Save your API key
                  </h3>
                  <p className="text-sm text-amber-800 dark:text-amber-300">
                    This key will only be displayed once. Make sure to copy and
                    store it somewhere safe. You won't be able to see it again.
                  </p>
                </div>
              </div>
            </div>
          )}

          {apiKey ? (
            <div className="space-y-4">
              <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
                <p className="text-sm font-medium text-green-900 dark:text-green-200">
                  ✓ API Key successfully created
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                  Your API Key:
                </label>
                <div className="flex gap-2">
                  <div className="flex-1 bg-zinc-100 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded px-3 py-2 font-mono text-sm text-zinc-900 dark:text-zinc-50 overflow-x-auto">
                    {apiKey}
                  </div>
                  <button
                    onClick={copyToClipboard}
                    className={`px-4 py-2 rounded font-medium transition-colors ${
                      copied
                        ? 'bg-green-500 text-white'
                        : 'bg-zinc-200 dark:bg-zinc-700 text-zinc-900 dark:text-zinc-50 hover:bg-zinc-300 dark:hover:bg-zinc-600'
                    }`}
                  >
                    {copied ? '✓ Copied' : 'Copy'}
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <p className="text-zinc-600 dark:text-zinc-400">
              Click the button below to generate a new API key. Remember to save it
              securely as you won't be able to view it again.
            </p>
          )}
        </div>

        <div className="border-t border-zinc-200 dark:border-zinc-800 p-6 flex gap-3 justify-end">
          <button
            onClick={handleClose}
            className="px-4 py-2 rounded font-medium border border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-zinc-50 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
          >
            Close
          </button>
          {!apiKey && (
            <button
              onClick={generateApiKey}
              className="px-4 py-2 rounded font-medium bg-blue-600 text-white hover:bg-blue-700 transition-colors"
            >
              Generate Key
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
