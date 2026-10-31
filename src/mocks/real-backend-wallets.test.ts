import { describe, expect, it, vi } from 'vitest';
import { hasRealWallets, REAL_WALLET_FIXTURES } from './real-backend-wallets';

describe('hasRealWallets', () => {
  const originalWindow = global.window;

  beforeEach(() => {
    // Reset window.stellar, window.ethereum, window.ledger
    delete (global.window as any).stellar;
    delete (global.window as any).ethereum;
    delete (global.window as any).ledger;
  });

  afterAll(() => {
    global.window = originalWindow;
  });

  it('resolves false when all fixtures are disconnected', async () => {
    // No wallet globals set
    const result = await hasRealWallets();
    expect(result).toBe(false);
  });

  it('resolves true when freighter fixture is connected', async () => {
    // Stub window.stellar to make freighter's isConnected resolve true
    (global.window as any).stellar = {
      getAddress: vi.fn(),
      signTransaction: vi.fn(),
    };

    const result = await hasRealWallets();
    expect(result).toBe(true);
  });

  it('resolves true when ledger fixture is connected', async () => {
    (global.window as any).ledger = {
      getAddress: vi.fn(),
      signTransaction: vi.fn(),
    };

    const result = await hasRealWallets();
    expect(result).toBe(true);
  });

  it('resolves true when metamask fixture is connected', async () => {
    (global.window as any).ethereum = {
      request: vi.fn(),
    };

    const result = await hasRealWallets();
    expect(result).toBe(true);
  });

  it('treats a fixture whose isConnected rejects as false and does not throw', async () => {
    // Create a fixture that rejects
    const originalFreighter = REAL_WALLET_FIXTURES.freighter;
    (REAL_WALLET_FIXTURES as any).freighter = {
      ...originalFreighter,
      isConnected: async () => {
        throw new Error('Connection failed');
      },
    };

    try {
      const result = await hasRealWallets();
      expect(result).toBe(false);
    } finally {
      // Restore original
      (REAL_WALLET_FIXTURES as any).freighter = originalFreighter;
    }
  });

  it('resolves false when a fixture rejects and no other fixtures are connected', async () => {
    // All fixtures reject
    const originalFixtures = { ...REAL_WALLET_FIXTURES };
    Object.keys(REAL_WALLET_FIXTURES).forEach((key) => {
      (REAL_WALLET_FIXTURES as any)[key] = {
        ...originalFixtures[key],
        isConnected: async () => {
          throw new Error('Connection failed');
        },
      };
    });

    try {
      const result = await hasRealWallets();
      expect(result).toBe(false);
    } finally {
      // Restore original
      Object.keys(REAL_WALLET_FIXTURES).forEach((key) => {
        (REAL_WALLET_FIXTURES as any)[key] = originalFixtures[key];
      });
    }
  });
});