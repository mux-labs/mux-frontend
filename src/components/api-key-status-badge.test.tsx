import { render, screen } from '@testing-library/react';
import { ApiKeyRow } from './ApiKeyStatusBadge';

describe('ApiKeyRow', () => {
  it('renders an active key without revoked styling', () => {
    render(<ApiKeyRow name="Deploy key" maskedKey="mux_live_1234" status="active" />);

    const row = screen.getByTestId('api-key-row');
    expect(row).toHaveAttribute('data-status', 'active');
    expect(row).not.toHaveAttribute('aria-disabled');
    expect(screen.getByText('Deploy key')).not.toHaveClass('line-through');
    expect(screen.getByText('mux_live_1234')).not.toHaveClass('line-through');
    expect(screen.getByText('Active')).toBeInTheDocument();
    expect(screen.queryByText('Revoked')).not.toBeInTheDocument();
  });

  it('marks revoked keys as muted and struck-through', () => {
    render(<ApiKeyRow name="Deploy key" maskedKey="mux_live_1234" status="revoked" />);

    const row = screen.getByTestId('api-key-row');
    expect(row).toHaveAttribute('data-status', 'revoked');
    expect(row).toHaveAttribute('aria-disabled', 'true');
    expect(row).toHaveClass('opacity-60');

    const name = screen.getByText('Deploy key');
    expect(name).toHaveClass('line-through');
    expect(name).toHaveClass('text-gray-500');

    const maskedKey = screen.getByText('mux_live_1234');
    expect(maskedKey).toHaveClass('line-through');
    expect(maskedKey).toHaveClass('text-gray-600');
  });

  it('conveys the revoked state with text, not color alone', () => {
    render(<ApiKeyRow name="Deploy key" maskedKey="mux_live_1234" status="revoked" />);

    expect(screen.getByText('Revoked')).toBeInTheDocument();
    expect(screen.getByLabelText('Key status: revoked')).toHaveTextContent('Revoked');
    expect(screen.queryByText('Active')).not.toBeInTheDocument();
  });
});
