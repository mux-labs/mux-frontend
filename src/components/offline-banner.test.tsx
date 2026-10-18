import { render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { OfflineBanner } from './OfflineBanner';

describe('OfflineBanner', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders a stable initial state without touching navigator', () => {
    const originalNavigator = globalThis.navigator;
    // Simulate SSR where navigator is undefined during render.
    // @ts-expect-error - intentionally removing navigator for this test
    delete globalThis.navigator;

    try {
      expect(() => render(<OfflineBanner />)).not.toThrow();
      expect(screen.queryByRole('status')).not.toBeInTheDocument();
    } finally {
      Object.defineProperty(globalThis, 'navigator', {
        value: originalNavigator,
        configurable: true,
        writable: true,
      });
    }
  });

  it('shows the offline bar after mount when navigator.onLine is false', async () => {
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false);

    render(<OfflineBanner />);

    expect(await screen.findByText(/you are offline/i)).toBeInTheDocument();
  });

  it('does not show the offline bar when navigator.onLine is true', async () => {
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(true);

    render(<OfflineBanner />);

    await Promise.resolve();
    expect(screen.queryByText(/you are offline/i)).not.toBeInTheDocument();
  });
});
