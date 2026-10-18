import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TeamManagement } from '@/components/TeamManagement';
import type { TeamMember } from '@/components/TeamManagement';

const MEMBERS: TeamMember[] = [
  { id: 'm1', name: 'Alice Admin', email: 'alice@muxprotocol.com', role: 'admin', addedAt: new Date().toISOString() },
  { id: 'm2', name: 'Bob Dev', email: 'bob@muxprotocol.com', role: 'developer', addedAt: new Date().toISOString() },
];

describe('TeamManagement', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('admin sees the invite form', () => {
    render(
      <TeamManagement
        callerRole="admin"
        initialMembers={MEMBERS}
        onInvite={async () => ({ id: 'new', name: 'X', email: 'x@x.com', role: 'developer', addedAt: '' })}
        onRemove={async () => {}}
      />,
    );
    expect(screen.getByTestId('team-invite-form')).toBeInTheDocument();
    expect(screen.queryByTestId('team-readonly-notice')).toBeNull();
  });

  it('developer does not see the invite form or remove buttons', () => {
    render(
      <TeamManagement
        callerRole="developer"
        initialMembers={MEMBERS}
        onInvite={async () => ({ id: 'new', name: 'X', email: 'x@x.com', role: 'developer', addedAt: '' })}
        onRemove={async () => {}}
      />,
    );
    expect(screen.queryByTestId('team-invite-form')).toBeNull();
    expect(screen.queryAllByTestId('team-remove-btn')).toHaveLength(0);
    expect(screen.getByTestId('team-readonly-notice')).toBeInTheDocument();
  });

  it('admin can add a member and it appears in the list', async () => {
    const newMember: TeamMember = { id: 'new-1', name: 'Carol New', email: 'carol@x.com', role: 'developer', addedAt: '' };
    const onInvite = vi.fn().mockResolvedValue(newMember);

    render(
      <TeamManagement
        callerRole="admin"
        initialMembers={MEMBERS}
        onInvite={onInvite}
        onRemove={async () => {}}
      />,
    );

    await userEvent.type(screen.getByTestId('team-invite-name'), 'Carol New');
    await userEvent.type(screen.getByTestId('team-invite-email'), 'carol@x.com');
    await userEvent.click(screen.getByTestId('team-invite-submit'));

    await waitFor(() => expect(onInvite).toHaveBeenCalledOnce());
    expect(screen.getByText('Carol New')).toBeInTheDocument();
    expect(screen.getByTestId('team-success')).toBeInTheDocument();
  });

  it('admin can remove a member', async () => {
    const onRemove = vi.fn().mockResolvedValue(undefined);

    render(
      <TeamManagement
        callerRole="admin"
        initialMembers={MEMBERS}
        onInvite={async () => ({ id: 'x', name: 'X', email: 'x@x.com', role: 'developer', addedAt: '' })}
        onRemove={onRemove}
      />,
    );

    const removeBtns = screen.getAllByTestId('team-remove-btn');
    await userEvent.click(removeBtns[0]);

    await waitFor(() => expect(onRemove).toHaveBeenCalledWith('m1'));
    expect(screen.queryByText('Alice Admin')).toBeNull();
  });

  it('surfaces an error and does not add a member on invite failure', async () => {
    const err = Object.assign(new Error('Team backend not configured.'), { code: 'TEAM_BACKEND_UNAVAILABLE' });
    const onInvite = vi.fn().mockRejectedValue(err);
    const onError = vi.fn();

    render(
      <TeamManagement
        callerRole="admin"
        initialMembers={MEMBERS}
        onInvite={onInvite}
        onRemove={async () => {}}
        onError={onError}
      />,
    );

    await userEvent.type(screen.getByTestId('team-invite-name'), 'Fail User');
    await userEvent.type(screen.getByTestId('team-invite-email'), 'fail@x.com');
    await userEvent.click(screen.getByTestId('team-invite-submit'));

    await waitFor(() => expect(screen.getByTestId('team-error')).toBeInTheDocument());
    expect(onError).toHaveBeenCalledWith('TEAM_BACKEND_UNAVAILABLE', expect.any(String), expect.any(String));
    expect(screen.queryByText('Fail User')).toBeNull();
  });

  it('shows validation error for missing name or invalid email', async () => {
    render(
      <TeamManagement
        callerRole="admin"
        initialMembers={[]}
        onInvite={async () => ({ id: 'x', name: 'X', email: 'x@x.com', role: 'developer', addedAt: '' })}
        onRemove={async () => {}}
      />,
    );

    await userEvent.click(screen.getByTestId('team-invite-submit'));
    expect(screen.getByTestId('team-error')).toBeInTheDocument();
  });

  it('shows empty state when there are no members', () => {
    render(
      <TeamManagement
        callerRole="admin"
        initialMembers={[]}
        onInvite={async () => ({ id: 'x', name: 'X', email: 'x@x.com', role: 'developer', addedAt: '' })}
        onRemove={async () => {}}
      />,
    );
    expect(screen.getByTestId('team-empty')).toBeInTheDocument();
  });

  it('does not render raw secrets in the team UI', () => {
    render(
      <TeamManagement
        callerRole="admin"
        initialMembers={MEMBERS}
        onInvite={async () => ({ id: 'x', name: 'X', email: 'x@x.com', role: 'developer', addedAt: '' })}
        onRemove={async () => {}}
      />,
    );
    const text = screen.getByTestId('team-management').textContent ?? '';
    expect(text).not.toMatch(/eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/);
    expect(text).not.toMatch(/S[A-Z2-7]{55}/);
  });

  it('does not enable the remove control for a non-admin role', () => {
    render(
      <TeamManagement
        callerRole="developer"
        initialMembers={MEMBERS}
        onInvite={async () => ({ id: 'x', name: 'X', email: 'x@x.com', role: 'developer', addedAt: '' })}
        onRemove={async () => {}}
      />,
    );

    const removeBtns = screen.queryAllByTestId('team-remove-btn');
    expect(removeBtns).toHaveLength(0);
    for (const btn of removeBtns) {
      expect(btn).toBeDisabled();
    }
  });

  it('renders a visible error when DELETE /api/team/[id] returns 403 forbidden', async () => {
    const forbiddenBody = {
      error: { code: 'forbidden', message: 'Only admins may remove team members.' },
    };
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 403,
      json: async () => forbiddenBody,
    });
    vi.stubGlobal('fetch', fetchMock);

    const onRemove = vi.fn(async (id: string) => {
      const res = await fetch(`/api/team/${id}`, { method: 'DELETE' });
      if (!res.ok) {
        const body = await res.json();
        throw Object.assign(new Error(body.error.message), { code: body.error.code });
      }
    });

    render(
      <TeamManagement
        callerRole="admin"
        initialMembers={MEMBERS}
        onInvite={async () => ({ id: 'x', name: 'X', email: 'x@x.com', role: 'developer', addedAt: '' })}
        onRemove={onRemove}
      />,
    );

    const removeBtns = screen.getAllByTestId('team-remove-btn');
    await userEvent.click(removeBtns[0]);

    await waitFor(() => expect(screen.getByTestId('team-error')).toBeInTheDocument());
    expect(screen.getByTestId('team-error')).toHaveTextContent('Only admins may remove team members.');
    expect(fetchMock).toHaveBeenCalledWith('/api/team/m1', { method: 'DELETE' });
    expect(screen.getByText('Alice Admin')).toBeInTheDocument();
  });
});
