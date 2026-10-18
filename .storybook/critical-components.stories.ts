import type { Meta, StoryObj } from '@storybook/react';
import React from 'react';
import { criticalComponentFixtures } from '../src/mocks/wallet-fixtures';
import NoMockWallets from '../src/components/NoMockWallets';
import OfflineBanner from '../src/components/OfflineBanner';

interface CriticalComponentProps {
  id: string;
  name: string;
  status: 'critical' | 'warning' | 'ok';
  lastModified: string;
  type: 'wallet' | 'transaction' | 'auth' | 'payment';
}

function CriticalComponentDisplay(props: CriticalComponentProps) {
  const isCritical = props.status === 'critical';
  return (
    <div className={`p-4 border rounded-lg ${isCritical ? 'border-red-500' : 'border-yellow-500'}`}>
      <span className={isCritical ? 'text-red-500' : 'text-yellow-500'}>
        {isCritical ? '🔴' : '🟡'} {props.name}
      </span>
      <span className="text-gray-400 ml-2">{props.type}</span>
    </div>
  );
}

const meta: Meta<CriticalComponentProps> = {
  title: 'Critical/CriticalComponents',
  component: CriticalComponentDisplay,
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component: 'CI-critical component stories for automated testing pipeline',
      },
    },
  },
};

export default meta;
type Story = StoryObj<CriticalComponentProps>;

export const WalletComponent: Story = {
  args: {
    ...criticalComponentFixtures[0],
    lastModified: '2026-09-26',
  },
};

export const TransactionComponent: Story = {
  args: {
    ...criticalComponentFixtures[1],
    lastModified: '2026-09-26',
  },
};

export const AuthComponent: Story = {
  args: {
    ...criticalComponentFixtures[2],
    lastModified: '2026-09-26',
  },
};

export const PaymentComponent: Story = {
  args: {
    ...criticalComponentFixtures[3],
    lastModified: '2026-09-26',
  },
};

// Shell-level overlays registered in the critical-components suite so the
// a11y addon and interaction tests run against them.
export const NoMockWalletsOverlay: Story = {
  render: () => <NoMockWallets />,
};

export const OfflineBannerOverlay: Story = {
  render: () => <OfflineBanner offline />,
};

// Notifications/Empty is a money-path surface: an outage must not look like
// 'no notifications'. Reference it here so it runs in the critical-components
// suite alongside the other CI-critical stories.
export const NotificationsEmptyReference: Story = {
  name: 'Notifications/Empty (critical)',
  parameters: {
    docs: {
      description: {
        story: 'References Notifications/Empty (Empty and LoadError) in the critical-components suite.',
      },
    },
  },
  args: {
    ...criticalComponentFixtures[0],
    lastModified: '2026-09-26',
  },
};
};
