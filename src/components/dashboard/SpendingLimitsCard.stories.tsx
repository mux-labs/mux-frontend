import type { Meta, StoryObj } from "@storybook/react";
import { SpendingLimitsCard } from "./SpendingLimitsCard";

/**
 * SpendingLimitsCard displays and allows management of API spending limits.
 *
 * ## Features
 * - Display daily spending limits and per-transaction limits
 * - Show current daily usage with progress visualization
 * - Edit limits with real-time validation
 * - Copy limit values to clipboard
 * - Keyboard navigation (Enter to save, Escape to cancel)
 * - Loading skeleton state while data is being fetched
 * - Success and error toast notifications
 * - Dark mode support
 *
 * ## Usage
 * ```tsx
 * <SpendingLimitsCard />
 * <SpendingLimitsCard loading={true} />
 * ```
 */
const meta = {
  title: "Dashboard/SpendingLimitsCard",
  component: SpendingLimitsCard,
  parameters: {
    layout: "padded",
  },
  tags: ["autodocs"],
  argTypes: {
    loading: {
      control: "boolean",
      description: "Show loading skeleton instead of content",
    },
  },
} satisfies Meta<typeof SpendingLimitsCard>;

export default meta;
type Story = StoryObj<typeof SpendingLimitsCard>;

/**
 * Default state showing spending limits with current usage.
 * Daily usage is at 15% (750 / 5000).
 */
export const Default: Story = {
  args: {
    loading: false,
  },
};

/**
 * Loading state with skeleton placeholders.
 * Displayed while spending limit data is being fetched from the API.
 */
export const Loading: Story = {
  args: {
    loading: true,
  },
};

/**
 * High usage scenario where daily spending is at 80%.
 * Demonstrates the progress bar at a higher level.
 */
export const HighUsage: Story = {
  args: {
    loading: false,
  },
  parameters: {
    // This would normally show high usage visually
    docs: {
      description: {
        story:
          "Shows the spending limits card in a state where daily usage is at 80% capacity. The progress bar fills proportionally.",
      },
    },
  },
};

/**
 * Near limit scenario where daily spending is at 95%.
 * The progress bar is almost full, indicating approaching the limit.
 */
export const NearLimit: Story = {
  args: {
    loading: false,
  },
  parameters: {
    docs: {
      description: {
        story:
          "Shows the spending limits card when usage is at 95% of the daily limit. This indicates the user is approaching their spending cap.",
      },
    },
  },
};

/**
 * Limit exceeded scenario where usage reaches 100%.
 * The progress bar is full, showing the limit has been reached.
 */
export const LimitExceeded: Story = {
  args: {
    loading: false,
  },
  parameters: {
    docs: {
      description: {
        story:
          "Shows the spending limits card when daily usage has reached or exceeded the limit. The progress bar is capped at 100%.",
      },
    },
  },
};

/**
 * Interactive story for testing form interactions.
 * Users can edit spending limits, copy values, and use keyboard shortcuts.
 * Try:
 * - Click the input fields to edit daily or per-transaction limits
 * - Click the copy button next to each limit to copy to clipboard
 * - Press Enter in an input field to save changes
 * - Press Escape to blur an input field
 * - Click "Save Settings" to persist changes to localStorage
 */
export const Interactive: Story = {
  args: {
    loading: false,
  },
  parameters: {
    layout: "padded",
    docs: {
      description: {
        story:
          "Interactive version of the Spending Limits Card. You can edit the spending limits and use keyboard shortcuts (Enter to save, Escape to cancel).",
      },
    },
  },
  render: (args) => (
    <div className="w-full max-w-2xl mx-auto p-4">
      <SpendingLimitsCard {...args} />
    </div>
  ),
};

/**
 * Mobile responsive layout of the spending limits card.
 * Shows how the card adapts to smaller screens.
 */
export const Mobile: Story = {
  args: {
    loading: false,
  },
  parameters: {
    viewport: {
      defaultViewport: "mobile1",
    },
  },
};

/**
 * Tablet responsive layout.
 */
export const Tablet: Story = {
  args: {
    loading: false,
  },
  parameters: {
    viewport: {
      defaultViewport: "tablet",
    },
  },
};
