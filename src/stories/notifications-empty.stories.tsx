import type { Meta, StoryObj } from '@storybook/react';
import { expect, fn, userEvent, within } from '@storybook/test';
import { NotificationsEmpty } from '../components/NotificationsEmpty';

const meta: Meta<typeof NotificationsEmpty> = {
  title: 'Notifications/Empty',
  component: NotificationsEmpty,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
  },
  argTypes: {
    onRetry: { action: 'retried' },
  },
};

export default meta;
type Story = StoryObj<typeof NotificationsEmpty>;

export const Empty: Story = {
  args: {
    onRetry: fn(),
  },
};

export const LoadError: Story = {
  args: {
    error: true,
    correlationId: 'corr-1234-abcd',
    onRetry: fn(),
  },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);

    const alert = canvas.getByRole('alert');
    await expect(alert).toBeInTheDocument();
    await expect(alert).toHaveTextContent('corr-1234-abcd');

    const retryButton = canvas.getByRole('button', { name: /try again/i });
    await userEvent.click(retryButton);
    await expect(args.onRetry).toHaveBeenCalledTimes(1);
  },
};
