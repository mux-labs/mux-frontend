import { render, screen, fireEvent, act } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { OfflineBanner } from './OfflineBanner';

describe('OfflineBanner', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders nothing when online and no error', () => {
    const { container } = render(<OfflineBanner />);
    expect(container).toBeEmptyDOMElement();
  });

  it('renders the offline copy after an offline event', () => {
    render(<OfflineBanner />);

    act(() => {
      window.dispatchEvent(new Event('offline'));
    });

    expect(screen.getByText(/you are offline/i)).toBeInTheDocument();
  });

  it('renders the error copy and calls onRetry when the error prop is set', () => {
    const onRetry = vi.fn();
    const reload = vi.fn();
    vi.spyOn(window, 'location', 'get').mockReturnValue({
      ...window.location,
      reload,
    } as Location);

    render(<OfflineBanner error="Failed to fetch" onRetry={onRetry} />);

    expect(screen.getByText('Failed to fetch')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /retry/i }));

    expect(onRetry).toHaveBeenCalledTimes(1);
    expect(reload).not.toHaveBeenCalled();
  });

  it('clears the error after an online event', () => {
    render(<OfflineBanner error="Failed to fetch" />);

    expect(screen.getByText('Failed to fetch')).toBeInTheDocument();

    act(() => {
      window.dispatchEvent(new Event('online'));
    });

    expect(screen.queryByText('Failed to fetch')).not.toBeInTheDocument();
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
