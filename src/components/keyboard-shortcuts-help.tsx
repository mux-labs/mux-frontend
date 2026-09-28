'use client';

import { useEffect, useState } from 'react';

interface Shortcut {
  keys: string;
  description: string;
}

const SHORTCUTS: Shortcut[] = [
  { keys: '?', description: 'Toggle this shortcuts help' },
  { keys: 'Esc', description: 'Close dialogs and overlays' },
  { keys: 'g then d', description: 'Go to dashboard' },
  { keys: 'g then w', description: 'Go to wallets' },
];

/**
 * Optional, dismissible keyboard-shortcuts help overlay. It is opt-in:
 * nothing renders until the user presses "?", and it never blocks
 * interaction with the rest of the page.
 */
export function KeyboardShortcutsHelp() {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      const isTyping =
        target?.tagName === 'INPUT' ||
        target?.tagName === 'TEXTAREA' ||
        target?.isContentEditable;

      if (isTyping) return;

      if (event.key === '?') {
        event.preventDefault();
        setIsOpen((prev) => !prev);
      } else if (event.key === 'Escape') {
        setIsOpen(false);
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Keyboard shortcuts"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onClick={() => setIsOpen(false)}
    >
      <div
        className="w-full max-w-sm rounded-lg bg-white p-6 shadow-lg dark:bg-neutral-900"
        onClick={(event) => event.stopPropagation()}
      >
        <h2 className="mb-4 text-lg font-semibold">Keyboard shortcuts</h2>
        <ul className="space-y-2">
          {SHORTCUTS.map((shortcut) => (
            <li key={shortcut.keys} className="flex items-center justify-between text-sm">
              <span className="text-neutral-500">{shortcut.description}</span>
              <kbd className="rounded border border-neutral-300 bg-neutral-100 px-2 py-0.5 font-mono text-xs dark:border-neutral-700 dark:bg-neutral-800">
                {shortcut.keys}
              </kbd>
            </li>
          ))}
        </ul>
        <button
          type="button"
          onClick={() => setIsOpen(false)}
          className="mt-4 w-full rounded-md bg-neutral-100 py-2 text-sm font-medium dark:bg-neutral-800"
        >
          Close
        </button>
      </div>
    </div>
  );
}
