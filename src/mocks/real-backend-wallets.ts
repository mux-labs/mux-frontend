import { WalletFixture } from '@/types/wallet';

export const REAL_WALLET_FIXTURES: Record<string, WalletFixture> = {
  freighter: {
    id: 'freighter-mainnet',
    name: 'Freighter',
    type: 'stellar',
    network: 'mainnet',
    getAddress: async () => {
      if (typeof window !== 'undefined' && window.stellar) {
        return window.stellar.getAddress();
      }
      throw new Error('Freighter not installed');
    },
    signTransaction: async (tx) => {
      if (typeof window !== 'undefined' && window.stellar) {
        return window.stellar.signTransaction(tx);
      }
      throw new Error('Freighter not installed');
    },
    isConnected: async () => {
      return typeof window !== 'undefined' && !!window.stellar;
    },
  },
  ledger: {
    id: 'ledger-mainnet',
    name: 'Ledger',
    type: 'hardware',
    network: 'mainnet',
    getAddress: async () => {
      if (typeof window !== 'undefined' && (window as any).ledger) {
        return (window as any).ledger.getAddress();
      }
      throw new Error('Ledger not connected');
    },
    signTransaction: async (tx) => {
      if (typeof window !== 'undefined' && (window as any).ledger) {
        return (window as any).ledger.signTransaction(tx);
      }
      throw new Error('Ledger not connected');
    },
    isConnected: async () => {
      return typeof window !== 'undefined' && !!(window as any).ledger;
    },
  },
  metamask: {
    id: 'metamask-mainnet',
    name: 'MetaMask',
    type: 'evm',
    network: 'mainnet',
    getAddress: async () => {
      if (typeof window !== 'undefined' && (window as any).ethereum) {
        const accounts = await (window as any).ethereum.request({ method: 'eth_requestAccounts' });
        return accounts[0];
      }
      throw new Error('MetaMask not installed');
    },
    signTransaction: async (tx) => {
      if (typeof window !== 'undefined' && (window as any).ethereum) {
        return (window as any).ethereum.request({ method: 'eth_signTransaction', params: [tx] });
      }
      throw new Error('MetaMask not installed');
    },
    isConnected: async () => {
      return typeof window !== 'undefined' && !!(window as any).ethereum;
    },
  },
};

export function getRealWalletFixture(type: string): WalletFixture | undefined {
  return REAL_WALLET_FIXTURES[type];
}

export function hasRealWallets(): boolean {
  return Object.keys(REAL_WALLET_FIXTURES).some((type) => {
    try {
      return REAL_WALLET_FIXTURES[type].isConnected();
    } catch {
      return false;
    }
  });
}
