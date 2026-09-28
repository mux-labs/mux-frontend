/**
 * Single source of truth for wallet fixture data so Storybook stories and
 * component tests render the same shapes as the real API responses,
 * preventing Storybook/test drift ("fixture parity").
 */
export interface WalletFixture {
  address: string;
  name: string;
  chain: string;
  balance: string;
}

export const walletFixtures: WalletFixture[] = [
  {
    address: 'GABC...1234',
    name: 'Main Wallet',
    chain: 'stellar',
    balance: '1,250.00',
  },
  {
    address: 'GDEF...5678',
    name: 'Savings',
    chain: 'stellar',
    balance: '8,000.50',
  },
  {
    address: 'GHIJ...9012',
    name: 'Trading',
    chain: 'stellar',
    balance: '340.25',
  },
];

export const criticalComponentFixtures = [
  { id: 'wallet-001', name: 'ConnectWallet', status: 'critical' as const, type: 'wallet' as const },
  { id: 'tx-001', name: 'ProcessTransaction', status: 'critical' as const, type: 'transaction' as const },
  { id: 'auth-001', name: 'JWTVerification', status: 'critical' as const, type: 'auth' as const },
  { id: 'pay-001', name: 'ProcessPayment', status: 'warning' as const, type: 'payment' as const },
];
