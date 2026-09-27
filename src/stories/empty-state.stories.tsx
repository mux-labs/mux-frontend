'use client';

import React from 'react';
import { Box, Typography, Button, Skeleton } from '@mui/material';
import { styled } from '@mui/system';

interface EmptyStateProps {
  title: string;
  description: string;
  icon?: React.ReactNode;
  actionLabel?: string;
  onAction?: () => void;
  variant?: 'default' | 'compact' | 'detailed';
}

const EmptyContainer = styled(Box)(({ variant }) => ({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  padding: variant === 'compact' ? '24px' : variant === 'detailed' ? '48px' : '32px',
  minHeight: variant === 'compact' ? '120px' : '200px',
  borderRadius: '8px',
  backgroundColor: 'rgba(0, 0, 0, 0.04)',
  border: '1px dashed rgba(0, 0, 0, 0.12)',
}));

const EmptyIcon = styled(Box)(({ theme }) => ({
  fontSize: '48px',
  marginBottom: '16px',
  opacity: 0.5,
}));

export function EmptyState({
  title,
  description,
  icon,
  actionLabel,
  onAction,
  variant = 'default',
}: EmptyStateProps) {
  return (
    <EmptyContainer variant={variant}>
      {icon && <EmptyIcon>{icon}</EmptyIcon>}
      <Typography variant="h6" gutterBottom sx={{ color: 'text.secondary' }}>
        {title}
      </Typography>
      <Typography variant="body2" sx={{ color: 'text.disabled', textAlign: 'center', maxWidth: '400px' }}>
        {description}
      </Typography>
      {actionLabel && onAction && (
        <Button
          variant="outlined"
          onClick={onAction}
          sx={{ mt: '24px' }}
        >
          {actionLabel}
        </Button>
      )}
    </EmptyContainer>
  );
}

export const WalletEmptyState: React.FC = () => (
  <EmptyState
    title="No Wallets Found"
    description="Connect a wallet to view your accounts and transaction history."
    icon={<span>👛</span>}
    actionLabel="Connect Wallet"
    variant="detailed"
  />
);

export const TransactionEmptyState: React.FC = () => (
  <EmptyState
    title="No Transactions"
    description="Your transaction history will appear here once you make a transaction."
    icon={<span>📋</span>}
    actionLabel="New Transaction"
  />
);

export const NetworkEmptyState: React.FC = () => (
  <EmptyState
    title="No Network Configured"
    description="Configure a network to start interacting with the blockchain."
    icon={<span>🌐</span>}
    actionLabel="Add Network"
    variant="compact"
  />
);

export const AssetsEmptyState: React.FC = () => (
  <EmptyState
    title="No Assets"
    description="You don't have any assets yet. Add tokens to get started."
    icon={<span>💎</span>}
    actionLabel="Add Asset"
  />
);

export function LoadingSkeleton({ variant = 'default' }: { variant?: string }) {
  return (
    <EmptyContainer variant={variant as any}>
      <Skeleton variant="text" width="60%" />
      <Skeleton variant="text" width="40%" sx={{ mt: '16px' }} />
      <Skeleton variant="rectangular" width="100%" height="120px" sx={{ mt: '24px' }} />
    </EmptyContainer>
  );
}
