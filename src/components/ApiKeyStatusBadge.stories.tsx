import type { Meta, StoryObj } from '@storybook/react';
import { ApiKeyRow } from './ApiKeyStatusBadge';

const meta: Meta<typeof ApiKeyRow> = {
  title: 'API Keys/ApiKeyRow',
  component: ApiKeyRow,
  parameters: { backgrounds: { default: 'dark' } },
};

export default meta;
type Story = StoryObj<typeof ApiKeyRow>;

export const Active: Story = { args: { name: 'Production', maskedKey: 'mux_live_••••a1b2', status: 'active' } };
export const Revoked: Story = { args: { name: 'Old CI key', maskedKey: 'mux_live_••••9f8e', status: 'revoked' } };
