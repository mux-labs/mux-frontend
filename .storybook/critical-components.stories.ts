import { Meta, StoryObj } from '@storybook/react';
import { ComponentStory } from '@storybook/react';
import { criticalComponentFixtures } from '../src/mocks/wallet-fixtures';

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
    ...criticalComponentFixtures[0],
    lastModified: '2026-09-26',
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
    ...criticalComponentFixtures[1],
    lastModified: '2026-09-26',
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
    ...criticalComponentFixtures[2],
    lastModified: '2026-09-26',
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
    ...criticalComponentFixtures[3],
    lastModified: '2026-09-26',
  },
  render: (args) => (
    <div className="p-4 border border-yellow-500 rounded-lg">
      <span className="text-yellow-500">🟡 {args.name}</span>
      <span className="text-gray-400 ml-2">{args.type}</span>
    </div>
  ),
};

export default CriticalComponentStories;
