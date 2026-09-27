import { Meta, StoryObj } from '@storybook/react';
import { ComponentStory } from '@storybook/react';

interface CriticalComponent {
  id: string;
  name: string;
  status: 'critical' | 'warning' | 'ok';
  lastModified: string;
  type: 'wallet' | 'transaction' | 'auth' | 'payment';
}

const CriticalComponentStories: Meta<CriticalComponent> = {
  title: 'Critical/CriticalComponents',
  component: () => null,
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          'CI-critical component stories for automated testing pipeline',
      },
    },
  },
};

export const WalletComponent: ComponentStory<CriticalComponent> = {
  args: {
    id: 'wallet-001',
    name: 'ConnectWallet',
    status: 'critical',
    lastModified: '2026-09-26',
    type: 'wallet',
  },
  render: (args) => (
    <div className="p-4 border border-red-500 rounded-lg">
      <span className="text-red-500">🔴 {args.name}</span>
      <span className="text-gray-400 ml-2">{args.type}</span>
    </div>
  ),
};

export const TransactionComponent: ComponentStory<CriticalComponent> = {
  args: {
    id: 'tx-001',
    name: 'ProcessTransaction',
    status: 'critical',
    lastModified: '2026-09-26',
    type: 'transaction',
  },
  render: (args) => (
    <div className="p-4 border border-red-500 rounded-lg">
      <span className="text-red-500">🔴 {args.name}</span>
      <span className="text-gray-400 ml-2">{args.type}</span>
    </div>
  ),
};

export const AuthComponent: ComponentStory<CriticalComponent> = {
  args: {
    id: 'auth-001',
    name: 'JWTVerification',
    status: 'critical',
    lastModified: '2026-09-26',
    type: 'auth',
  },
  render: (args) => (
    <div className="p-4 border border-red-500 rounded-lg">
      <span className="text-red-500">🔴 {args.name}</span>
      <span className="text-gray-400 ml-2">{args.type}</span>
    </div>
  ),
};

export const PaymentComponent: ComponentStory<CriticalComponent> = {
  args: {
    id: 'pay-001',
    name: 'ProcessPayment',
    status: 'warning',
    lastModified: '2026-09-26',
    type: 'payment',
  },
  render: (args) => (
    <div className="p-4 border border-yellow-500 rounded-lg">
      <span className="text-yellow-500">🟡 {args.name}</span>
      <span className="text-gray-400 ml-2">{args.type}</span>
    </div>
  ),
};

export default CriticalComponentStories;
