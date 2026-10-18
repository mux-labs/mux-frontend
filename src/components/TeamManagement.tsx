'use client';

import { useState, useCallback } from 'react';

export type TeamRole = 'admin' | 'developer';

export interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: TeamRole;
  addedAt: string;
}

/** Stable error codes for the team management surface. */
export type TeamErrorCode =
  | 'TEAM_FORBIDDEN'
  | 'TEAM_MEMBER_EXISTS'
  | 'TEAM_BACKEND_UNAVAILABLE'
  | 'TEAM_INVALID_MEMBER'
  | 'TEAM_UNKNOWN';

export interface TeamManagementProps {
  /** The authenticated caller's role. Determines which actions are available. */
  callerRole: TeamRole;
  initialMembers: TeamMember[];
  /** Called to add a member. Must return the created member or throw with a stable code. */
  onInvite: (payload: { name: string; email: string; role: TeamRole }) => Promise<TeamMember>;
  /** Called to remove a member by id. Idempotent. */
  onRemove: (id: string) => Promise<void>;
  /** Ops-safe reporter: code + correlationId only, never raw secrets. */
  onError?: (code: TeamErrorCode, correlationId: string, message: string) => void;
}

function newCorrelationId(): string {
  return typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : `tm_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 9)}`;
}

const ROLE_LABELS: Record<TeamRole, string> = {
  admin: 'Admin',
  developer: 'Developer',
};

export function TeamManagement({
  callerRole,
  initialMembers,
  onInvite,
  onRemove,
  onError,
}: TeamManagementProps) {
  const [members, setMembers] = useState<TeamMember[]>(initialMembers);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<TeamRole>('developer');
  const [submitting, setSubmitting] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const isAdmin = callerRole === 'admin';

  const handleInvite = useCallback(async () => {
    if (!isAdmin || submitting) return;
    const correlationId = newCorrelationId();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!name.trim() || !email.trim() || !email.includes('@')) {
      setErrorMsg('Name and a valid email are required.');
      return;
    }

    setSubmitting(true);
    try {
      const member = await onInvite({ name: name.trim(), email: email.trim().toLowerCase(), role });
      setMembers((prev) => [...prev, member]);
      setName('');
      setEmail('');
      setRole('developer');
      setSuccessMsg(`${member.name} added as ${ROLE_LABELS[member.role]}.`);
    } catch (err: unknown) {
      const code: TeamErrorCode =
        err instanceof Error && typeof (err as unknown as Record<string, unknown>).code === 'string'
          ? ((err as unknown as Record<string, unknown>).code as TeamErrorCode)
          : 'TEAM_UNKNOWN';
      const msg = err instanceof Error ? err.message : 'Failed to add member.';
      setErrorMsg(msg);
      onError?.(code, correlationId, msg);
    } finally {
      setSubmitting(false);
    }
  }, [isAdmin, submitting, name, email, role, onInvite, onError]);

  const handleRemove = useCallback(
    async (id: string) => {
      if (!isAdmin || removingId) return;
      const correlationId = newCorrelationId();
      setErrorMsg(null);
      setSuccessMsg(null);
      setRemovingId(id);
      try {
        await onRemove(id);
        setMembers((prev) => prev.filter((m) => m.id !== id));
        setSuccessMsg('Member removed.');
      } catch (err: unknown) {
        const code: TeamErrorCode =
          err instanceof Error && typeof (err as unknown as Record<string, unknown>).code === 'string'
            ? ((err as unknown as Record<string, unknown>).code as TeamErrorCode)
            : 'TEAM_UNKNOWN';
        const msg = err instanceof Error ? err.message : 'Failed to remove member.';
        setErrorMsg(msg);
        onError?.(code, correlationId, msg);
      } finally {
        setRemovingId(null);
      }
    },
    [isAdmin, removingId, onRemove, onError],
  );

  return (
    <section aria-labelledby="team-mgmt-heading" data-testid="team-management">
      <h2 id="team-mgmt-heading" className="text-lg font-semibold mb-4">
        Team members
      </h2>

      {/* Status announcements */}
      {errorMsg && (
        <div
          role="alert"
          aria-live="assertive"
          data-testid="team-error"
          className="mb-3 rounded border border-red-500 bg-red-950 px-3 py-2 text-sm text-red-300"
        >
          {errorMsg}
        </div>
      )}
      {successMsg && (
        <div
          role="status"
          aria-live="polite"
          data-testid="team-success"
          className="mb-3 rounded border border-green-600 bg-green-950 px-3 py-2 text-sm text-green-300"
        >
          {successMsg}
        </div>
      )}

      {/* Member list */}
      <ul aria-label="Team members" className="mb-6 divide-y divide-gray-700">
        {members.map((member) => (
          <li
            key={member.id}
            data-testid="team-member-row"
            className="flex items-center justify-between py-3"
          >
            <div>
              <span className="text-sm font-medium text-white" data-testid="team-member-name">
                {member.name}
              </span>
              <span className="ml-2 text-xs text-gray-400" data-testid="team-member-role">
                {ROLE_LABELS[member.role]}
              </span>
            </div>
            {/* Only admins see the remove button; deny-by-default for developers */}
            {isAdmin && (
              <button
                type="button"
                onClick={() => handleRemove(member.id)}
                disabled={removingId === member.id}
                data-testid="team-remove-btn"
                aria-label={`Remove ${member.name}`}
                className="rounded border border-red-700 px-2 py-1 text-xs text-red-400 hover:bg-red-950 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {removingId === member.id ? 'Removing…' : 'Remove'}
              </button>
            )}
          </li>
        ))}
        {members.length === 0 && (
          <li
            role="status"
            data-testid="team-empty"
            className="py-4 text-sm text-gray-500 text-center"
          >
            No team members yet.
          </li>
        )}
      </ul>

      {/* Invite form — admin only */}
      {isAdmin && (
        <fieldset
          data-testid="team-invite-form"
          className="rounded border border-gray-700 p-4"
          aria-label="Invite a new team member"
        >
          <legend className="text-sm font-medium text-gray-300 px-1">Invite member</legend>

          <div className="mt-3 grid gap-3 sm:grid-cols-3">
            <div>
              <label htmlFor="team-invite-name" className="block text-xs text-gray-400 mb-1">
                Name
              </label>
              <input
                id="team-invite-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Full name"
                maxLength={128}
                data-testid="team-invite-name"
                aria-required="true"
                className="w-full rounded border border-gray-600 bg-gray-800 px-2 py-1.5 text-sm text-white focus:border-blue-500 focus:outline-none"
              />
            </div>

            <div>
              <label htmlFor="team-invite-email" className="block text-xs text-gray-400 mb-1">
                Email
              </label>
              <input
                id="team-invite-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                maxLength={254}
                data-testid="team-invite-email"
                aria-required="true"
                className="w-full rounded border border-gray-600 bg-gray-800 px-2 py-1.5 text-sm text-white focus:border-blue-500 focus:outline-none"
              />
            </div>

            <div>
              <label htmlFor="team-invite-role" className="block text-xs text-gray-400 mb-1">
                Role
              </label>
              <select
                id="team-invite-role"
                value={role}
                onChange={(e) => setRole(e.target.value as TeamRole)}
                data-testid="team-invite-role"
                className="w-full rounded border border-gray-600 bg-gray-800 px-2 py-1.5 text-sm text-white focus:border-blue-500 focus:outline-none"
              >
                <option value="developer">Developer</option>
                <option value="admin">Admin</option>
              </select>
            </div>
          </div>

          <button
            type="button"
            onClick={handleInvite}
            disabled={submitting}
            data-testid="team-invite-submit"
            className="mt-3 rounded bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {submitting ? 'Adding…' : 'Add member'}
          </button>
        </fieldset>
      )}
    </section>
  );
}
