import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { KeyboardShortcutsHelp } from './keyboard-shortcuts-help';

function pressKey(key: string, target: EventTarget = window) {
  fireEvent.keyDown(target, { key });
}

describe('KeyboardShortcutsHelp', () => {
  it('renders nothing until "?" is pressed', () => {
    const { container } = render(<KeyboardShortcutsHelp />);

    expect(container).toBeEmptyDOMElement();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    pressKey('?');

    expect(screen.getByRole('dialog', { name: /keyboard shortcuts/i })).toBeInTheDocument();
  });

  it('toggles closed when "?" is pressed again', () => {
    render(<KeyboardShortcutsHelp />);

    pressKey('?');
    expect(screen.getByRole('dialog')).toBeInTheDocument();

    pressKey('?');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('is dismissible with Escape', () => {
    render(<KeyboardShortcutsHelp />);

    pressKey('?');
    expect(screen.getByRole('dialog')).toBeInTheDocument();

    pressKey('Escape');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('is dismissible with the Close button', () => {
    render(<KeyboardShortcutsHelp />);

    pressKey('?');
    fireEvent.click(screen.getByRole('button', { name: /close/i }));

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('does not open while typing in an input or textarea', () => {
    render(
      <>
        <input aria-label="search" />
        <textarea aria-label="notes" />
        <KeyboardShortcutsHelp />
      </>,
    );

    pressKey('?', screen.getByLabelText('search'));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    pressKey('?', screen.getByLabelText('notes'));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('does not block interaction with the rest of the page', () => {
    const onPageClick = vi.fn();

    render(
      <>
        <button type="button" onClick={onPageClick}>
          Page action
        </button>
        <KeyboardShortcutsHelp />
      </>,
    );

    // Closed overlay must not intercept anything.
    fireEvent.click(screen.getByRole('button', { name: /page action/i }));
    expect(onPageClick).toHaveBeenCalledTimes(1);

    pressKey('?');
    expect(screen.getByRole('dialog')).toBeInTheDocument();

    // The overlay is a non-modal dialog: it must not trap focus or mark the
    // page inert, so the underlying page stays reachable.
    expect(screen.getByRole('dialog')).not.toHaveAttribute('aria-hidden');
    expect(document.body).not.toHaveAttribute('inert');
    expect(screen.getByRole('button', { name: /page action/i })).toBeEnabled();

    // Clicking the backdrop dismisses the overlay and leaves the page usable.
    fireEvent.click(screen.getByRole('dialog'));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /page action/i }));
    expect(onPageClick).toHaveBeenCalledTimes(2);
  });
});
